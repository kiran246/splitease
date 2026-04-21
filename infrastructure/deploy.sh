#!/usr/bin/env bash
# SplitEase — AWS deployment script
# Usage: ./infrastructure/deploy.sh <command> [options]
#
# Commands:
#   bootstrap   Create the S3 bucket for CFN templates
#   upload      Upload CFN templates to S3
#   deploy      Deploy / update the full stack
#   image       Build, tag, and push the Docker image to ECR
#   migrate     Run Prisma migrations against the production database
#   destroy     Tear down the stack (prompts for confirmation)
#
# Prerequisites:
#   aws CLI v2 configured with appropriate permissions
#   docker installed and running
#   jq installed (brew install jq)

set -euo pipefail

# ── Configuration — edit these ─────────────────────────────────────────────
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ENVIRONMENT="${ENVIRONMENT:-prod}"
STACK_NAME="splitease-${ENVIRONMENT}"
TEMPLATE_BUCKET="${TEMPLATE_BUCKET:-splitease-cfn-${AWS_ACCOUNT_ID}-${AWS_REGION}}"
TEMPLATE_PREFIX="cfn"
# ───────────────────────────────────────────────────────────────────────────

ECR_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/splitease-${ENVIRONMENT}"
CFN_DIR="$(cd "$(dirname "$0")/cfn" && pwd)"

info()    { echo "▶  $*"; }
success() { echo "✔  $*"; }
error()   { echo "✖  $*" >&2; exit 1; }

# ── bootstrap ──────────────────────────────────────────────────────────────
cmd_bootstrap() {
  info "Creating S3 bucket: ${TEMPLATE_BUCKET}"
  if aws s3api head-bucket --bucket "${TEMPLATE_BUCKET}" 2>/dev/null; then
    info "Bucket already exists."
  else
    if [ "${AWS_REGION}" = "us-east-1" ]; then
      aws s3api create-bucket --bucket "${TEMPLATE_BUCKET}" --region "${AWS_REGION}"
    else
      aws s3api create-bucket --bucket "${TEMPLATE_BUCKET}" --region "${AWS_REGION}" \
        --create-bucket-configuration LocationConstraint="${AWS_REGION}"
    fi
    aws s3api put-bucket-versioning --bucket "${TEMPLATE_BUCKET}" \
      --versioning-configuration Status=Enabled
    aws s3api put-public-access-block --bucket "${TEMPLATE_BUCKET}" \
      --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
  fi
  success "Bootstrap complete."
}

# ── upload ─────────────────────────────────────────────────────────────────
cmd_upload() {
  info "Uploading CFN templates to s3://${TEMPLATE_BUCKET}/${TEMPLATE_PREFIX}/"
  aws s3 sync "${CFN_DIR}/" "s3://${TEMPLATE_BUCKET}/${TEMPLATE_PREFIX}/" \
    --exclude "*" --include "*.yaml" --delete
  success "Templates uploaded."
}

# ── image ──────────────────────────────────────────────────────────────────
cmd_image() {
  local version="${1:-$(git rev-parse --short HEAD)}"
  local image_uri="${ECR_REPO}:${version}"

  info "Logging in to ECR..."
  aws ecr get-login-password --region "${AWS_REGION}" | \
    docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

  info "Building image: ${image_uri}"
  docker build \
    --platform linux/amd64 \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    --cache-from "${ECR_REPO}:latest" \
    -t "${image_uri}" \
    -t "${ECR_REPO}:latest" \
    "$(dirname "$0")/.."

  info "Pushing image..."
  docker push "${image_uri}"
  docker push "${ECR_REPO}:latest"

  success "Image pushed: ${image_uri}"
  echo "${image_uri}"
}

# ── deploy ─────────────────────────────────────────────────────────────────
cmd_deploy() {
  local version="${1:-$(git rev-parse --short HEAD)}"
  local image_uri="${ECR_REPO}:${version}"

  # Optional parameters — set env vars to override
  local cert_arn="${CERTIFICATE_ARN:-}"
  local cf_cert_arn="${CF_CERTIFICATE_ARN:-}"
  local domain="${DOMAIN_NAME:-}"
  local db_class="${DB_INSTANCE_CLASS:-db.t3.medium}"
  local task_cpu="${TASK_CPU:-512}"
  local task_memory="${TASK_MEMORY:-1024}"
  local desired_count="${DESIRED_COUNT:-2}"

  cmd_upload

  info "Deploying stack: ${STACK_NAME}"
  aws cloudformation deploy \
    --region "${AWS_REGION}" \
    --stack-name "${STACK_NAME}" \
    --template-file "${CFN_DIR}/main.yaml" \
    --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
    --parameter-overrides \
      Environment="${ENVIRONMENT}" \
      TemplateBucket="${TEMPLATE_BUCKET}" \
      TemplatePrefix="${TEMPLATE_PREFIX}" \
      ImageUri="${image_uri}" \
      CertificateArn="${cert_arn}" \
      CloudFrontCertificateArn="${cf_cert_arn}" \
      DomainName="${domain}" \
      DBInstanceClass="${db_class}" \
      TaskCPU="${task_cpu}" \
      TaskMemory="${task_memory}" \
      DesiredCount="${desired_count}"

  success "Stack deployed."
  aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --query 'Stacks[0].Outputs' \
    --output table
}

# ── migrate ────────────────────────────────────────────────────────────────
cmd_migrate() {
  info "Running Prisma migrations via ECS one-off task..."
  local cluster
  cluster=$(aws cloudformation describe-stack-resource \
    --stack-name "${STACK_NAME}" \
    --logical-resource-id "ECSStack" \
    --query 'StackResourceDetail.PhysicalResourceId' --output text 2>/dev/null || echo "")

  info "Use 'prisma migrate deploy' inside the running container, or run:"
  info "  DATABASE_URL=<prod-url> npx prisma migrate deploy --schema=prisma/schema.prod.prisma"
  info ""
  info "Retrieve the DATABASE_URL from Secrets Manager:"
  local secret_arn
  secret_arn=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --query "Stacks[0].Outputs[?OutputKey=='DBSecretArn'].OutputValue" \
    --output text)
  info "  aws secretsmanager get-secret-value --secret-id ${secret_arn}"
}

# ── destroy ────────────────────────────────────────────────────────────────
cmd_destroy() {
  echo ""
  echo "⚠️  This will DELETE the entire ${STACK_NAME} stack including the database."
  echo "   A final RDS snapshot will be created automatically."
  read -rp "   Type the stack name to confirm: " confirm
  [ "${confirm}" = "${STACK_NAME}" ] || error "Aborted."

  aws cloudformation delete-stack --stack-name "${STACK_NAME}" --region "${AWS_REGION}"
  info "Waiting for stack deletion..."
  aws cloudformation wait stack-delete-complete --stack-name "${STACK_NAME}" --region "${AWS_REGION}"
  success "Stack deleted."
}

# ── dispatch ───────────────────────────────────────────────────────────────
case "${1:-help}" in
  bootstrap) cmd_bootstrap ;;
  upload)    cmd_upload ;;
  image)     cmd_image "${2:-}" ;;
  deploy)    cmd_deploy "${2:-}" ;;
  migrate)   cmd_migrate ;;
  destroy)   cmd_destroy ;;
  *)
    echo "Usage: $0 {bootstrap|upload|image [version]|deploy [version]|migrate|destroy}"
    exit 1
    ;;
esac

# SplitEase — AWS Infrastructure

## Architecture

```
Users → CloudFront (CDN + HTTPS) → ALB (public subnets, 2 AZs)
                                     → ECS Fargate (private subnets, 2+ tasks)
                                          → RDS PostgreSQL Multi-AZ (isolated subnets)
                                          → Secrets Manager  (via VPC endpoint)
                                          → ECR              (via VPC endpoint)
                                          → CloudWatch Logs  (via VPC endpoint)
                                          → SES              (outbound email)
```

| Component | Service | Why |
|---|---|---|
| Compute | ECS Fargate | Serverless containers — no EC2 patching, scales to 0 cost when idle |
| Database | RDS PostgreSQL 16 Multi-AZ | Managed, automatic failover, encrypted, PITR backups |
| Container registry | ECR | Native IAM auth, image scanning on push |
| Load balancing | ALB | Health checks, path routing, HTTP→HTTPS redirect |
| CDN | CloudFront | Edge caching for static assets, global latency reduction |
| Secrets | Secrets Manager | Automatic rotation support, IAM-scoped access |
| Networking | VPC with 3 tiers | ALB public, ECS private, RDS isolated — least-privilege network |
| Endpoints | VPC Interface Endpoints | ECR/Secrets Manager/CloudWatch traffic stays inside AWS backbone |

---

## Local development

No Docker needed — SQLite is used by default:

```bash
npm install
npm run db:migrate       # creates prisma/dev.db
npm run dev              # http://localhost:3000
```

### Optional: PostgreSQL parity with docker-compose

```bash
docker compose up db -d                          # start only postgres
DATABASE_URL=postgresql://splitease:splitease_dev@localhost:5432/splitease npm run dev
```

---

## First-time AWS deployment

### Prerequisites

```bash
brew install awscli jq
aws configure          # set Access Key, Secret, region, output=json
```

Ensure your IAM user/role has: `CloudFormation:*`, `EC2:*`, `ECS:*`, `ECR:*`, `RDS:*`, `SecretsManager:*`, `IAM:*`, `CloudFront:*`, `Logs:*`, `ApplicationAutoScaling:*`

---

### Step 1 — Bootstrap S3 bucket

```bash
cd infrastructure
./deploy.sh bootstrap
```

---

### Step 2 — Create ECR + push first image

```bash
# Deploy just the ECR stack first
aws cloudformation deploy \
  --stack-name splitease-ecr \
  --template-file cfn/ecr.yaml \
  --parameter-overrides Environment=prod

# Build and push the image
./deploy.sh image v1.0.0
```

---

### Step 3 — Deploy the full stack

```bash
# Minimum (HTTP only, no custom domain):
./deploy.sh deploy v1.0.0

# With HTTPS + custom domain:
CERTIFICATE_ARN=arn:aws:acm:us-east-1:123:certificate/xxx \
CF_CERTIFICATE_ARN=arn:aws:acm:us-east-1:123:certificate/yyy \
DOMAIN_NAME=app.splitease.com \
./deploy.sh deploy v1.0.0
```

The deploy script outputs the **AppURL** and **AppSecretArn** when complete.

---

### Step 4 — Update secrets

The `splitease/prod/app` secret is created with placeholder values. Update it:

```bash
aws secretsmanager update-secret \
  --secret-id splitease/prod/app \
  --secret-string '{
    "NEXTAUTH_SECRET": "'$(openssl rand -base64 32)'",
    "STRIPE_SECRET_KEY": "sk_live_...",
    "SMTP_HOST": "email-smtp.us-east-1.amazonaws.com",
    "SMTP_PORT": "587",
    "SMTP_USER": "YOUR_SES_SMTP_USER",
    "SMTP_PASS": "YOUR_SES_SMTP_PASS"
  }'
```

Then force a new ECS deployment to pick up the updated secrets:

```bash
aws ecs update-service \
  --cluster splitease-prod \
  --service splitease-prod \
  --force-new-deployment
```

---

### Step 5 — Run database migrations

The app runs `prisma migrate deploy` automatically on container startup.
For manual control:

```bash
./deploy.sh migrate
```

---

## Deploying updates

```bash
./deploy.sh image v1.1.0          # build + push new image
./deploy.sh deploy v1.1.0         # update ECS task definition → rolling deploy
```

ECS performs a rolling deploy: new tasks start, health checks pass, old tasks drain — zero downtime.

---

## Environment variables reference

| Variable | Source | Description |
|---|---|---|
| `DATABASE_URL` | Built from DB secret + RDS endpoint | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Secrets Manager (`app` secret) | JWT signing key |
| `NEXTAUTH_URL` | Set to ALB DNS in task definition | Auth redirect base URL |
| `STRIPE_SECRET_KEY` | Secrets Manager | Stripe payments |
| `SMTP_HOST/PORT/USER/PASS` | Secrets Manager | Nodemailer (use SES SMTP) |

---

## Cost estimate (us-east-1, prod)

| Service | Config | ~Monthly |
|---|---|---|
| ECS Fargate | 2 × 0.5 vCPU / 1 GB | ~$25 |
| RDS PostgreSQL | db.t3.medium Multi-AZ | ~$100 |
| ALB | 2 LCUs avg | ~$20 |
| CloudFront | 10 GB transfer | ~$1 |
| NAT Gateway | 2 × + 10 GB | ~$70 |
| VPC Endpoints | 4 endpoints | ~$30 |
| Secrets Manager | 2 secrets | ~$1 |
| ECR | 5 GB storage | ~$0.50 |
| **Total** | | **~$250/mo** |

> For dev/staging: use `db.t3.micro`, `DesiredCount=1`, single NAT → ~$80/mo.

---

## Teardown

```bash
./deploy.sh destroy     # prompts for confirmation, creates final RDS snapshot
```

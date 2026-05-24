import { prisma } from '@/lib/db';
import ResetForm from './ResetForm';

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  const isValid = record && !record.usedAt && record.expiresAt > new Date();

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl border border-gray-200 p-8 w-full max-w-sm text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link expired</h1>
          <p className="text-gray-500 text-sm">
            This password reset link is invalid or has already been used. Contact your admin for a
            new one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-xl border border-gray-200 p-8 w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Set new password</h1>
          <p className="text-gray-500 text-sm mt-1">Choose a password for your account.</p>
        </div>
        <ResetForm token={token} />
      </div>
    </div>
  );
}

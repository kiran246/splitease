import { prisma } from '@/lib/db';
import { signIn } from '@/lib/auth';

export default async function ImpersonatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const record = await prisma.impersonationToken.findUnique({
    where: { token },
    include: { user: true },
  });
  const isValid = record && !record.usedAt && record.expiresAt > new Date();

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl border border-gray-200 p-8 w-full max-w-sm text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link expired</h1>
          <p className="text-gray-500 text-sm">
            This impersonation link is invalid or has already been used.
          </p>
        </div>
      </div>
    );
  }

  async function doImpersonate() {
    'use server';
    await signIn('impersonate', { token, redirectTo: '/' });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-xl border border-gray-200 p-8 w-full max-w-sm space-y-6 text-center">
        <div>
          <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl mx-auto mb-4">
            {record.user.name.slice(0, 2).toUpperCase()}
          </div>
          <h1 className="text-xl font-bold text-gray-900">Sign in as {record.user.name}</h1>
          <p className="text-gray-500 text-sm mt-1">{record.user.email}</p>
          <p className="text-orange-600 text-xs mt-3 font-medium">
            Admin impersonation — expires{' '}
            {record.expiresAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <form action={doImpersonate}>
          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            Continue as {record.user.name}
          </button>
        </form>
      </div>
    </div>
  );
}

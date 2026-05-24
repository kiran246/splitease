import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminRequest } from '@/lib/adminAuth';
import { sendPasswordResetEmail } from '@/lib/email';

type Params = { params: Promise<{ uid: string }> };

export async function POST(req: Request, { params }: Params) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { uid } = await params;
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const resetToken = await prisma.passwordResetToken.create({
    data: { userId: uid, expiresAt },
  });

  const { origin: baseUrl } = new URL(process.env.NEXTAUTH_URL ?? req.url);
  const resetUrl = `${baseUrl}/reset-password/${resetToken.token}`;

  await prisma.adminAuditLog.create({
    data: { action: 'reset_password', targetUserId: uid },
  });

  let emailSent = false;
  try {
    await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
    emailSent = true;
  } catch {
    // email failure is non-fatal — resetUrl is still returned
  }

  return NextResponse.json({ resetUrl, emailSent });
}

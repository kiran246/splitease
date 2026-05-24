import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminRequest } from '@/lib/adminAuth';

type Params = { params: Promise<{ uid: string }> };

export async function POST(req: Request, { params }: Params) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { uid } = await params;
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  const impToken = await prisma.impersonationToken.create({
    data: { userId: uid, expiresAt },
  });

  await prisma.adminAuditLog.create({
    data: {
      action: 'impersonate',
      targetUserId: uid,
      metadata: JSON.stringify({ tokenId: impToken.id }),
    },
  });

  const { origin: baseUrl } = new URL(process.env.NEXTAUTH_URL ?? req.url);
  const impersonateUrl = `${baseUrl}/auth/impersonate/${impToken.token}`;

  return NextResponse.json({
    impersonateUrl,
    expiresAt: impToken.expiresAt,
    user: { id: user.id, name: user.name, email: user.email },
  });
}

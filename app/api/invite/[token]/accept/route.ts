import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ token: string }> };

export async function POST(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { token } = await params;

  const invitation = await prisma.sheetInvitation.findUnique({
    where: { token },
  });

  if (!invitation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (invitation.status !== 'pending' || invitation.expiresAt < new Date()) {
    return NextResponse.json({ error: 'expired' }, { status: 410 });
  }

  const { sheetId } = invitation;
  const userId = session.user.id;

  // Idempotent: check if already a collaborator
  const existing = await prisma.sheetCollaborator.findFirst({
    where: { sheetId, userId },
    select: { id: true },
  });

  if (!existing) {
    await prisma.sheetCollaborator.create({
      data: {
        sheetId,
        userId,
        role: 'collaborator',
      },
    });
  }

  // Mark invitation as accepted and sheet as collaborative in a transaction
  await prisma.$transaction([
    prisma.sheetInvitation.update({
      where: { token },
      data: { status: 'accepted' },
    }),
    prisma.expenseSheet.update({
      where: { id: sheetId },
      data: { isCollaborative: true },
    }),
  ]);

  return NextResponse.json({ sheetId });
}

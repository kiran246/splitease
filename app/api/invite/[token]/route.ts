import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;

  const invitation = await prisma.sheetInvitation.findUnique({
    where: { token },
    include: {
      sheet: { select: { title: true } },
    },
  });

  if (!invitation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (invitation.status !== 'pending' || invitation.expiresAt < new Date()) {
    return NextResponse.json({ error: 'expired' }, { status: 410 });
  }

  return NextResponse.json({
    sheetId: invitation.sheetId,
    sheetTitle: invitation.sheet.title,
    token: invitation.token,
    phone: invitation.phone,
  });
}

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isSheetOwner } from '@/lib/sheetAccess';
import { z } from 'zod';
import { randomUUID } from 'crypto';

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  phone: z.string().min(7),
});

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: sheetId } = await params;

  const ownerCheck = await isSheetOwner(sheetId, session.user.id);
  if (!ownerCheck) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { phone } = parsed.data;
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await prisma.sheetInvitation.create({
    data: {
      token,
      sheetId,
      phone,
      status: 'pending',
      expiresAt,
    },
    select: { id: true, token: true, phone: true, expiresAt: true },
  });

  const { origin: appUrl } = new URL(process.env.NEXTAUTH_URL ?? req.url);
  const inviteUrl = `${appUrl}/invite/${token}`;
  const waText = `You've been invited to collaborate on a SplitEase expense sheet! Join here: ${inviteUrl}`;
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(waText)}`;

  return NextResponse.json({ invitation, whatsappUrl }, { status: 201 });
}

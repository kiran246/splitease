import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { sendInvitationEmail } from '@/lib/email';
import { canAccessSheet } from '@/lib/sheetAccess';

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
});

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!(await canAccessSheet(id, session.user.id)))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const sheet = await prisma.expenseSheet.findFirst({
    where: { id },
    include: { owner: true },
  });
  if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let participants = await prisma.participant.findMany({ where: { sheetId: id } });

  // For sheets created before the owner auto-add was introduced, add owner as participant now
  const ownerAlreadyParticipant = participants.some((p) => p.email === sheet.owner.email);
  if (!ownerAlreadyParticipant) {
    const ownerParticipant = await prisma.participant.create({
      data: { name: sheet.owner.name, email: sheet.owner.email, sheetId: id },
    });
    participants = [ownerParticipant, ...participants];
  }

  return NextResponse.json(participants);
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sheet = await prisma.expenseSheet.findFirst({
    where: { id, ownerId: session.user.id },
    include: { owner: true },
  });
  if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const participant = await prisma.participant.create({
    data: { ...parsed.data, sheetId: id, email: parsed.data.email || null },
  });

  const result: Record<string, unknown> = { ...participant };

  if (sheet.isCollaborative) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const email = parsed.data.email || null;
    const phone = parsed.data.phone || null;

    if (email || phone) {
      const invitation = await prisma.sheetInvitation.create({
        data: { sheetId: id, email, phone, expiresAt },
      });

      const { origin: baseUrl } = new URL(process.env.NEXTAUTH_URL ?? req.url);
      const inviteUrl = `${baseUrl}/invite/${invitation.token}`;

      if (email) {
        try {
          await sendInvitationEmail({
            to: email,
            inviteeName: parsed.data.name,
            sheetTitle: sheet.title,
            ownerName: sheet.owner.name,
            inviteUrl,
          });
          result.invitationSent = 'email';
        } catch {
          result.invitationSent = 'email_failed';
        }
      }

      if (phone) {
        const message = encodeURIComponent(
          `Hi ${parsed.data.name}! ${sheet.owner.name} has invited you to collaborate on the SplitEase expense sheet "${sheet.title}". Tap the link to join: ${inviteUrl}`
        );
        result.whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${message}`;
        result.inviteUrl = inviteUrl;
      }
    }
  }

  return NextResponse.json(result, { status: 201 });
}

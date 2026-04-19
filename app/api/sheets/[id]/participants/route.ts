import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

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
  const sheet = await prisma.expenseSheet.findFirst({ where: { id, ownerId: session.user.id } });
  if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const participants = await prisma.participant.findMany({ where: { sheetId: id } });
  return NextResponse.json(participants);
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sheet = await prisma.expenseSheet.findFirst({ where: { id, ownerId: session.user.id } });
  if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const participant = await prisma.participant.create({
    data: { ...parsed.data, sheetId: id, email: parsed.data.email || null },
  });
  return NextResponse.json(participant, { status: 201 });
}

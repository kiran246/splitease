import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

type Params = { params: Promise<{ id: string; pid: string }> };

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
});

export async function PUT(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, pid } = await params;
  const sheet = await prisma.expenseSheet.findFirst({ where: { id, ownerId: session.user.id } });
  if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const participant = await prisma.participant.update({
    where: { id: pid, sheetId: id },
    data: { ...parsed.data, email: parsed.data.email || null },
  });
  return NextResponse.json(participant);
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, pid } = await params;
  const sheet = await prisma.expenseSheet.findFirst({ where: { id, ownerId: session.user.id } });
  if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.participant.delete({ where: { id: pid, sheetId: id } });
  return NextResponse.json({ success: true });
}

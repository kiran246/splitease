import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

type Params = { params: Promise<{ id: string }> };

async function getSheet(sheetId: string, userId: string) {
  return prisma.expenseSheet.findFirst({
    where: { id: sheetId, ownerId: userId },
  });
}

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sheet = await prisma.expenseSheet.findFirst({
    where: { id, ownerId: session.user.id },
    include: {
      participants: true,
      transactions: {
        include: {
          paidBy: true,
          splits: { include: { participant: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(sheet);
}

const updateSchema = z.object({ title: z.string().min(1) });

export async function PUT(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sheet = await getSheet(id, session.user.id);
  if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.expenseSheet.update({
    where: { id },
    data: { title: parsed.data.title },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sheet = await getSheet(id, session.user.id);
  if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.expenseSheet.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { calculateSplits } from '@/lib/split';
import { canAccessSheet } from '@/lib/sheetAccess';

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  paidById: z.string(),
  splitType: z.enum(['equal', 'percentage']),
  participants: z.array(
    z.object({
      id: z.string(),
      percentage: z.number().optional(),
    })
  ).min(1),
});

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sheet = await prisma.expenseSheet.findFirst({ where: { id, ownerId: session.user.id } });
  if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const transactions = await prisma.transaction.findMany({
    where: { sheetId: id },
    include: { paidBy: true, splits: { include: { participant: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(transactions);
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const userId = session.user.id;

  const sheet = await prisma.expenseSheet.findUnique({ where: { id } });
  if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (sheet.isCollaborative) {
    const allowed = await canAccessSheet(id, userId);
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } else {
    if (sheet.ownerId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const splits = calculateSplits(parsed.data);

  const transaction = await prisma.transaction.create({
    data: {
      title: parsed.data.title,
      amount: parsed.data.amount,
      paidById: parsed.data.paidById,
      sheetId: id,
      createdByUserId: userId,
      splits: { create: splits },
    },
    include: { paidBy: true, splits: { include: { participant: true } } },
  });

  return NextResponse.json(transaction, { status: 201 });
}

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { calculateSplits } from '@/lib/split';
import { canEditTransaction } from '@/lib/sheetAccess';

type Params = { params: Promise<{ id: string; tid: string }> };

const schema = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  paidById: z.string(),
  splitType: z.enum(['equal', 'percentage']),
  participants: z.array(z.object({ id: z.string(), percentage: z.number().optional() })).min(1),
});

export async function PUT(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, tid } = await params;
  if (!(await canEditTransaction(id, tid, session.user.id))) {
    return NextResponse.json({ error: 'You can only edit your own transactions' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const splits = calculateSplits(parsed.data);

  await prisma.split.deleteMany({ where: { transactionId: tid } });

  const transaction = await prisma.transaction.update({
    where: { id: tid, sheetId: id },
    data: {
      title: parsed.data.title,
      amount: parsed.data.amount,
      paidById: parsed.data.paidById,
      splits: { create: splits },
    },
    include: { paidBy: true, splits: { include: { participant: true } } },
  });

  return NextResponse.json(transaction);
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, tid } = await params;
  if (!(await canEditTransaction(id, tid, session.user.id))) {
    return NextResponse.json({ error: 'You can only edit your own transactions' }, { status: 403 });
  }

  await prisma.transaction.delete({ where: { id: tid, sheetId: id } });
  return NextResponse.json({ success: true });
}

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { computeBalances, computeSettlements } from '@/lib/settlement';

type Params = { params: Promise<{ id: string }> };

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
      },
    },
  });

  if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const balances = computeBalances(sheet.transactions, sheet.participants);
  const settlements = computeSettlements(balances);
  const totalExpense = sheet.transactions.reduce((sum, t) => sum + t.amount, 0);

  return NextResponse.json({ totalExpense, balances, settlements });
}

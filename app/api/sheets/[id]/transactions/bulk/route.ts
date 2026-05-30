import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { canAccessSheet } from '@/lib/sheetAccess';

type Params = { params: Promise<{ id: string }> };

const rowSchema = z.object({
  date: z.string().optional(),
  title: z.string().min(1, 'Expense name is required'),
  paidById: z.string().min(1, 'Who Paid is required'),
  splits: z
    .array(z.object({ participantId: z.string(), amount: z.number().min(0) }))
    .min(1),
});

const bodySchema = z.object({
  rows: z.array(rowSchema).min(1),
});

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const userId = session.user.id;

  const sheet = await prisma.expenseSheet.findUnique({
    where: { id },
    include: { participants: { select: { id: true } } },
  });
  if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (sheet.isCollaborative) {
    const allowed = await canAccessSheet(id, userId);
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } else {
    if (sheet.ownerId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const validParticipantIds = new Set(sheet.participants.map((p) => p.id));

  const results: { row: number; id?: string; error?: string }[] = [];

  for (let i = 0; i < parsed.data.rows.length; i++) {
    const row = parsed.data.rows[i];
    try {
      // Validate paidById belongs to this sheet
      if (!validParticipantIds.has(row.paidById)) {
        results.push({ row: i, error: 'Invalid "Who Paid" participant' });
        continue;
      }

      // Only include splits with amount > 0
      const activeSplits = row.splits.filter(
        (s) => s.amount > 0 && validParticipantIds.has(s.participantId)
      );

      if (activeSplits.length === 0) {
        results.push({ row: i, error: 'At least one participant must have an amount > 0' });
        continue;
      }

      const total = activeSplits.reduce((sum, s) => sum + s.amount, 0);

      const txn = await prisma.transaction.create({
        data: {
          title: row.title,
          amount: Math.round(total * 100) / 100,
          date: row.date ? new Date(row.date) : null,
          paidById: row.paidById,
          sheetId: id,
          createdByUserId: userId,
          splits: {
            create: activeSplits.map((s) => ({
              participantId: s.participantId,
              amount: Math.round(s.amount * 100) / 100,
            })),
          },
        },
      });
      results.push({ row: i, id: txn.id });
    } catch {
      results.push({ row: i, error: 'Failed to save row' });
    }
  }

  const created = results.filter((r) => r.id).length;
  const errors = results.filter((r) => r.error);

  return NextResponse.json({ created, errors }, { status: errors.length === 0 ? 201 : 207 });
}

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sheets = await prisma.expenseSheet.findMany({
    where: { ownerId: session.user.id },
    include: {
      participants: true,
      _count: { select: { transactions: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json(sheets);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const sheet = await prisma.expenseSheet.create({
    data: { title: parsed.data.title, ownerId: session.user.id },
  });

  return NextResponse.json(sheet, { status: 201 });
}

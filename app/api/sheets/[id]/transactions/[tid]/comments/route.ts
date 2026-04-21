import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { canAccessSheet } from '@/lib/sheetAccess';

type Params = { params: Promise<{ id: string; tid: string }> };

const commentSchema = z.object({
  text: z.string().min(1).max(500),
});

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, tid } = await params;

  const allowed = await canAccessSheet(id, userId);
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const comments = await prisma.transactionComment.findMany({
    where: { transactionId: tid },
    orderBy: { createdAt: 'asc' },
    include: { author: { select: { name: true } } },
  });

  const result = comments.map((c) => ({
    id: c.id,
    text: c.text,
    createdAt: c.createdAt,
    author: { name: c.author.name },
    isOwn: c.authorId === userId,
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, tid } = await params;

  const allowed = await canAccessSheet(id, userId);
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const comment = await prisma.transactionComment.create({
    data: {
      transactionId: tid,
      authorId: userId,
      text: parsed.data.text,
    },
    include: { author: { select: { name: true } } },
  });

  const result = {
    id: comment.id,
    text: comment.text,
    createdAt: comment.createdAt,
    author: { name: comment.author.name },
    isOwn: true,
  };

  return NextResponse.json(result, { status: 201 });
}

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string; tid: string; cid: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { tid, cid } = await params;

  const comment = await prisma.transactionComment.findFirst({
    where: { id: cid, transactionId: tid },
    select: { authorId: true },
  });

  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (comment.authorId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.transactionComment.delete({ where: { id: cid } });

  return NextResponse.json({ success: true });
}

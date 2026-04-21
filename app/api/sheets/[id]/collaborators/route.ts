import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canAccessSheet } from '@/lib/sheetAccess';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const allowed = await canAccessSheet(id, session.user.id);
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const collaborators = await prisma.sheetCollaborator.findMany({
    where: { sheetId: id },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { joinedAt: 'asc' },
  });

  const result = collaborators.map((c) => ({
    id: c.id,
    userId: c.userId,
    role: c.role,
    joinedAt: c.joinedAt,
    user: c.user,
  }));

  return NextResponse.json(result);
}

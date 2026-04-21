import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isSheetOwner } from '@/lib/sheetAccess';

type Params = { params: Promise<{ id: string; uid: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, uid } = await params;

  const ownerOnly = await isSheetOwner(id, session.user.id);
  if (!ownerOnly) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.sheetCollaborator.deleteMany({
    where: { sheetId: id, userId: uid },
  });

  return NextResponse.json({ success: true });
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminRequest } from '@/lib/adminAuth';
import { z } from 'zod';

type Params = { params: Promise<{ uid: string }> };

const schema = z.object({ isActive: z.boolean() });

export async function PATCH(req: Request, { params }: Params) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { uid } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const updated = await prisma.user.update({
    where: { id: uid },
    data: { isActive: parsed.data.isActive },
    select: { id: true, name: true, email: true, isActive: true },
  });

  await prisma.adminAuditLog.create({
    data: {
      action: parsed.data.isActive ? 'enable_user' : 'disable_user',
      targetUserId: uid,
    },
  });

  return NextResponse.json(updated);
}

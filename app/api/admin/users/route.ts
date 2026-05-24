import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminRequest } from '@/lib/adminAuth';

export async function GET(req: Request) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: { select: { sheets: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(users);
}

'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import bcrypt from 'bcryptjs';
import { sendPasswordResetEmail } from '@/lib/email';

async function assertAdmin() {
  const session = await auth();
  if (session?.user?.role !== 'admin') throw new Error('Unauthorized');
}

async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: string;
}): Promise<void> {
  await assertAdmin();

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error('Email already registered');

  const hash = await bcrypt.hash(data.password, 12);
  await prisma.user.create({
    data: { name: data.name, email: data.email, password: hash, role: data.role || 'user' },
  });
  revalidatePath('/admin/users');
}

export async function updateUser(
  id: string,
  data: { name: string; email: string; role: string }
): Promise<void> {
  await assertAdmin();
  await prisma.user.update({ where: { id }, data });
  revalidatePath('/admin/users');
}

export async function toggleUserStatus(id: string, isActive: boolean): Promise<void> {
  await assertAdmin();
  await prisma.user.update({ where: { id }, data: { isActive } });
  await prisma.adminAuditLog.create({
    data: { action: isActive ? 'enable_user' : 'disable_user', targetUserId: id },
  });
  revalidatePath('/admin/users');
}

export async function deleteUser(id: string): Promise<void> {
  await assertAdmin();
  await prisma.user.delete({ where: { id } });
  revalidatePath('/admin/users');
}

export async function generateImpersonationLink(id: string): Promise<string> {
  await assertAdmin();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const token = await prisma.impersonationToken.create({ data: { userId: id, expiresAt } });
  await prisma.adminAuditLog.create({
    data: { action: 'impersonate', targetUserId: id, metadata: JSON.stringify({ tokenId: token.id }) },
  });
  const origin = await getOrigin();
  return `${origin}/auth/impersonate/${token.token}`;
}

export async function deleteSheet(id: string): Promise<void> {
  await assertAdmin();
  const sheet = await prisma.expenseSheet.findUnique({ where: { id }, select: { ownerId: true } });
  if (!sheet) throw new Error('Sheet not found');
  await prisma.expenseSheet.delete({ where: { id } });
  await prisma.adminAuditLog.create({
    data: { action: 'delete_sheet', targetUserId: sheet.ownerId, metadata: JSON.stringify({ sheetId: id }) },
  });
  revalidatePath('/admin/sheets');
}

export async function clearUserSheets(userId: string): Promise<number> {
  await assertAdmin();
  const { count } = await prisma.expenseSheet.deleteMany({ where: { ownerId: userId } });
  await prisma.adminAuditLog.create({
    data: { action: 'clear_user_sheets', targetUserId: userId, metadata: JSON.stringify({ count }) },
  });
  revalidatePath('/admin/sheets');
  return count;
}

export async function resetUserPassword(
  id: string
): Promise<{ resetUrl: string; emailSent: boolean }> {
  await assertAdmin();
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('User not found');

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const resetToken = await prisma.passwordResetToken.create({ data: { userId: id, expiresAt } });
  await prisma.adminAuditLog.create({ data: { action: 'reset_password', targetUserId: id } });

  const origin = await getOrigin();
  const resetUrl = `${origin}/reset-password/${resetToken.token}`;

  let emailSent = false;
  try {
    await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
    emailSent = true;
  } catch {}

  return { resetUrl, emailSent };
}

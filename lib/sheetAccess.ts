import { prisma } from '@/lib/db';

/**
 * Returns true if userId is the owner OR a collaborator of sheetId.
 */
export async function canAccessSheet(sheetId: string, userId: string): Promise<boolean> {
  const sheet = await prisma.expenseSheet.findFirst({
    where: { id: sheetId, ownerId: userId },
    select: { id: true },
  });
  if (sheet) return true;

  const collaborator = await prisma.sheetCollaborator.findFirst({
    where: { sheetId, userId },
    select: { id: true },
  });
  return collaborator !== null;
}

/**
 * Returns true if userId is the owner of sheetId.
 */
export async function isSheetOwner(sheetId: string, userId: string): Promise<boolean> {
  const sheet = await prisma.expenseSheet.findFirst({
    where: { id: sheetId, ownerId: userId },
    select: { id: true },
  });
  return sheet !== null;
}

/**
 * Returns true if userId can edit/delete a transaction:
 *   - always true if user is the sheet owner
 *   - true if transaction.createdByUserId === userId
 *   - false otherwise
 */
export async function canEditTransaction(
  sheetId: string,
  transactionId: string,
  userId: string,
): Promise<boolean> {
  if (await isSheetOwner(sheetId, userId)) return true;

  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, sheetId },
    select: { createdByUserId: true },
  });
  if (!transaction) return false;

  return transaction.createdByUserId === userId;
}

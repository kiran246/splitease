import { canAccessSheet, isSheetOwner, canEditTransaction } from '@/lib/sheetAccess';
import { prisma } from '@/lib/db';

jest.mock('@/lib/db', () => ({
  prisma: {
    expenseSheet: { findFirst: jest.fn() },
    sheetCollaborator: { findFirst: jest.fn() },
    transaction: { findFirst: jest.fn() },
  },
}));

const mockExpenseSheet = jest.mocked(prisma.expenseSheet.findFirst);
const mockSheetCollaborator = jest.mocked(prisma.sheetCollaborator.findFirst);
const mockTransaction = jest.mocked(prisma.transaction.findFirst);

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// canAccessSheet
// ---------------------------------------------------------------------------
describe('canAccessSheet', () => {
  it('returns true when user is the sheet owner', async () => {
    mockExpenseSheet.mockResolvedValueOnce({ id: 'sheet-1' } as any);

    const result = await canAccessSheet('sheet-1', 'user-owner');

    expect(result).toBe(true);
    expect(mockExpenseSheet).toHaveBeenCalledWith({
      where: { id: 'sheet-1', ownerId: 'user-owner' },
      select: { id: true },
    });
    // collaborator lookup should be skipped
    expect(mockSheetCollaborator).not.toHaveBeenCalled();
  });

  it('returns true when user is a collaborator', async () => {
    mockExpenseSheet.mockResolvedValueOnce(null);
    mockSheetCollaborator.mockResolvedValueOnce({ id: 'collab-1' } as any);

    const result = await canAccessSheet('sheet-1', 'user-collab');

    expect(result).toBe(true);
    expect(mockSheetCollaborator).toHaveBeenCalledWith({
      where: { sheetId: 'sheet-1', userId: 'user-collab' },
      select: { id: true },
    });
  });

  it('returns false when user is neither owner nor collaborator', async () => {
    mockExpenseSheet.mockResolvedValueOnce(null);
    mockSheetCollaborator.mockResolvedValueOnce(null);

    const result = await canAccessSheet('sheet-1', 'user-stranger');

    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isSheetOwner
// ---------------------------------------------------------------------------
describe('isSheetOwner', () => {
  it('returns true for the sheet owner', async () => {
    mockExpenseSheet.mockResolvedValueOnce({ id: 'sheet-1' } as any);

    const result = await isSheetOwner('sheet-1', 'user-owner');

    expect(result).toBe(true);
  });

  it('returns false for a non-owner (collaborator)', async () => {
    mockExpenseSheet.mockResolvedValueOnce(null);

    const result = await isSheetOwner('sheet-1', 'user-collab');

    expect(result).toBe(false);
  });

  it('returns false for a user with no relation to the sheet', async () => {
    mockExpenseSheet.mockResolvedValueOnce(null);

    const result = await isSheetOwner('sheet-1', 'user-stranger');

    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canEditTransaction
// ---------------------------------------------------------------------------
describe('canEditTransaction', () => {
  it('owner can always edit another user\'s transaction', async () => {
    // isSheetOwner check → owner found
    mockExpenseSheet.mockResolvedValueOnce({ id: 'sheet-1' } as any);

    const result = await canEditTransaction('sheet-1', 'tx-1', 'user-owner');

    expect(result).toBe(true);
    // transaction lookup should be skipped since owner short-circuits
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('collaborator can edit their own transaction', async () => {
    // isSheetOwner check → not owner
    mockExpenseSheet.mockResolvedValueOnce(null);
    // transaction belongs to the collaborator
    mockTransaction.mockResolvedValueOnce({ createdByUserId: 'user-collab' } as any);

    const result = await canEditTransaction('sheet-1', 'tx-1', 'user-collab');

    expect(result).toBe(true);
    expect(mockTransaction).toHaveBeenCalledWith({
      where: { id: 'tx-1', sheetId: 'sheet-1' },
      select: { createdByUserId: true },
    });
  });

  it("collaborator cannot edit another user's transaction", async () => {
    // isSheetOwner check → not owner
    mockExpenseSheet.mockResolvedValueOnce(null);
    // transaction belongs to a different user
    mockTransaction.mockResolvedValueOnce({ createdByUserId: 'user-owner' } as any);

    const result = await canEditTransaction('sheet-1', 'tx-1', 'user-collab');

    expect(result).toBe(false);
  });

  it('returns false when transaction does not exist', async () => {
    mockExpenseSheet.mockResolvedValueOnce(null);
    mockTransaction.mockResolvedValueOnce(null);

    const result = await canEditTransaction('sheet-1', 'tx-missing', 'user-collab');

    expect(result).toBe(false);
  });
});

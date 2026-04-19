import type { CreateTransactionInput } from '@/types';

export function calculateSplits(input: CreateTransactionInput) {
  const { amount, splitType, participants } = input;

  if (splitType === 'equal') {
    const perPerson = amount / participants.length;
    return participants.map((p) => ({
      participantId: p.id,
      amount: Math.round(perPerson * 100) / 100,
      percentage: Math.round((100 / participants.length) * 100) / 100,
    }));
  }

  const totalPct = participants.reduce((sum, p) => sum + (p.percentage ?? 0), 0);
  if (Math.abs(totalPct - 100) > 0.01) {
    throw new Error(`Percentages must sum to 100, got ${totalPct}`);
  }

  return participants.map((p) => ({
    participantId: p.id,
    percentage: p.percentage!,
    amount: Math.round(((amount * p.percentage!) / 100) * 100) / 100,
  }));
}

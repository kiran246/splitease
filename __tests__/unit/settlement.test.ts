import { computeBalances, computeSettlements } from '@/lib/settlement';
import type { TransactionWithSplits } from '@/types';

const p1 = { id: 'p1', name: 'Alice' };
const p2 = { id: 'p2', name: 'Bob' };
const p3 = { id: 'p3', name: 'Charlie' };

function makeTransaction(
  id: string,
  amount: number,
  paidById: string,
  splits: Array<{ pid: string; amount: number }>
): TransactionWithSplits {
  return {
    id,
    title: 'Test',
    amount,
    paidById,
    paidBy: [p1, p2, p3].find((p) => p.id === paidById)!,
    splits: splits.map((s, i) => ({
      id: `s${i}`,
      participantId: s.pid,
      participant: [p1, p2, p3].find((p) => p.id === s.pid)!,
      amount: s.amount,
      percentage: null,
    })),
    createdAt: new Date(),
  };
}

describe('computeBalances', () => {
  it('computes net balance correctly', () => {
    const txs = [
      makeTransaction('t1', 90, 'p1', [
        { pid: 'p1', amount: 30 },
        { pid: 'p2', amount: 30 },
        { pid: 'p3', amount: 30 },
      ]),
    ];

    const balances = computeBalances(txs, [p1, p2, p3]);
    const alice = balances.find((b) => b.id === 'p1')!;
    const bob = balances.find((b) => b.id === 'p2')!;

    expect(alice.net).toBeCloseTo(60, 2); // paid 90, owed 30
    expect(bob.net).toBeCloseTo(-30, 2);  // paid 0, owed 30
  });
});

describe('computeSettlements', () => {
  it('produces correct settlements', () => {
    const balances = [
      { id: 'p1', name: 'Alice', paid: 90, owed: 30, net: 60 },
      { id: 'p2', name: 'Bob', paid: 0, owed: 30, net: -30 },
      { id: 'p3', name: 'Charlie', paid: 0, owed: 30, net: -30 },
    ];

    const settlements = computeSettlements(balances);
    expect(settlements).toHaveLength(2);
    expect(settlements.every((s) => s.to === 'Alice')).toBe(true);
    expect(settlements.reduce((sum, s) => sum + s.amount, 0)).toBeCloseTo(60, 2);
  });

  it('returns empty when all settled', () => {
    const balances = [
      { id: 'p1', name: 'A', paid: 30, owed: 30, net: 0 },
      { id: 'p2', name: 'B', paid: 30, owed: 30, net: 0 },
    ];
    expect(computeSettlements(balances)).toHaveLength(0);
  });
});

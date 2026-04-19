import type { ParticipantBalance, SettlementEntry, TransactionWithSplits } from '@/types';

export function computeBalances(
  transactions: TransactionWithSplits[],
  participantIds: Array<{ id: string; name: string }>
): ParticipantBalance[] {
  const balanceMap = new Map<string, ParticipantBalance>();

  for (const p of participantIds) {
    balanceMap.set(p.id, { id: p.id, name: p.name, paid: 0, owed: 0, net: 0 });
  }

  for (const tx of transactions) {
    const payer = balanceMap.get(tx.paidById);
    if (payer) payer.paid += tx.amount;

    for (const split of tx.splits) {
      const debtor = balanceMap.get(split.participantId);
      if (debtor) debtor.owed += split.amount;
    }
  }

  for (const b of balanceMap.values()) {
    b.net = Math.round((b.paid - b.owed) * 100) / 100;
  }

  return Array.from(balanceMap.values());
}

export function computeSettlements(balances: ParticipantBalance[]): SettlementEntry[] {
  const creditors = balances
    .filter((b) => b.net > 0.005)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.net - a.net);

  const debtors = balances
    .filter((b) => b.net < -0.005)
    .map((b) => ({ ...b }))
    .sort((a, b) => a.net - b.net);

  const settlements: SettlementEntry[] = [];

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const transfer = Math.min(creditor.net, Math.abs(debtor.net));

    if (transfer > 0.005) {
      settlements.push({
        from: debtor.name,
        fromId: debtor.id,
        to: creditor.name,
        toId: creditor.id,
        amount: Math.round(transfer * 100) / 100,
      });
    }

    creditor.net -= transfer;
    debtor.net += transfer;

    if (creditor.net < 0.005) ci++;
    if (Math.abs(debtor.net) < 0.005) di++;
  }

  return settlements;
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Split {
  id: string;
  participant: { id: string; name: string };
  amount: number;
  percentage?: number | null;
}

interface Transaction {
  id: string;
  title: string;
  amount: number;
  paidBy: { id: string; name: string };
  splits: Split[];
  createdAt: string | Date;
}

export default function TransactionList({
  transactions,
  sheetId,
}: {
  transactions: Transaction[];
  sheetId: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  async function deleteTransaction(tid: string) {
    setDeleting(tid);
    await fetch(`/api/sheets/${sheetId}/transactions/${tid}`, { method: 'DELETE' });
    router.refresh();
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
        <p className="text-3xl mb-2">💸</p>
        <p>No transactions yet. Add your first expense!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx) => (
        <div
          key={tx.id}
          className="bg-white rounded-xl border border-gray-200 p-4 space-y-2 hover:shadow-sm transition"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{tx.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Paid by <span className="font-medium text-gray-700">{tx.paidBy.name}</span>
                {' · '}
                {new Date(tx.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">${tx.amount.toFixed(2)}</p>
              <button
                onClick={() => deleteTransaction(tx.id)}
                disabled={deleting === tx.id}
                className="text-xs text-red-400 hover:text-red-600 mt-1 disabled:opacity-50"
              >
                {deleting === tx.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {tx.splits.map((s) => (
              <span
                key={s.id}
                className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-full px-2.5 py-1"
              >
                {s.participant.name}: ${s.amount.toFixed(2)}
                {s.percentage != null && ` (${s.percentage.toFixed(0)}%)`}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

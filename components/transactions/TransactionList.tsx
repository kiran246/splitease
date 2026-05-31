'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CommentThread from './CommentThread';

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
  createdByUserId?: string | null;
  paidBy: { id: string; name: string };
  splits: Split[];
  comments: { authorId: string }[];
  createdAt: string | Date;
}

export default function TransactionList({
  transactions,
  sheetId,
  isCollaborative,
  currentUserId,
}: {
  transactions: Transaction[];
  sheetId: string;
  isCollaborative?: boolean;
  currentUserId?: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filterParticipantId, setFilterParticipantId] = useState<string | null>(null);

  // Collect every unique participant across all transactions
  const participants = useMemo(() => {
    const map = new Map<string, string>();
    for (const tx of transactions) {
      map.set(tx.paidBy.id, tx.paidBy.name);
      for (const s of tx.splits) map.set(s.participant.id, s.participant.name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [transactions]);

  const filtered = useMemo(() => {
    if (!filterParticipantId) return transactions;
    return transactions.filter(
      (tx) =>
        tx.paidBy.id === filterParticipantId ||
        tx.splits.some((s) => s.participant.id === filterParticipantId)
    );
  }, [transactions, filterParticipantId]);

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

  // Summary for filtered participant
  const filterSummary = useMemo(() => {
    if (!filterParticipantId) return null;
    let paid = 0, owed = 0;
    for (const tx of filtered) {
      if (tx.paidBy.id === filterParticipantId) paid += tx.amount;
      const split = tx.splits.find((s) => s.participant.id === filterParticipantId);
      if (split) owed += split.amount;
    }
    return { paid, owed, net: paid - owed };
  }, [filtered, filterParticipantId]);

  return (
    <div className="space-y-3">
      {/* Participant filter chips */}
      {participants.length > 1 && (
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => setFilterParticipantId(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              !filterParticipantId
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {participants.map((p) => (
            <button
              key={p.id}
              onClick={() => setFilterParticipantId(filterParticipantId === p.id ? null : p.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                filterParticipantId === p.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.name}
            </button>
          ))}
          {filterParticipantId && (
            <span className="text-xs text-gray-400 ml-1">
              {filtered.length} of {transactions.length} expense{transactions.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Summary strip when a participant is selected */}
      {filterSummary && (
        <div className="flex gap-4 px-4 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-sm">
          <span className="text-gray-500">
            Paid: <span className="font-semibold text-gray-900">${filterSummary.paid.toFixed(2)}</span>
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500">
            Owes: <span className="font-semibold text-gray-900">${filterSummary.owed.toFixed(2)}</span>
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500">
            Net:{' '}
            <span className={`font-semibold ${filterSummary.net >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {filterSummary.net >= 0 ? '+' : ''}${filterSummary.net.toFixed(2)}
            </span>
          </span>
        </div>
      )}

      {filtered.length === 0 && filterParticipantId && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          No expenses involve this person.
        </div>
      )}

      {filtered.map((tx) => {
        const isOwn = tx.createdByUserId === currentUserId;
        const hasOthersComments =
          isOwn && tx.comments.some((c) => c.authorId !== currentUserId);

        return (
          <div
            key={tx.id}
            className={`bg-white rounded-xl border p-4 space-y-2 hover:shadow-sm transition ${
              hasOthersComments
                ? 'border-amber-400 ring-1 ring-amber-300'
                : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900">{tx.title}</h3>
                  {hasOthersComments && (
                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
                      💬 New comment
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Paid by <span className="font-medium text-gray-700">{tx.paidBy.name}</span>
                  {' · '}
                  {new Date(tx.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right ml-3 shrink-0">
                <p className="text-lg font-bold text-gray-900">${tx.amount.toFixed(2)}</p>
                {isOwn && (
                  <div className="flex items-center gap-2 justify-end mt-1">
                    <Link
                      href={`/sheets/${sheetId}/transactions/${tx.id}/edit`}
                      className="text-xs text-indigo-500 hover:text-indigo-700"
                    >
                      Edit
                    </Link>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => deleteTransaction(tx.id)}
                      disabled={deleting === tx.id}
                      className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
                    >
                      {deleting === tx.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                )}
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

            {isCollaborative && (
              <CommentThread
                sheetId={sheetId}
                transactionId={tx.id}
                initialCommentCount={tx.comments.length}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

'use client';

import { useState } from 'react';
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
      {transactions.map((tx) => {
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

'use client';

import { useState, useTransition } from 'react';
import { deleteSheet, clearUserSheets } from '@/app/actions/admin';

type Sheet = {
  id: string;
  title: string;
  isCollaborative: boolean;
  createdAt: Date;
  owner: { id: string; name: string; email: string };
  _count: { transactions: number; collaborators: number; participants: number };
};

type User = { id: string; name: string; email: string };
type Toast = { type: 'success' | 'error'; msg: string };

export default function SheetsTable({ sheets, users }: { sheets: Sheet[]; users: User[] }) {
  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState<Sheet | null>(null);
  const [confirmClear, setConfirmClear] = useState<User | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [isPending, startTransition] = useTransition();

  function notify(type: 'success' | 'error', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  const filtered = sheets.filter((s) => {
    const q = search.toLowerCase();
    if (q && !s.title.toLowerCase().includes(q) && !s.owner.name.toLowerCase().includes(q)) return false;
    if (ownerFilter !== 'all' && s.owner.id !== ownerFilter) return false;
    return true;
  });

  const selectedUser = ownerFilter !== 'all' ? users.find((u) => u.id === ownerFilter) : null;

  function handleDelete(sheet: Sheet) {
    startTransition(async () => {
      try {
        await deleteSheet(sheet.id);
        setConfirmDelete(null);
        notify('success', `Deleted "${sheet.title}"`);
      } catch (e) {
        notify('error', (e as Error).message);
      }
    });
  }

  function handleClearUser(user: User) {
    startTransition(async () => {
      try {
        const count = await clearUserSheets(user.id);
        setConfirmClear(null);
        notify('success', `Cleared ${count} sheet${count !== 1 ? 's' : ''} for ${user.name}`);
      } catch (e) {
        notify('error', (e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search sheet title or owner…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-72"
        />
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-xs"
        >
          <option value="all">All Users</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-400">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
        {selectedUser && (
          <button
            onClick={() => setConfirmClear(selectedUser)}
            disabled={isPending || filtered.length === 0}
            className="ml-auto px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 transition"
          >
            Clear all sheets for {selectedUser.name}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Title', 'Owner', 'Type', 'Transactions', 'Participants', 'Collaborators', 'Created', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                    No sheets found
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className={`hover:bg-gray-50 transition ${isPending ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">
                      {s.title}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-gray-900 font-medium">{s.owner.name}</div>
                      <div className="text-xs text-gray-400">{s.owner.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          s.isCollaborative
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {s.isCollaborative ? 'Collaborative' : 'Personal'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-center">{s._count.transactions}</td>
                    <td className="px-4 py-3 text-gray-600 text-center">{s._count.participants}</td>
                    <td className="px-4 py-3 text-gray-600 text-center">{s._count.collaborators}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        title="Delete sheet"
                        onClick={() => setConfirmDelete(s)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete sheet confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Delete Sheet</h2>
            <p className="text-sm text-gray-600">
              Permanently delete{' '}
              <span className="font-semibold">&ldquo;{confirmDelete.title}&rdquo;</span>? This removes
              all transactions, splits, and comments inside it.
            </p>
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={isPending}
                className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
              >
                {isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear user sheets confirmation */}
      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Clear All Sheets</h2>
            <p className="text-sm text-gray-600">
              Delete <span className="font-semibold">all sheets owned by {confirmClear.name}</span>?
              This cannot be undone — all transactions and data inside those sheets will be permanently removed.
            </p>
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setConfirmClear(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleClearUser(confirmClear)}
                disabled={isPending}
                className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
              >
                {isPending ? 'Clearing…' : 'Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

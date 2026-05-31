'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Participant = { id: string; name: string };

type Row = {
  key: number;
  date: string;
  title: string;
  amount: string;
  paidById: string;
  shared: Set<string>; // participant IDs who share this expense
};

type RowError = { row: number; error: string };

let rowCounter = 0;

function newRow(participants: Participant[]): Row {
  return {
    key: rowCounter++,
    date: '',
    title: '',
    amount: '',
    paidById: '',
    shared: new Set(participants.map((p) => p.id)), // all checked by default
  };
}

function perPersonAmount(row: Row): number {
  const total = parseFloat(row.amount);
  if (isNaN(total) || total <= 0 || row.shared.size === 0) return 0;
  return Math.round((total / row.shared.size) * 100) / 100;
}

export default function BulkEntryGrid({
  sheetId,
  participants,
}: {
  sheetId: string;
  participants: Participant[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => [
    newRow(participants),
    newRow(participants),
    newRow(participants),
  ]);
  const [saving, setSaving] = useState(false);
  const [rowErrors, setRowErrors] = useState<Map<number, string>>(new Map());
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'partial'; msg: string } | null>(null);

  function notify(type: 'success' | 'error' | 'partial', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, newRow(participants)]);
  }, [participants]);

  const removeRow = useCallback((key: number) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  }, []);

  function updateRow(key: number, field: keyof Omit<Row, 'key' | 'shared'>, value: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function toggleParticipant(key: number, participantId: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const next = new Set(r.shared);
        if (next.has(participantId)) next.delete(participantId);
        else next.add(participantId);
        return { ...r, shared: next };
      })
    );
  }

  function validateRow(row: Row): string | null {
    if (!row.title.trim()) return 'Expense name is required';
    if (!row.paidById) return '"Who Paid" is required';
    const total = parseFloat(row.amount);
    if (isNaN(total) || total <= 0) return 'Amount must be greater than 0';
    if (row.shared.size === 0) return 'Select at least one person to share with';
    return null;
  }

  async function handleSave() {
    const clientErrors = new Map<number, string>();
    rows.forEach((row, i) => {
      const err = validateRow(row);
      if (err) clientErrors.set(i, err);
    });

    if (clientErrors.size > 0) {
      setRowErrors(clientErrors);
      notify('error', `Fix ${clientErrors.size} row error${clientErrors.size > 1 ? 's' : ''} before saving`);
      return;
    }

    setRowErrors(new Map());
    setSaving(true);

    try {
      const payload = rows.map((row) => {
        const total = parseFloat(row.amount);
        const sharedIds = [...row.shared];
        const each = Math.round((total / sharedIds.length) * 100) / 100;
        // Distribute rounding remainder to the first participant
        const remainder = Math.round((total - each * sharedIds.length) * 100) / 100;

        return {
          date: row.date || undefined,
          title: row.title.trim(),
          paidById: row.paidById,
          splits: sharedIds.map((id, idx) => ({
            participantId: id,
            amount: idx === 0 ? each + remainder : each,
          })),
        };
      });

      const res = await fetch(`/api/sheets/${sheetId}/transactions/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: payload }),
      });

      const data = await res.json();

      if (!res.ok && res.status !== 207) {
        notify('error', data.error ?? 'Failed to save');
        return;
      }

      if (data.errors?.length > 0) {
        const errorRowIndices = new Set((data.errors as RowError[]).map((e) => e.row));

        if (data.created > 0) {
          notify('partial', `Saved ${data.created} expense${data.created > 1 ? 's' : ''}. Fix ${data.errors.length} remaining error${data.errors.length > 1 ? 's' : ''}.`);
          const newServerErrors = new Map<number, string>();
          const failedRows = rows.filter((_, i) => errorRowIndices.has(i));
          (data.errors as RowError[]).forEach((e, newIdx) => {
            newServerErrors.set(newIdx, e.error);
          });
          setRows(failedRows);
          setRowErrors(newServerErrors);
        } else {
          const serverErrors = new Map<number, string>();
          (data.errors as RowError[]).forEach((e) => serverErrors.set(e.row, e.error));
          setRowErrors(serverErrors);
          notify('error', `Failed to save. Fix ${data.errors.length} row error${data.errors.length > 1 ? 's' : ''}.`);
        }
      } else {
        notify('success', `Saved ${data.created} expense${data.created > 1 ? 's' : ''} successfully`);
        router.push(`/sheets/${sheetId}`);
        router.refresh();
      }
    } catch {
      notify('error', 'Network error — please try again');
    } finally {
      setSaving(false);
    }
  }

  const toastColor =
    toast?.type === 'success' ? 'bg-green-600' :
    toast?.type === 'partial' ? 'bg-yellow-600' : 'bg-red-600';

  const grandTotal = rows.reduce((s, r) => {
    const n = parseFloat(r.amount);
    return s + (isNaN(n) ? 0 : n);
  }, 0);

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toastColor}`}>
          {toast.msg}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="text-sm border-collapse min-w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap w-32">Date</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap w-44">Expense</th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap w-28">Amount</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap w-36">Who Paid</th>
              {participants.map((p) => (
                <th key={p.id} className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap w-24">
                  {p.name}
                </th>
              ))}
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap w-24">Each Pays</th>
              <th className="w-8" />
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {rows.map((row, rowIdx) => {
              const each = perPersonAmount(row);
              const err = rowErrors.get(rowIdx);
              return (
                <tr key={row.key} className={`group ${err ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                  {/* Date */}
                  <td className="px-2 py-2">
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => updateRow(row.key, 'date', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </td>

                  {/* Expense name */}
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      placeholder="e.g. Dinner"
                      value={row.title}
                      onChange={(e) => updateRow(row.key, 'title', e.target.value)}
                      className={`w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        err && !row.title.trim() ? 'border-red-400' : 'border-gray-200'
                      }`}
                    />
                    {err && <p className="text-xs text-red-600 mt-0.5 leading-tight">{err}</p>}
                  </td>

                  {/* Amount */}
                  <td className="px-2 py-2">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={row.amount}
                        onChange={(e) => updateRow(row.key, 'amount', e.target.value)}
                        className={`w-full border rounded-lg pl-5 pr-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          err && (!row.amount || parseFloat(row.amount) <= 0) ? 'border-red-400' : 'border-gray-200'
                        }`}
                      />
                    </div>
                  </td>

                  {/* Who Paid */}
                  <td className="px-2 py-2">
                    <select
                      value={row.paidById}
                      onChange={(e) => updateRow(row.key, 'paidById', e.target.value)}
                      className={`w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        err && !row.paidById ? 'border-red-400' : 'border-gray-200'
                      }`}
                    >
                      <option value="">— select —</option>
                      {participants.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </td>

                  {/* Shared-with checkboxes */}
                  {participants.map((p) => (
                    <td key={p.id} className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={row.shared.has(p.id)}
                        onChange={() => toggleParticipant(row.key, p.id)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                  ))}

                  {/* Each Pays */}
                  <td className="px-3 py-2 text-right">
                    <span className={`text-sm font-semibold ${each > 0 ? 'text-indigo-700' : 'text-gray-300'}`}>
                      {each > 0 ? `$${each.toFixed(2)}` : '—'}
                    </span>
                    {row.shared.size > 0 && each > 0 && (
                      <div className="text-xs text-gray-400">÷ {row.shared.size}</div>
                    )}
                  </td>

                  {/* Delete row */}
                  <td className="px-2 py-2 text-center">
                    <button
                      onClick={() => removeRow(row.key)}
                      disabled={rows.length === 1}
                      className="text-gray-300 hover:text-red-500 disabled:opacity-0 transition"
                      title="Remove row"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="bg-gray-50 border-t border-gray-200">
              <td colSpan={4} className="px-3 py-2 text-xs text-gray-400 font-medium">
                {rows.length} row{rows.length !== 1 ? 's' : ''}
              </td>
              {participants.map((p) => {
                const checked = rows.filter((r) => r.shared.has(p.id)).length;
                return (
                  <td key={p.id} className="px-3 py-2 text-center text-xs text-gray-400">
                    {checked}/{rows.length}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-right text-xs font-bold text-gray-900">
                ${grandTotal.toFixed(2)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={addRow}
          className="px-4 py-2 text-sm text-indigo-600 font-medium border border-indigo-200 rounded-lg hover:bg-indigo-50 transition"
        >
          + Add Row
        </button>
        <div className="flex gap-3">
          <a
            href={`/sheets/${sheetId}`}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </a>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {saving ? 'Saving…' : 'Save All'}
          </button>
        </div>
      </div>
    </div>
  );
}

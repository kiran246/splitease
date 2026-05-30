'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Participant = { id: string; name: string };

type Row = {
  key: number;
  date: string;
  title: string;
  paidById: string;
  amounts: Record<string, string>; // participantId → raw input string
};

type RowError = { row: number; error: string };

let rowCounter = 0;
function newRow(participants: Participant[]): Row {
  const amounts: Record<string, string> = {};
  for (const p of participants) amounts[p.id] = '';
  return { key: rowCounter++, date: '', title: '', paidById: '', amounts };
}

function rowTotal(row: Row): number {
  return Object.values(row.amounts).reduce((sum, v) => {
    const n = parseFloat(v);
    return sum + (isNaN(n) || n < 0 ? 0 : n);
  }, 0);
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

  function updateRow(key: number, field: keyof Omit<Row, 'key' | 'amounts'>, value: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function updateAmount(key: number, participantId: string, value: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.key === key ? { ...r, amounts: { ...r.amounts, [participantId]: value } } : r
      )
    );
  }

  // Validate a row client-side; returns error string or null
  function validateRow(row: Row): string | null {
    if (!row.title.trim()) return 'Expense name is required';
    if (!row.paidById) return '"Who Paid" is required';
    const total = rowTotal(row);
    if (total <= 0) return 'Total must be greater than 0';
    return null;
  }

  async function handleSave() {
    // Client-side validation pass
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
      const payload = rows.map((row) => ({
        date: row.date || undefined,
        title: row.title.trim(),
        paidById: row.paidById,
        splits: participants.map((p) => ({
          participantId: p.id,
          amount: parseFloat(row.amounts[p.id] || '0') || 0,
        })),
      }));

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
        const serverErrors = new Map<number, string>();
        for (const e of data.errors as RowError[]) {
          serverErrors.set(e.row, e.error);
        }
        setRowErrors(serverErrors);

        if (data.created > 0) {
          notify('partial', `Saved ${data.created} expense${data.created > 1 ? 's' : ''}. Fix ${data.errors.length} row error${data.errors.length > 1 ? 's' : ''}.`);
          // Remove successfully saved rows (those without errors)
          const errorRowIndices = new Set(data.errors.map((e: RowError) => e.row));
          setRows((prev) => prev.filter((_, i) => errorRowIndices.has(i)));
          setRowErrors(new Map(data.errors.map((e: RowError, newIdx: number) => [newIdx, e.error])));
        } else {
          notify('error', `Failed to save ${data.errors.length} row${data.errors.length > 1 ? 's' : ''}`);
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
    toast?.type === 'success'
      ? 'bg-green-600'
      : toast?.type === 'partial'
      ? 'bg-yellow-600'
      : 'bg-red-600';

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toastColor}`}>
          {toast.msg}
        </div>
      )}

      {/* Scrollable grid */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="text-sm border-collapse min-w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap w-32">
                Date
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap w-48">
                Expense
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap w-36">
                Who Paid
              </th>
              {participants.map((p) => (
                <th
                  key={p.id}
                  className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap w-28"
                >
                  {p.name}
                </th>
              ))}
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap w-24">
                Total
              </th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, rowIdx) => {
              const total = rowTotal(row);
              const err = rowErrors.get(rowIdx);
              return (
                <tr
                  key={row.key}
                  className={`group ${err ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                >
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
                    <div>
                      <input
                        type="text"
                        placeholder="e.g. Dinner"
                        value={row.title}
                        onChange={(e) => updateRow(row.key, 'title', e.target.value)}
                        className={`w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          err && !row.title.trim() ? 'border-red-400' : 'border-gray-200'
                        }`}
                      />
                      {err && (
                        <p className="text-xs text-red-600 mt-0.5 leading-tight">{err}</p>
                      )}
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
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Per-participant amount columns */}
                  {participants.map((p) => (
                    <td key={p.id} className="px-2 py-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={row.amounts[p.id]}
                          onChange={(e) => updateAmount(row.key, p.id, e.target.value)}
                          className="w-full border border-gray-200 rounded-lg pl-5 pr-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </td>
                  ))}

                  {/* Total */}
                  <td className="px-3 py-2 text-right">
                    <span className={`text-sm font-semibold ${total > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                      ${total.toFixed(2)}
                    </span>
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

          {/* Summary row */}
          <tfoot>
            <tr className="bg-gray-50 border-t border-gray-200">
              <td colSpan={3} className="px-3 py-2 text-xs text-gray-400 font-medium">
                {rows.length} row{rows.length !== 1 ? 's' : ''}
              </td>
              {participants.map((p) => {
                const colTotal = rows.reduce((sum, row) => {
                  const n = parseFloat(row.amounts[p.id] || '0');
                  return sum + (isNaN(n) ? 0 : n);
                }, 0);
                return (
                  <td key={p.id} className="px-3 py-2 text-right text-xs font-semibold text-gray-600">
                    ${colTotal.toFixed(2)}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-right text-xs font-bold text-gray-900">
                ${rows.reduce((s, r) => s + rowTotal(r), 0).toFixed(2)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Actions */}
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

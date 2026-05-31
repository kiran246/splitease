'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Participant = { id: string; name: string };

type Row = {
  key: number;
  date: string;
  title: string;
  amount: string;
  paidById: string;
  shared: Set<string>;
};

type RowError = { row: number; error: string };
type ParseError = { line: number; reason: string };

let rowCounter = 0;

function newRow(participants: Participant[]): Row {
  return {
    key: rowCounter++,
    date: '',
    title: '',
    amount: '',
    paidById: '',
    shared: new Set(participants.map((p) => p.id)),
  };
}

function perPersonAmount(row: Row): number {
  const total = parseFloat(row.amount);
  if (isNaN(total) || total <= 0 || row.shared.size === 0) return 0;
  return Math.round((total / row.shared.size) * 100) / 100;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; continue; }
    if (char === ',' && !inQuotes) { result.push(current); current = ''; continue; }
    current += char;
  }
  result.push(current);
  return result;
}

function isYes(val: string): boolean {
  return ['y', 'yes'].includes(val.trim().toLowerCase());
}

export default function BulkEntryGrid({
  sheetId,
  participants,
}: {
  sheetId: string;
  participants: Participant[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<Row[]>(() => [
    newRow(participants),
    newRow(participants),
    newRow(participants),
  ]);
  const [saving, setSaving] = useState(false);
  const [rowErrors, setRowErrors] = useState<Map<number, string>>(new Map());
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
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

  // ── Template download ──────────────────────────────────────────────────────

  function downloadTemplate() {
    const fixedHeaders = ['Date', 'Expense', 'Amount', 'Who Paid'];
    const participantHeaders = participants.map((p) => p.name);
    const headers = [...fixedHeaders, ...participantHeaders];

    const sampleRow = [
      '2026-01-15',
      'Dinner',
      '90',
      participants[0]?.name ?? 'Name',
      ...participants.map(() => 'Y'),
    ];

    const csv = [headers.join(','), sampleRow.join(',')].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-expenses-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── CSV upload & parse ─────────────────────────────────────────────────────

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        notify('error', 'CSV must have a header row and at least one data row');
        return;
      }

      const rawHeaders = parseCSVLine(lines[0]).map((h) => h.trim());
      const fixedCount = 4; // Date, Expense, Amount, Who Paid
      const csvParticipantNames = rawHeaders.slice(fixedCount).map((h) => h.toLowerCase());

      // Build a name→participant map for fast lookup
      const nameToParticipant = new Map(participants.map((p) => [p.name.toLowerCase(), p]));

      // Warn about unrecognised participant columns but still proceed
      const unknownCols = csvParticipantNames.filter((n) => !nameToParticipant.has(n));
      const parsedErrors: ParseError[] = unknownCols.map((n) => ({
        line: 1,
        reason: `Column "${n}" doesn't match any participant in this sheet — it will be ignored`,
      }));

      const parsedRows: Row[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        const date = cols[0]?.trim() ?? '';
        const title = cols[1]?.trim() ?? '';
        const amountRaw = cols[2]?.trim() ?? '';
        const whoRaw = cols[3]?.trim().toLowerCase() ?? '';

        if (!title && !amountRaw && !whoRaw) continue; // skip blank rows

        if (!title) {
          parsedErrors.push({ line: i + 1, reason: 'Missing expense name — row skipped' });
          continue;
        }

        const amount = parseFloat(amountRaw);
        if (isNaN(amount) || amount <= 0) {
          parsedErrors.push({ line: i + 1, reason: `"${title}": invalid amount "${amountRaw}" — row skipped` });
          continue;
        }

        const payer = nameToParticipant.get(whoRaw);
        if (!payer) {
          parsedErrors.push({ line: i + 1, reason: `"${title}": "Who Paid" value "${cols[3]?.trim()}" doesn't match any participant — row skipped` });
          continue;
        }

        // Build shared set from Y/N columns
        const shared = new Set<string>();
        csvParticipantNames.forEach((name, colIdx) => {
          const p = nameToParticipant.get(name);
          if (!p) return;
          const val = cols[fixedCount + colIdx]?.trim() ?? '';
          if (isYes(val)) shared.add(p.id);
        });

        if (shared.size === 0) {
          parsedErrors.push({ line: i + 1, reason: `"${title}": no participants marked Y — defaulting to all` });
          participants.forEach((p) => shared.add(p.id));
        }

        parsedRows.push({
          key: rowCounter++,
          date,
          title,
          amount: amount.toString(),
          paidById: payer.id,
          shared,
        });
      }

      setParseErrors(parsedErrors);

      if (parsedRows.length === 0) {
        notify('error', 'No valid rows found in the file');
      } else {
        setRows(parsedRows);
        setRowErrors(new Map());
        notify(
          parsedErrors.length > 0 ? 'partial' : 'success',
          `Loaded ${parsedRows.length} row${parsedRows.length !== 1 ? 's' : ''} from file${parsedErrors.length > 0 ? ` (${parsedErrors.length} warning${parsedErrors.length !== 1 ? 's' : ''} — see below)` : ''}`
        );
      }
    };

    reader.readAsText(file);
    // Reset input so the same file can be re-uploaded if needed
    e.target.value = '';
  }

  // ── Save ──────────────────────────────────────────────────────────────────

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
          const failedRows = rows.filter((_, i) => errorRowIndices.has(i));
          const newServerErrors = new Map<number, string>();
          (data.errors as RowError[]).forEach((e, newIdx) => newServerErrors.set(newIdx, e.error));
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

  // ── Render ────────────────────────────────────────────────────────────────

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

      {/* Upload / Download toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-700">Import from Google Sheets / Excel</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Download the template, fill it in, then upload — participant columns use <strong>Y</strong> / <strong>N</strong>.
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-white transition whitespace-nowrap"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Template
        </button>
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 border border-indigo-300 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
          </svg>
          Upload CSV
        </button>
      </div>

      {/* Parse warnings */}
      {parseErrors.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 space-y-1">
          <p className="text-xs font-semibold text-yellow-800">
            {parseErrors.length} warning{parseErrors.length !== 1 ? 's' : ''} from file import:
          </p>
          <ul className="space-y-0.5">
            {parseErrors.map((e, i) => (
              <li key={i} className="text-xs text-yellow-700">
                {e.line > 1 ? `Row ${e.line}: ` : ''}{e.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Grid */}
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
                  <td className="px-2 py-2">
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => updateRow(row.key, 'date', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </td>
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
                  <td className="px-3 py-2 text-right">
                    <span className={`text-sm font-semibold ${each > 0 ? 'text-indigo-700' : 'text-gray-300'}`}>
                      {each > 0 ? `$${each.toFixed(2)}` : '—'}
                    </span>
                    {row.shared.size > 0 && each > 0 && (
                      <div className="text-xs text-gray-400">÷ {row.shared.size}</div>
                    )}
                  </td>
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

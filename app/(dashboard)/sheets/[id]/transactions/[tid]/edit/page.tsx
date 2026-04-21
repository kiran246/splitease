'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Participant {
  id: string;
  name: string;
}

interface ExistingSplit {
  participantId: string;
  amount: number;
  percentage?: number | null;
}

export default function EditTransactionPage() {
  const { id, tid } = useParams<{ id: string; tid: string }>();
  const router = useRouter();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [form, setForm] = useState({ title: '', amount: '', paidById: '' });
  const [splitType, setSplitType] = useState<'equal' | 'percentage'>('equal');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/sheets/${id}/participants`).then((r) => r.json()),
      fetch(`/api/sheets/${id}/transactions`).then((r) => r.json()),
    ]).then(([ps, txs]: [Participant[], Record<string, unknown>[]]) => {
      setParticipants(ps);
      const tx = txs.find((t) => t.id === tid);
      if (!tx) { router.push(`/sheets/${id}`); return; }

      const splits = (tx.splits as ExistingSplit[]) ?? [];
      const hasPercentage = splits.some((s) => s.percentage != null);

      setForm({
        title: tx.title as string,
        amount: String(tx.amount),
        paidById: (tx.paidBy as { id: string }).id,
      });
      setSplitType(hasPercentage ? 'percentage' : 'equal');
      setSelected(new Set(splits.map((s) => s.participantId)));
      if (hasPercentage) {
        const pctMap: Record<string, string> = {};
        splits.forEach((s) => { if (s.percentage != null) pctMap[s.participantId] = String(s.percentage); });
        setPercentages(pctMap);
      }
      setLoading(false);
    });
  }, [id, tid, router]);

  function toggleParticipant(pid: string) {
    const next = new Set(selected);
    if (next.has(pid)) next.delete(pid);
    else next.add(pid);
    setSelected(next);
  }

  function getEqualShare() {
    const count = selected.size;
    if (!count || !form.amount) return '0.00';
    return (parseFloat(form.amount) / count).toFixed(2);
  }

  function getTotalPercentage() {
    return Array.from(selected).reduce(
      (sum, pid) => sum + parseFloat(percentages[pid] || '0'),
      0
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (selected.size === 0) { setError('Select at least one participant.'); return; }
    if (splitType === 'percentage' && Math.abs(getTotalPercentage() - 100) > 0.01) {
      setError(`Percentages must sum to 100. Current: ${getTotalPercentage().toFixed(1)}%`);
      return;
    }

    setSaving(true);
    const participantsPayload = Array.from(selected).map((pid) => ({
      id: pid,
      ...(splitType === 'percentage' ? { percentage: parseFloat(percentages[pid] || '0') } : {}),
    }));

    const res = await fetch(`/api/sheets/${id}/transactions/${tid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        amount: parseFloat(form.amount),
        paidById: form.paidById,
        splitType,
        participants: participantsPayload,
      }),
    });

    if (res.ok) {
      router.push(`/sheets/${id}`);
    } else {
      const data = await res.json();
      setError(data.error?.message ?? 'Failed to update transaction.');
      setSaving(false);
    }
  }

  if (loading) return <div className="text-gray-500 py-8">Loading…</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Expense</h1>
        <p className="text-gray-500 mt-1">Update the details of this transaction.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Transaction Details</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paid by</label>
            <select
              required
              value={form.paidById}
              onChange={(e) => setForm({ ...form, paidById: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select person…</option>
              {participants.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Split Among</h2>

          <div className="flex flex-wrap gap-2">
            {participants.map((p) => {
              const isSelected = selected.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleParticipant(p.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${isSelected ? 'bg-indigo-500' : 'bg-gray-100'}`}>
                    {p.name.slice(0, 2).toUpperCase()}
                  </span>
                  {p.name}
                </button>
              );
            })}
          </div>

          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="splitType" value="equal"
                checked={splitType === 'equal'} onChange={() => setSplitType('equal')}
                className="text-indigo-600" />
              <span className="text-sm font-medium">Equal split</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="splitType" value="percentage"
                checked={splitType === 'percentage'} onChange={() => setSplitType('percentage')}
                className="text-indigo-600" />
              <span className="text-sm font-medium">Percentage split</span>
            </label>
          </div>

          {splitType === 'equal' && selected.size > 0 && form.amount && (
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              Each person pays: <strong>${getEqualShare()}</strong>
            </p>
          )}

          {splitType === 'percentage' && (
            <div className="space-y-2">
              {Array.from(selected).map((pid) => {
                const p = participants.find((x) => x.id === pid);
                if (!p) return null;
                return (
                  <div key={pid} className="flex items-center gap-3">
                    <span className="w-24 text-sm text-gray-700 font-medium truncate">{p.name}</span>
                    <input
                      type="number" step="0.1" min="0" max="100" placeholder="0"
                      value={percentages[pid] ?? ''}
                      onChange={(e) => setPercentages({ ...percentages, [pid]: e.target.value })}
                      className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-500">%</span>
                    {form.amount && percentages[pid] && (
                      <span className="text-sm text-gray-500">
                        = ${((parseFloat(form.amount) * parseFloat(percentages[pid])) / 100).toFixed(2)}
                      </span>
                    )}
                  </div>
                );
              })}
              <p className={`text-sm font-medium ${Math.abs(getTotalPercentage() - 100) < 0.01 ? 'text-green-600' : 'text-orange-600'}`}>
                Total: {getTotalPercentage().toFixed(1)}% {Math.abs(getTotalPercentage() - 100) < 0.01 ? '✓' : '(must equal 100%)'}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">
            {saving ? 'Saving…' : 'Update Transaction'}
          </button>
          <button type="button" onClick={() => router.back()}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

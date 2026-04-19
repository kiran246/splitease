'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Participant {
  name: string;
  email: string;
  phone: string;
}

export default function NewSheetPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([{ name: '', email: '', phone: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function addParticipant() {
    setParticipants([...participants, { name: '', email: '', phone: '' }]);
  }

  function removeParticipant(i: number) {
    setParticipants(participants.filter((_, idx) => idx !== i));
  }

  function updateParticipant(i: number, field: keyof Participant, value: string) {
    const updated = [...participants];
    updated[i] = { ...updated[i], [field]: value };
    setParticipants(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const sheetRes = await fetch('/api/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });

    if (!sheetRes.ok) {
      setError('Failed to create sheet.');
      setLoading(false);
      return;
    }

    const sheet = await sheetRes.json();

    const validParticipants = participants.filter((p) => p.name.trim());
    await Promise.all(
      validParticipants.map((p) =>
        fetch(`/api/sheets/${sheet.id}/participants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p),
        })
      )
    );

    router.push(`/sheets/${sheet.id}`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Expense Sheet</h1>
        <p className="text-gray-500 mt-1">Set up your group and start tracking expenses.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Sheet Details</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Goa Trip 2025"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">People</h2>
            <button
              type="button"
              onClick={addParticipant}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              + Add Person
            </button>
          </div>

          <div className="space-y-3">
            {participants.map((p, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Name *"
                    value={p.name}
                    onChange={(e) => updateParticipant(i, 'name', e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={p.email}
                    onChange={(e) => updateParticipant(i, 'email', e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={p.phone}
                    onChange={(e) => updateParticipant(i, 'phone', e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {participants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeParticipant(i)}
                    className="text-red-400 hover:text-red-600 text-lg mt-1.5"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading ? 'Creating…' : 'Create Sheet'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

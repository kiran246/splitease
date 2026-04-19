'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Participant {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export default function EditSheetPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newParticipant, setNewParticipant] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/sheets/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setTitle(data.title);
        setParticipants(data.participants);
        setLoading(false);
      });
  }, [id]);

  async function saveTitle(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/sheets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    setSaving(false);
  }

  async function addParticipant(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/sheets/${id}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newParticipant),
    });
    if (res.ok) {
      const p = await res.json();
      setParticipants([...participants, p]);
      setNewParticipant({ name: '', email: '', phone: '' });
    }
  }

  async function removeParticipant(pid: string) {
    await fetch(`/api/sheets/${id}/participants/${pid}`, { method: 'DELETE' });
    setParticipants(participants.filter((p) => p.id !== pid));
  }

  if (loading) return <div className="text-gray-500 py-8">Loading…</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Edit Sheet</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Sheet Title</h2>
        <form onSubmit={saveTitle} className="flex gap-2">
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition text-sm"
          >
            Save
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Participants</h2>

        <div className="space-y-2">
          {participants.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="font-medium text-gray-800">{p.name}</p>
                <p className="text-xs text-gray-500">{p.email || p.phone || 'No contact info'}</p>
              </div>
              <button
                onClick={() => removeParticipant(p.id)}
                className="text-red-400 hover:text-red-600 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={addParticipant} className="space-y-2 pt-2">
          <p className="text-sm font-medium text-gray-700">Add Person</p>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Name *"
              required
              value={newParticipant.name}
              onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="email"
              placeholder="Email"
              value={newParticipant.email}
              onChange={(e) => setNewParticipant({ ...newParticipant, email: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="tel"
              placeholder="Phone"
              value={newParticipant.phone}
              onChange={(e) => setNewParticipant({ ...newParticipant, phone: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
          >
            Add
          </button>
        </form>
      </div>

      <button
        onClick={() => router.push(`/sheets/${id}`)}
        className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
      >
        ← Back to Sheet
      </button>
    </div>
  );
}

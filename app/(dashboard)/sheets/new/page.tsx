'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Participant {
  name: string;
  email: string;
  phone: string;
}

interface PendingInvite {
  name: string;
  whatsappUrl: string;
}

export default function NewSheetPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([{ name: '', email: '', phone: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [createdSheetId, setCreatedSheetId] = useState<string | null>(null);

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
      body: JSON.stringify({ title, isCollaborative }),
    });

    if (!sheetRes.ok) {
      setError('Failed to create sheet.');
      setLoading(false);
      return;
    }

    const sheet = await sheetRes.json();

    const validParticipants = participants.filter((p) => p.name.trim());
    const results = await Promise.all(
      validParticipants.map((p) =>
        fetch(`/api/sheets/${sheet.id}/participants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p),
        }).then((r) => r.json())
      )
    );

    const whatsappInvites: PendingInvite[] = results
      .filter((r) => r.whatsappUrl)
      .map((r) => ({ name: r.name, whatsappUrl: r.whatsappUrl }));

    if (whatsappInvites.length > 0) {
      setCreatedSheetId(sheet.id);
      setPendingInvites(whatsappInvites);
      setLoading(false);
      return;
    }

    router.push(`/sheets/${sheet.id}`);
  }

  if (pendingInvites.length > 0 && createdSheetId) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sheet Created!</h1>
          <p className="text-gray-500 mt-1">Send WhatsApp invitations to your collaborators.</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Send Invitations</h2>
          <p className="text-sm text-gray-600">
            The following participants have phone numbers. Open each WhatsApp link and tap Send to invite them to the sheet.
          </p>
          <div className="space-y-3">
            {pendingInvites.map((invite, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                <span className="font-medium text-gray-800">{invite.name}</span>
                <a
                  href={invite.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
                >
                  Send via WhatsApp
                </a>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => router.push(`/sheets/${createdSheetId}`)}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
        >
          Go to Sheet →
        </button>
      </div>
    );
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

          <div>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isCollaborative}
                onChange={(e) => setIsCollaborative(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="block text-sm font-medium text-gray-700">Make this a collaborative sheet</span>
                <span className="block text-xs text-gray-500 mt-0.5">
                  Invite others via WhatsApp or email to contribute transactions together
                </span>
              </div>
            </label>
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

          {isCollaborative && (
            <p className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
              Participants with phone numbers will receive a WhatsApp invite link; those with email will receive an invitation email automatically.
            </p>
          )}

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

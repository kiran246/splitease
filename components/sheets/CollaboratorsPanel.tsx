'use client';

import { useEffect, useState } from 'react';

interface Collaborator {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: { name: string; email: string };
}

export default function CollaboratorsPanel({
  sheetId,
  isOwner,
}: {
  sheetId: string;
  isOwner: boolean;
}) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetch(`/api/sheets/${sheetId}/collaborators`)
      .then((r) => r.json())
      .then((data) => {
        setCollaborators(Array.isArray(data) ? data : []);
      })
      .catch(() => setCollaborators([]))
      .finally(() => setLoading(false));
  }, [sheetId]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setInviting(true);
    setInviteStatus('idle');

    try {
      const res = await fetch(`/api/sheets/${sheetId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });

      if (!res.ok) throw new Error('Failed');

      const { whatsappUrl } = await res.json();
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      setPhone('');
      setInviteStatus('success');
    } catch {
      setInviteStatus('error');
    } finally {
      setInviting(false);
    }
  }

  function getInitials(name: string) {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  function roleBadgeColor(role: string) {
    if (role === 'owner') return 'bg-indigo-100 text-indigo-700';
    if (role === 'editor') return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-600';
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h2 className="font-semibold text-gray-800">Collaborators</h2>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : collaborators.length === 0 ? (
        <p className="text-sm text-gray-500">No collaborators yet.</p>
      ) : (
        <ul className="space-y-2">
          {collaborators.map((c) => (
            <li key={c.id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                {getInitials(c.user.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{c.user.name}</p>
                <p className="text-xs text-gray-500 truncate">{c.user.email}</p>
              </div>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${roleBadgeColor(c.role)}`}
              >
                {c.role}
              </span>
            </li>
          ))}
        </ul>
      )}

      {isOwner && (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Invite via WhatsApp</p>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 123 4567"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={inviting || !phone.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition"
            >
              {inviting ? 'Sending…' : 'Invite'}
            </button>
          </form>
          {inviteStatus === 'success' && (
            <p className="text-xs text-green-600 font-medium">Invite sent!</p>
          )}
          {inviteStatus === 'error' && (
            <p className="text-xs text-red-600">Failed to send invite. Please try again.</p>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface InviteInfo {
  sheetId: string;
  sheetTitle: string;
  token: string;
}

interface Session {
  user?: { id: string; name: string; email: string };
}

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [expired, setExpired] = useState(false);
  const [loadingInvite, setLoadingInvite] = useState(true);

  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then(async (res) => {
        if (res.status === 410 || res.status === 404) {
          setExpired(true);
        } else if (res.ok) {
          const data = await res.json();
          setInvite(data);
        } else {
          setExpired(true);
        }
      })
      .catch(() => setExpired(true))
      .finally(() => setLoadingInvite(false));

    fetch('/api/auth/session')
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setSession(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSession(false));
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    setError('');
    try {
      const res = await fetch(`/api/invite/${token}/accept`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to accept invitation.');
      const { sheetId } = await res.json();
      router.push(`/sheets/${sheetId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setAccepting(false);
    }
  }

  if (loadingInvite || loadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">Loading…</p>
      </div>
    );
  }

  if (expired || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md w-full text-center space-y-4">
          <div className="text-4xl">⏰</div>
          <h1 className="text-xl font-bold text-gray-900">Invitation Expired</h1>
          <p className="text-gray-500 text-sm">
            This invitation link has expired or is no longer valid.
          </p>
          <Link
            href="/register"
            className="inline-block px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            Create an account
          </Link>
        </div>
      </div>
    );
  }

  const isLoggedIn = !!(session?.user);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="text-4xl">🤝</div>
          <h1 className="text-xl font-bold text-gray-900">You&apos;ve been invited!</h1>
          <p className="text-gray-600 text-sm">
            Join <span className="font-semibold text-gray-800">{invite.sheetTitle}</span> on SplitEase
            to contribute transactions together.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        {isLoggedIn ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 text-center">
              Signed in as <span className="font-medium text-gray-700">{session!.user!.email}</span>
            </p>
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {accepting ? 'Joining…' : 'Accept & Join'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center">
              Create an account or sign in to join this sheet.
            </p>
            <div className="flex gap-3">
              <Link
                href={`/register?next=/invite/${token}`}
                className="flex-1 text-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
              >
                Create Account
              </Link>
              <Link
                href={`/login?next=/invite/${token}`}
                className="flex-1 text-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

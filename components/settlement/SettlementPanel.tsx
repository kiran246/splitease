'use client';

import { useState } from 'react';
import type { ParticipantBalance, SettlementEntry } from '@/types';

export default function SettlementPanel({
  balances,
  settlements,
  participants,
}: {
  balances: ParticipantBalance[];
  settlements: SettlementEntry[];
  participants: Array<{ id: string; name: string; email: string | null }>;
}) {
  const [paying, setPaying] = useState<string | null>(null);

  async function handlePay(settlement: SettlementEntry) {
    const toParticipant = participants.find((p) => p.id === settlement.toId);
    if (!toParticipant?.email) {
      alert('The recipient has no email address on file. Add their email to enable Stripe payment.');
      return;
    }

    setPaying(settlement.fromId + settlement.toId);

    const res = await fetch('/api/payments/create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: settlement.amount,
        fromName: settlement.from,
        toName: settlement.to,
        toEmail: toParticipant.email,
        sheetId: window.location.pathname.split('/')[2],
      }),
    });

    const data = await res.json();
    setPaying(null);

    if (data.url) window.open(data.url, '_blank');
    else alert('Could not create payment session. Check Stripe configuration.');
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h2 className="font-semibold text-gray-900">Settlement Summary</h2>

      <div className="space-y-1.5">
        {balances.map((b) => (
          <div key={b.id} className="flex justify-between text-sm">
            <span className="text-gray-700">{b.name}</span>
            <span className={`font-medium ${b.net > 0 ? 'text-green-600' : b.net < 0 ? 'text-red-600' : 'text-gray-500'}`}>
              {b.net > 0 ? `+$${b.net.toFixed(2)}` : b.net < 0 ? `-$${Math.abs(b.net).toFixed(2)}` : 'settled'}
            </span>
          </div>
        ))}
      </div>

      {settlements.length > 0 && (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Who pays whom</p>
          {settlements.map((s, i) => (
            <div key={i} className="bg-amber-50 border border-amber-100 rounded-lg p-3 space-y-2">
              <p className="text-sm text-gray-800">
                <span className="font-semibold text-red-600">{s.from}</span>
                {' → '}
                <span className="font-semibold text-green-700">{s.to}</span>
                {': '}
                <span className="font-bold">${s.amount.toFixed(2)}</span>
              </p>
              <button
                onClick={() => handlePay(s)}
                disabled={paying === s.fromId + s.toId}
                className="w-full text-xs bg-indigo-600 text-white rounded-md py-1.5 hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {paying === s.fromId + s.toId ? 'Redirecting…' : '💳 Pay via Stripe'}
              </button>
            </div>
          ))}
        </div>
      )}

      {settlements.length === 0 && balances.length > 0 && (
        <p className="text-sm text-green-600 font-medium">✅ All settled up!</p>
      )}
    </div>
  );
}

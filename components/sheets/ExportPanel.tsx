'use client';

import { useState } from 'react';

export default function ExportPanel({ sheetId }: { sheetId: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  async function downloadPdf() {
    setLoading('pdf');
    const res = await fetch(`/api/sheets/${sheetId}/export`);
    if (!res.ok) { setLoading(null); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `splitease-${sheetId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    setLoading(null);
  }

  async function shareEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading('email');
    setStatus('');
    const res = await fetch(`/api/sheets/${sheetId}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'email', email }),
    });
    setLoading(null);
    setStatus(res.ok ? '✅ Email sent!' : '❌ Failed to send email.');
  }

  async function shareWhatsApp() {
    setLoading('whatsapp');
    const res = await fetch(`/api/sheets/${sheetId}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'whatsapp' }),
    });
    const data = await res.json();
    setLoading(null);
    if (data.url) window.open(data.url, '_blank');
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h2 className="font-semibold text-gray-900">Export &amp; Share</h2>

      <button
        onClick={downloadPdf}
        disabled={loading === 'pdf'}
        className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition"
      >
        {loading === 'pdf' ? 'Generating…' : '📄 Download PDF'}
      </button>

      <form onSubmit={shareEmail} className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600">Send via Email</label>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="recipient@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={loading === 'email' || !email}
            className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading === 'email' ? '…' : 'Send'}
          </button>
        </div>
      </form>

      <button
        onClick={shareWhatsApp}
        disabled={loading === 'whatsapp'}
        className="w-full flex items-center justify-center gap-2 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 disabled:opacity-50 transition"
      >
        {loading === 'whatsapp' ? 'Opening…' : '📲 Share on WhatsApp'}
      </button>

      {status && <p className="text-xs font-medium text-gray-700">{status}</p>}
    </div>
  );
}

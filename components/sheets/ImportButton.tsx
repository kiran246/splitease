'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ImportButton({ sheetId }: { sheetId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: Array<{ row: number; reason: string }> } | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setResult(null);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/sheets/${sheetId}/import`, { method: 'POST', body: fd });
    const data = await res.json();
    setLoading(false);
    setResult({ imported: data.imported ?? 0, skipped: data.skipped ?? [] });
    if (data.imported > 0) router.refresh();
    e.target.value = '';
  }

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition"
      >
        {loading ? 'Importing…' : '📥 Import CSV'}
      </button>
      {result && (
        <div className={`text-xs rounded-lg p-2.5 ${result.imported > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {result.imported > 0 && <p className="font-medium">✅ {result.imported} transaction{result.imported > 1 ? 's' : ''} imported</p>}
          {result.skipped.map((s) => (
            <p key={s.row}>Row {s.row}: {s.reason}</p>
          ))}
        </div>
      )}
    </div>
  );
}

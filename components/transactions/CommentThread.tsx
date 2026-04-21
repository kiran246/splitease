'use client';

import { useState } from 'react';

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  author: { name: string };
  isOwn: boolean;
}

export default function CommentThread({
  sheetId,
  transactionId,
}: {
  sheetId: string;
  transactionId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadComments() {
    setLoadingComments(true);
    try {
      const res = await fetch(
        `/api/sheets/${sheetId}/transactions/${transactionId}/comments`
      );
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch {
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }

  async function toggleExpand() {
    if (!expanded) {
      await loadComments();
    }
    setExpanded((v) => !v);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await fetch(
        `/api/sheets/${sheetId}/transactions/${transactionId}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text.trim() }),
        }
      );
      setText('');
      await loadComments();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(cid: string) {
    setDeletingId(cid);
    try {
      await fetch(
        `/api/sheets/${sheetId}/transactions/${transactionId}/comments/${cid}`,
        { method: 'DELETE' }
      );
      setComments((prev) => prev.filter((c) => c.id !== cid));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={toggleExpand}
        className="text-xs text-gray-500 hover:text-indigo-600 transition flex items-center gap-1"
      >
        <span>💬</span>
        <span>{comments.length > 0 ? `${comments.length} comment${comments.length !== 1 ? 's' : ''}` : 'Comments'}</span>
        <span className="text-gray-400">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {loadingComments ? (
            <p className="text-xs text-gray-400">Loading comments…</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-gray-400">No comments yet. Be the first!</p>
          ) : (
            <ul className="space-y-2">
              {comments.map((c) => (
                <li
                  key={c.id}
                  className="bg-gray-50 rounded-lg px-3 py-2 text-sm space-y-0.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-700 text-xs">{c.author.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {new Date(c.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {c.isOwn && (
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          disabled={deletingId === c.id}
                          className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
                        >
                          {deletingId === c.id ? '…' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-800">{c.text}</p>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a comment…"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !text.trim()}
                className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {submitting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

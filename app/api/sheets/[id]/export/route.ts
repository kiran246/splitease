import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendSheetEmail } from '@/lib/email';
import { computeBalances, computeSettlements } from '@/lib/settlement';
import { generateSheetPdf } from '@/lib/pdf';
import { z } from 'zod';

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  type: z.enum(['email', 'whatsapp', 'pdf']),
  email: z.string().email().optional(),
});

async function loadSheet(id: string, userId: string) {
  return prisma.expenseSheet.findFirst({
    where: { id, ownerId: userId },
    include: {
      participants: true,
      transactions: {
        include: { paidBy: true, splits: { include: { participant: true } } },
      },
    },
  });
}

// GET /api/sheets/[id]/export  →  binary PDF download
export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sheet = await loadSheet(id, session.user.id);
  if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const balances = computeBalances(sheet.transactions, sheet.participants);
  const settlements = computeSettlements(balances);
  const total = sheet.transactions.reduce((s, t) => s + t.amount, 0);

  const pdf = await generateSheetPdf({
    title: sheet.title,
    total,
    transactions: sheet.transactions,
    settlements,
    generatedAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  });

  const filename = `${sheet.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-splitease.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(pdf.length),
    },
  });
}

// POST /api/sheets/[id]/export  →  email or WhatsApp share
export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sheet = await loadSheet(id, session.user.id);
  if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const balances = computeBalances(sheet.transactions, sheet.participants);
  const settlements = computeSettlements(balances);
  const total = sheet.transactions.reduce((s, t) => s + t.amount, 0);

  if (parsed.data.type === 'email' && parsed.data.email) {
    const html = buildSheetHtml(sheet.title, total, sheet.transactions, settlements);
    const pdf = await generateSheetPdf({
      title: sheet.title, total, transactions: sheet.transactions, settlements,
      generatedAt: new Date().toLocaleDateString(),
    });
    await sendSheetEmail({
      to: parsed.data.email,
      subject: `SplitEase: ${sheet.title}`,
      html,
      pdfBuffer: pdf,
    });
    return NextResponse.json({ success: true });
  }

  if (parsed.data.type === 'whatsapp') {
    const text = buildWhatsAppText(sheet.title, total, settlements);
    return NextResponse.json({ url: `https://wa.me/?text=${encodeURIComponent(text)}` });
  }

  return NextResponse.json({ error: 'Use GET for PDF download' }, { status: 400 });
}

function sharedHtml(splits: Array<{ amount: number; participant: { name: string } }>, total: number): string {
  if (!splits || splits.length === 0) return '—';
  const n = splits.length;
  const isEqual = splits.every((s) => Math.abs(s.amount - total / n) < 0.02);
  if (isEqual) return `<span style="color:#4338ca">Equal among ${n}: ${splits.map((s) => s.participant.name).join(', ')}</span>`;
  return splits.map((s) => `${s.participant.name}: $${s.amount.toFixed(2)}`).join(' · ');
}

function buildSheetHtml(
  title: string, total: number,
  transactions: Array<{ title: string; amount: number; paidBy: { name: string }; splits: Array<{ amount: number; participant: { name: string } }> }>,
  settlements: Array<{ from: string; to: string; amount: number }>
) {
  const txRows = transactions
    .map((t) => `<tr>
      <td style="padding:6px 10px">${t.title}</td>
      <td style="padding:6px 10px">${t.paidBy.name}</td>
      <td style="padding:6px 10px;text-align:right">$${t.amount.toFixed(2)}</td>
      <td style="padding:6px 10px;font-size:12px">${sharedHtml(t.splits, t.amount)}</td>
    </tr>`)
    .join('');
  const sRows = settlements
    .map((s) => `<tr><td style="padding:6px 10px;color:#dc2626">${s.from}</td><td style="padding:6px 10px;color:#059669">${s.to}</td><td style="padding:6px 10px;font-weight:bold">$${s.amount.toFixed(2)}</td></tr>`)
    .join('');
  return `<div style="font-family:sans-serif;max-width:700px;margin:auto">
    <h1 style="color:#4338ca">${title}</h1>
    <p style="font-size:18px">Total: <strong>$${total.toFixed(2)}</strong></p>
    <h3>Transactions</h3>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb">
      <tr style="background:#f9fafb">
        <th style="padding:6px 10px;text-align:left">Expense</th>
        <th style="padding:6px 10px;text-align:left">Paid By</th>
        <th style="padding:6px 10px;text-align:right">Amount</th>
        <th style="padding:6px 10px;text-align:left">Shared With</th>
      </tr>
      ${txRows}
    </table>
    <h3>Settlements</h3>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb">
      <tr style="background:#f9fafb"><th style="padding:6px 10px;text-align:left">From</th><th style="padding:6px 10px;text-align:left">To</th><th style="padding:6px 10px;text-align:left">Amount</th></tr>
      ${sRows}
    </table>
    <p style="color:#9ca3af;font-size:12px;margin-top:24px">Sent via SplitEase</p>
  </div>`;
}

function buildWhatsAppText(title: string, total: number, settlements: Array<{ from: string; to: string; amount: number }>) {
  return [
    `*SplitEase: ${title}*`, `Total: $${total.toFixed(2)}`, '',
    '*Settlements:*',
    ...settlements.map((s) => `${s.from} → ${s.to}: $${s.amount.toFixed(2)}`),
    settlements.length === 0 ? '✅ All settled up!' : '',
  ].join('\n');
}

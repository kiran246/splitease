import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { calculateSplits } from '@/lib/split';

type Params = { params: Promise<{ id: string }> };

// Expected CSV columns (case-insensitive):
// Title | Amount | Paid By | Participants (comma-separated) | Split Type (equal|percentage) | Percentages (comma-separated, optional)
export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sheet = await prisma.expenseSheet.findFirst({
    where: { id, ownerId: session.user.id },
    include: { participants: true },
  });
  if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return NextResponse.json({ error: 'CSV must have a header row and at least one data row' }, { status: 400 });

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = {
    title: headers.indexOf('title'),
    amount: headers.indexOf('amount'),
    paidBy: headers.indexOf('paid by'),
    participants: headers.indexOf('participants'),
    splitType: headers.indexOf('split type'),
    percentages: headers.indexOf('percentages'),
  };

  if ([idx.title, idx.amount, idx.paidBy, idx.participants].includes(-1)) {
    return NextResponse.json({
      error: 'CSV must have columns: Title, Amount, Paid By, Participants',
    }, { status: 400 });
  }

  const participantMap = new Map(sheet.participants.map((p) => [p.name.toLowerCase(), p]));
  const imported: string[] = [];
  const skipped: Array<{ row: number; reason: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const title = cols[idx.title]?.trim();
    const amountRaw = cols[idx.amount]?.trim();
    const paidByName = cols[idx.paidBy]?.trim().toLowerCase();
    const participantNames = (cols[idx.participants] ?? '').split(';').map((n) => n.trim().toLowerCase()).filter(Boolean);
    const splitType = (cols[idx.splitType] ?? 'equal').trim().toLowerCase();
    const percentagesRaw = (cols[idx.percentages] ?? '').split(';').map((p) => p.trim()).filter(Boolean);

    if (!title) { skipped.push({ row: i + 1, reason: 'Missing title' }); continue; }
    const amount = parseFloat(amountRaw);
    if (isNaN(amount) || amount <= 0) { skipped.push({ row: i + 1, reason: 'Invalid amount' }); continue; }

    const payer = participantMap.get(paidByName);
    if (!payer) { skipped.push({ row: i + 1, reason: `Participant "${cols[idx.paidBy]}" not found in sheet` }); continue; }

    const splitParticipants = participantNames.length > 0
      ? participantNames.map((n) => participantMap.get(n)).filter(Boolean) as typeof sheet.participants
      : sheet.participants;

    if (splitParticipants.length === 0) { skipped.push({ row: i + 1, reason: 'No valid participants for split' }); continue; }

    let participantsInput: Array<{ id: string; percentage?: number }>;
    if (splitType === 'percentage' && percentagesRaw.length === splitParticipants.length) {
      participantsInput = splitParticipants.map((p, j) => ({ id: p.id, percentage: parseFloat(percentagesRaw[j]) }));
    } else {
      participantsInput = splitParticipants.map((p) => ({ id: p.id }));
    }

    try {
      const splits = calculateSplits({
        title, amount, paidById: payer.id,
        splitType: splitType === 'percentage' ? 'percentage' : 'equal',
        participants: participantsInput,
      });
      await prisma.transaction.create({
        data: { title, amount, paidById: payer.id, sheetId: id, splits: { create: splits } },
      });
      imported.push(title);
    } catch (err) {
      skipped.push({ row: i + 1, reason: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  return NextResponse.json({ imported: imported.length, skipped, importedTitles: imported });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; continue; }
    if (char === ',' && !inQuotes) { result.push(current); current = ''; continue; }
    current += char;
  }
  result.push(current);
  return result;
}

import Link from 'next/link';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { computeBalances, computeSettlements } from '@/lib/settlement';
import SettlementPanel from '@/components/settlement/SettlementPanel';
import TransactionList from '@/components/transactions/TransactionList';
import ExportPanel from '@/components/sheets/ExportPanel';
import ImportButton from '@/components/sheets/ImportButton';
import CollaboratorsPanel from '@/components/sheets/CollaboratorsPanel';

type Props = { params: Promise<{ id: string }> };

export default async function SheetDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user!.id!;

  const sheet = await prisma.expenseSheet.findFirst({
    where: {
      id,
      OR: [
        { ownerId: userId },
        { collaborators: { some: { userId } } },
      ],
    },
    include: {
      participants: true,
      transactions: {
        include: {
          paidBy: true,
          splits: { include: { participant: true } },
          comments: { select: { authorId: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!sheet) notFound();

  const isOwner = sheet.ownerId === userId;

  const balances = computeBalances(sheet.transactions, sheet.participants);
  const settlements = computeSettlements(balances);
  const totalExpense = sheet.transactions.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/dashboard" className="hover:text-indigo-600">Dashboard</Link>
            <span>/</span>
            <span>{sheet.title}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{sheet.title}</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/sheets/${id}/edit`}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition"
          >
            Edit Sheet
          </Link>
          <ImportButton sheetId={id} />
          <Link
            href={`/sheets/${id}/transactions/new`}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            + Add Expense
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {sheet.participants.map((p) => (
          <span
            key={p.id}
            className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 rounded-full px-3 py-1 text-sm font-medium"
          >
            <span className="w-6 h-6 bg-indigo-200 rounded-full flex items-center justify-center text-xs font-bold">
              {p.name.slice(0, 2).toUpperCase()}
            </span>
            {p.name}
          </span>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
            <span className="text-sm text-gray-500">
              Total: <span className="font-semibold text-gray-900">${totalExpense.toFixed(2)}</span>
            </span>
          </div>
          <TransactionList
            transactions={sheet.transactions}
            sheetId={id}
            isCollaborative={sheet.isCollaborative}
            currentUserId={userId}
          />
        </div>

        <div className="space-y-4">
          <SettlementPanel
            balances={balances}
            settlements={settlements}
            participants={sheet.participants}
          />
          <ExportPanel sheetId={id} />
          {sheet.isCollaborative && (
            <CollaboratorsPanel sheetId={id} isOwner={isOwner} />
          )}
        </div>
      </div>
    </div>
  );
}

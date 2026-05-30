import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import BulkEntryGrid from './BulkEntryGrid';

type Props = { params: Promise<{ id: string }> };

export default async function BulkEntryPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user!.id!;

  const sheet = await prisma.expenseSheet.findFirst({
    where: {
      id,
      OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }],
    },
    include: { participants: { select: { id: true, name: true } } },
  });

  if (!sheet) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/sheets/${id}`} className="text-sm text-gray-500 hover:text-gray-900 transition">
          ← {sheet.title}
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Bulk Expense Entry</h1>
      </div>
      <p className="text-sm text-gray-500">
        Fill in multiple expenses at once. Enter how much each person owes per expense, then click Save All.
      </p>
      <BulkEntryGrid sheetId={id} participants={sheet.participants} />
    </div>
  );
}

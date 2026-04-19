import Link from 'next/link';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function DashboardPage() {
  const session = await auth();
  const sheets = await prisma.expenseSheet.findMany({
    where: { ownerId: session!.user!.id! },
    include: {
      participants: true,
      _count: { select: { transactions: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Expense Sheets</h1>
        <Link
          href="/sheets/new"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
        >
          + New Sheet
        </Link>
      </div>

      {sheets.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-4">📋</p>
          <p className="text-lg font-medium">No expense sheets yet</p>
          <p className="text-sm mt-1">Create your first sheet to start splitting expenses.</p>
          <Link
            href="/sheets/new"
            className="mt-4 inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Create Sheet
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sheets.map((sheet) => (
            <Link
              key={sheet.id}
              href={`/sheets/${sheet.id}`}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition space-y-3"
            >
              <h2 className="text-lg font-semibold text-gray-900 truncate">{sheet.title}</h2>
              <div className="flex gap-4 text-sm text-gray-500">
                <span>👥 {sheet.participants.length} people</span>
                <span>💸 {sheet._count.transactions} transactions</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {sheet.participants.slice(0, 5).map((p) => (
                  <span
                    key={p.id}
                    className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center"
                  >
                    {p.name.slice(0, 2).toUpperCase()}
                  </span>
                ))}
                {sheet.participants.length > 5 && (
                  <span className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center">
                    +{sheet.participants.length - 5}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                Updated {new Date(sheet.updatedAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

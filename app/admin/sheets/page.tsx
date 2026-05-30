import { prisma } from '@/lib/db';
import SheetsTable from './SheetsTable';

export default async function AdminSheetsPage() {
  const [sheets, users] = await Promise.all([
    prisma.expenseSheet.findMany({
      select: {
        id: true,
        title: true,
        isCollaborative: true,
        createdAt: true,
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { transactions: true, collaborators: true, participants: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sheets</h1>
        <p className="text-sm text-gray-500 mt-0.5">{sheets.length} total</p>
      </div>
      <SheetsTable sheets={sheets} users={users} />
    </div>
  );
}

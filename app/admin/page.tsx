import { prisma } from '@/lib/db';
import Link from 'next/link';

const actionLabels: Record<string, string> = {
  enable_user: 'Enabled',
  disable_user: 'Disabled',
  impersonate: 'Impersonated',
  reset_password: 'Reset password for',
  delete_sheet: 'Deleted a sheet owned by',
  clear_user_sheets: 'Cleared all sheets for',
};

export default async function AdminOverviewPage() {
  const [totalUsers, activeUsers, totalSheets, recentLogs] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.expenseSheet.count(),
    prisma.adminAuditLog.findMany({ take: 10, orderBy: { createdAt: 'desc' } }),
  ]);

  const targetIds = [...new Set(recentLogs.map((l) => l.targetUserId))];
  const targetUsers = await prisma.user.findMany({
    where: { id: { in: targetIds } },
    select: { id: true, name: true },
  });
  const userMap = Object.fromEntries(targetUsers.map((u) => [u.id, u.name]));

  const stats = [
    { label: 'Total Users', value: totalUsers, bg: 'bg-indigo-50', text: 'text-indigo-700' },
    { label: 'Active', value: activeUsers, bg: 'bg-green-50', text: 'text-green-700' },
    { label: 'Inactive', value: totalUsers - activeUsers, bg: 'bg-red-50', text: 'text-red-700' },
    { label: 'Total Sheets', value: totalSheets, bg: 'bg-purple-50', text: 'text-purple-700' },
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">Platform health at a glance</p>
        </div>
        <Link
          href="/admin/users/new"
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition"
        >
          + New User
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-xl p-5 ${s.bg}`}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.text}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Activity</h2>
          <Link href="/admin/users" className="text-xs text-indigo-600 hover:underline">
            Manage users →
          </Link>
        </div>
        {recentLogs.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-400">No activity yet</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentLogs.map((log) => (
              <li key={log.id} className="px-6 py-3 flex items-center justify-between gap-4">
                <span className="text-sm text-gray-700">
                  <span className="font-medium">{actionLabels[log.action] ?? log.action}</span>{' '}
                  {userMap[log.targetUserId] ?? log.targetUserId}
                </span>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

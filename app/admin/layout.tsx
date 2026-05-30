import { auth, signOut } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AdminNav from './AdminNav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'admin') redirect('/dashboard');

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-200">
          <Link href="/admin" className="text-lg font-bold text-indigo-700">
            SplitEase
          </Link>
          <p className="text-xs text-gray-400 mt-0.5">Admin Console</p>
        </div>
        <AdminNav />
        <div className="px-5 py-4 border-t border-gray-200 mt-auto">
          <p className="text-xs font-medium text-gray-700 truncate">{session.user.name}</p>
          <p className="text-xs text-gray-400 truncate">{session.user.email}</p>
          <div className="flex gap-3 mt-3">
            <Link href="/dashboard" className="text-xs text-gray-500 hover:text-indigo-600 transition">
              ← App
            </Link>
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/login' });
              }}
            >
              <button type="submit" className="text-xs text-gray-500 hover:text-red-600 transition">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0 px-8 py-8">{children}</main>
    </div>
  );
}

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const user = session.user as {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        userName={user.name || undefined}
        userEmail={user.email || undefined}
        userRole={user.role || undefined}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

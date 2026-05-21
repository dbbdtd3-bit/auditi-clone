import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { AssistantBubble } from '@/components/assistant/assistant-bubble';

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
    <div className="flex h-screen flex-col bg-dataly-paper">
      <TopBar
        user={{
          name: user.name ?? undefined,
          email: user.email ?? undefined,
          role: user.role ?? undefined,
        }}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role={user.role ?? undefined} />
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Breadcrumb slot: pages render <Breadcrumbs> as first child */}
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
      <AssistantBubble
        userId={user.id ?? ''}
        userRole={user.role ?? ''}
      />
    </div>
  );
}

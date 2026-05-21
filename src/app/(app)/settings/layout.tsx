import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SettingsNav } from '@/components/settings/settings-nav';

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const user = session.user as { role?: string };
  const isAdmin = user.role === 'WP_ADMIN';

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-dataly-line bg-dataly-surface px-6 py-4">
        <h1 className="text-xl font-semibold text-dataly-ink">Einstellungen</h1>
        <SettingsNav isAdmin={isAdmin} />
      </div>
      <div className="flex-1 overflow-y-auto bg-dataly-paper p-6">{children}</div>
    </div>
  );
}

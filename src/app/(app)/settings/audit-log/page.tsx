import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AuditLogSettingsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const user = session.user as { role?: string };
  if (user.role !== 'WP_ADMIN') redirect('/settings/team');

  return (
    <div className="max-w-3xl">
      <h2 className="text-base font-semibold text-slate-900 mb-1">Änderungsmanagement</h2>
      <p className="text-sm text-slate-500">Wird in Phase 3 implementiert.</p>
    </div>
  );
}

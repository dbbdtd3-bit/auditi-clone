import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AuditLogTable } from '@/components/settings/audit-log-table';

export default async function AuditLogSettingsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const user = session.user as { role?: string };
  if (user.role !== 'WP_ADMIN') redirect('/settings/team');

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-0.5">Änderungsmanagement</h2>
        <p className="text-sm text-slate-500">
          Alle Änderungen im System nachverfolgen und rückgängig machen.
        </p>
      </div>
      <AuditLogTable />
    </div>
  );
}

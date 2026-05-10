'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PendingUsersTable } from '@/components/settings/pending-users-table';
import { ActiveUsersTabs } from '@/components/settings/active-users-tabs';
import { Loader2, UserCheck, Users } from 'lucide-react';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  kind: 'WP' | 'CLIENT';
  teams: { team: { id: string; name: string } }[];
  mandanten: { mandant: { id: string; name: string } }[];
  createdAt: string;
};

export default function SecuritySettingsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.status === 403 || res.status === 401) {
        setIsAdmin(false);
        return;
      }
      setIsAdmin(true);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (isAdmin === false) {
      router.replace('/settings/team');
    }
  }, [isAdmin, router]);

  const pendingUsers = users.filter((u) => u.status === 'PENDING');
  const activeUsers = users.filter((u) => u.status !== 'PENDING');

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 py-12 justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Laden...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-0.5">Login & Sicherheit</h2>
        <p className="text-sm text-slate-500">Registrierungsanfragen prüfen und Benutzer verwalten.</p>
      </div>

      {/* Pending section */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <UserCheck className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-slate-800">
            Ausstehende Anfragen
            {pendingUsers.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5">
                {pendingUsers.length}
              </span>
            )}
          </h3>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <PendingUsersTable users={pendingUsers} onRefresh={fetchUsers} />
        </div>
      </section>

      {/* Active users section */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800">Benutzer</h3>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <ActiveUsersTabs users={activeUsers} onRefresh={fetchUsers} />
        </div>
      </section>
    </div>
  );
}

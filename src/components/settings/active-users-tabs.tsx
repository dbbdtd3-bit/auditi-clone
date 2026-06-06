'use client';

import { useState } from 'react';
import { ActiveUsersTable } from './active-users-table';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  kind: 'WP' | 'CLIENT';
  teams: { team: { id: string; name: string } }[];
  mandanten: { role: 'MANDANT_ADMIN' | 'MANDANT_USER'; mandant: { id: string; name: string } }[];
  createdAt: string;
};

interface ActiveUsersTabsProps {
  users: User[];
  onRefresh: () => void;
}

export function ActiveUsersTabs({ users, onRefresh }: ActiveUsersTabsProps) {
  const [activeTab, setActiveTab] = useState<'WP' | 'CLIENT'>('WP');

  const wpUsers = users.filter((u) => u.kind === 'WP');
  const clientUsers = users.filter((u) => u.kind === 'CLIENT');

  return (
    <div>
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setActiveTab('WP')}
          className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
            activeTab === 'WP'
              ? 'bg-dataly-navy text-white'
              : 'text-dataly-slate hover:bg-dataly-surface-subtle'
          }`}
        >
          Kanzlei-Mitarbeiter
          <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'WP' ? 'bg-dataly-ink/40' : 'bg-dataly-surface-subtle text-dataly-muted'}`}>
            {wpUsers.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('CLIENT')}
          className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
            activeTab === 'CLIENT'
              ? 'bg-dataly-navy text-white'
              : 'text-dataly-slate hover:bg-dataly-surface-subtle'
          }`}
        >
          Mandanten
          <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'CLIENT' ? 'bg-dataly-ink/40' : 'bg-dataly-surface-subtle text-dataly-muted'}`}>
            {clientUsers.length}
          </span>
        </button>
      </div>

      <ActiveUsersTable
        users={activeTab === 'WP' ? wpUsers : clientUsers}
        kind={activeTab}
        onRefresh={onRefresh}
      />
    </div>
  );
}

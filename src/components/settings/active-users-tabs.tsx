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
  mandanten: { mandant: { id: string; name: string } }[];
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
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Kanzlei-Mitarbeiter
          <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'WP' ? 'bg-slate-700' : 'bg-slate-200 text-slate-500'}`}>
            {wpUsers.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('CLIENT')}
          className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
            activeTab === 'CLIENT'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Mandanten
          <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'CLIENT' ? 'bg-slate-700' : 'bg-slate-200 text-slate-500'}`}>
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

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserTeams, getAllTeams } from '@/lib/teams';
import { TeamProfileView } from '@/components/settings/team-profile-view';

export default async function TeamSettingsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const user = session.user as { id?: string; role?: string };
  const userId = user.id!;
  const isAdmin = user.role === 'WP_ADMIN';

  const teams = isAdmin ? await getAllTeams() : await getUserTeams(userId);

  return (
    <TeamProfileView
      teams={teams}
      currentUserId={userId}
      isAdmin={isAdmin}
    />
  );
}

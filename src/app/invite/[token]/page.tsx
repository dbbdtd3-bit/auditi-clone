import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { AcceptInviteForm } from '@/components/auth/accept-invite-form';

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <AuthShell
      title="Einladung annehmen"
      description="Legen Sie Ihr Passwort fest, um den Mandantenbereich direkt zu aktivieren."
      footer={
        <p className="text-center text-sm text-dataly-slate">
          Bereits aktiviert?{' '}
          <Link href="/login" className="font-semibold text-dataly-blue underline-offset-4 hover:underline">
            Anmelden
          </Link>
        </p>
      }
    >
      <AcceptInviteForm token={token} />
    </AuthShell>
  );
}


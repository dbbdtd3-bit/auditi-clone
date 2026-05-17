import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <AuthShell
      title="Anmelden"
      description="Melden Sie sich mit Ihrem freigegebenen Kanzlei- oder Mandantenkonto an."
      footer={
        <p className="text-center text-sm text-dataly-slate">
          Noch kein Konto?{' '}
          <Link href="/register" className="font-semibold text-dataly-blue underline-offset-4 hover:underline">
            Registrierung anfragen
          </Link>
        </p>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}

import { ShieldCheck } from 'lucide-react';
import { LoginForm } from '@/components/auth/login-form';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 px-8 py-8 text-center">
            <div className="flex justify-center mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
                <ShieldCheck className="h-7 w-7 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Auditi</h1>
            <p className="mt-1 text-slate-400 text-sm">Prüfungsplattform für WP &amp; StB</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Anmelden</h2>
              <p className="text-sm text-slate-500 mt-1">
                Melden Sie sich mit Ihren Zugangsdaten an.
              </p>
            </div>

            <LoginForm />

            <p className="mt-6 text-center text-sm text-slate-500">
              Noch kein Konto?{' '}
              <Link href="/register" className="text-blue-700 hover:underline font-medium">
                Registrieren
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Auditi &mdash; Vertraulich &amp; sicher
        </p>
      </div>
    </div>
  );
}

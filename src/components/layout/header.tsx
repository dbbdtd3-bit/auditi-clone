import { auth } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';

interface HeaderProps {
  title: string;
  description?: string;
}

export async function Header({ title, description }: HeaderProps) {
  const session = await auth();

  const roleLabel: Record<string, string> = {
    WP_ADMIN: 'WP-Administrator',
    WP_TEAM: 'WP-Team',
    MANDANT_ADMIN: 'Mandant Admin',
    MANDANT_USER: 'Mandant',
  };

  const userRole = (session?.user as { role?: string })?.role;

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {description && (
          <p className="text-sm text-slate-500">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {userRole && (
          <Badge variant="secondary">
            {roleLabel[userRole] || userRole}
          </Badge>
        )}
        <div className="text-sm text-slate-600">
          {session?.user?.name || session?.user?.email}
        </div>
      </div>
    </header>
  );
}

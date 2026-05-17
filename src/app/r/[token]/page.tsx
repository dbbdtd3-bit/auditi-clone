import { ResponsePortal } from '@/components/public-response/response-portal';
import { getPublicPortalResult } from '@/lib/public-response';

interface PublicResponsePageProps {
  params: Promise<{ token: string }>;
}

export default async function PublicResponsePage({ params }: PublicResponsePageProps) {
  const { token } = await params;
  const initialResult = await getPublicPortalResult(token).catch(() => ({
    state: 'error' as const,
    message: 'Das Antwortportal ist vorübergehend nicht erreichbar. Bitte versuchen Sie es später erneut.',
  }));

  return <ResponsePortal token={token} initialResult={initialResult} />;
}

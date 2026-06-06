import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';
import { canAccessWorkspace, getListWorkspaceId } from '@/lib/pbc-access';
import { enqueuePbcMandantNotification } from '@/lib/queue';
import { recordAudit } from '@/lib/audit';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!isWpUser(user)) return forbidden();

  const { listId } = await params;
  const workspaceId = await getListWorkspaceId(listId);
  if (!workspaceId) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  if (!await canAccessWorkspace(user.id, true, workspaceId)) return forbidden();

  await enqueuePbcMandantNotification(listId);

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: 'PBC_MANDANT_NOTIFIED',
    entityType: 'PbcRequestList',
    entityId: listId,
  });

  return NextResponse.json({ queued: true });
}


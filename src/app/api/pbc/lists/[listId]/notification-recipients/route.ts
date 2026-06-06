import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';
import { canAccessWorkspace, getListWorkspaceId } from '@/lib/pbc-access';
import { recordAudit } from '@/lib/audit';

type Audience = 'KANZLEI_UPLOADS' | 'MANDANT_REQUESTS';

async function getListContext(listId: string) {
  return prisma.pbcRequestList.findUnique({
    where: { id: listId },
    include: {
      workspace: { include: { engagement: true } },
    },
  });
}

async function canManageAudience(
  user: { id: string; role?: string },
  listId: string,
  audience: Audience
) {
  const list = await getListContext(listId);
  if (!list) return { ok: false as const, list: null };

  const wp = isWpUser(user);
  if (!await canAccessWorkspace(user.id, wp, list.workspaceId)) {
    return { ok: false as const, list };
  }

  if (audience === 'KANZLEI_UPLOADS') {
    return { ok: wp, list };
  }

  if (wp) {
    return { ok: user.role === 'WP_ADMIN' || list.createdById === user.id, list };
  }

  const mandantAdmin = await prisma.userMandant.findFirst({
    where: {
      mandantId: list.workspace.engagement.mandantId,
      userId: user.id,
      role: 'MANDANT_ADMIN',
    },
  });
  return { ok: mandantAdmin !== null, list };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { listId } = await params;
  const workspaceId = await getListWorkspaceId(listId);
  if (!workspaceId) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  if (!await canAccessWorkspace(user.id, isWpUser(user), workspaceId)) return forbidden();

  const list = await getListContext(listId);
  if (!list) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

  const [recipients, wpUsers, mandantUsers] = await Promise.all([
    prisma.pbcListNotificationRecipient.findMany({
      where: { listId },
      include: { user: { select: { id: true, name: true, email: true, status: true, kind: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.user.findMany({
      where: { kind: 'WP', status: 'ACTIVE' },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
    prisma.userMandant.findMany({
      where: {
        mandantId: list.workspace.engagement.mandantId,
        user: { status: 'ACTIVE' },
      },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: 'asc' } },
    }),
  ]);

  return NextResponse.json({
    recipients,
    candidates: {
      kanzlei: wpUsers,
      mandant: mandantUsers.map((link) => ({ ...link.user, mandantRole: link.role })),
    },
    permissions: {
      canManageKanzlei: isWpUser(user),
      canManageMandant:
        user.role === 'WP_ADMIN' ||
        list.createdById === user.id ||
        mandantUsers.some((link) => link.userId === user.id && link.role === 'MANDANT_ADMIN'),
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { listId } = await params;
  const body = await req.json();
  const audience = body.audience === 'MANDANT_REQUESTS' ? 'MANDANT_REQUESTS' : 'KANZLEI_UPLOADS';
  const userIds = Array.isArray(body.userIds)
    ? body.userIds.filter((id: unknown): id is string => typeof id === 'string')
    : [];

  const permission = await canManageAudience(user, listId, audience);
  if (!permission.list) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  if (!permission.ok) return forbidden();

  await prisma.$transaction(async (tx) => {
    await tx.pbcListNotificationRecipient.deleteMany({ where: { listId, audience } });
    if (userIds.length > 0) {
      await tx.pbcListNotificationRecipient.createMany({
        data: userIds.map((userId: string) => ({ listId, userId, audience })),
        skipDuplicates: true,
      });
    }
  });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: 'PBC_LIST_RECIPIENTS_UPDATED',
    entityType: 'PbcRequestList',
    entityId: listId,
    details: { audience, userIds },
  });

  return NextResponse.json({ ok: true });
}

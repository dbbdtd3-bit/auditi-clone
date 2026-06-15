import { prisma } from './db';

export type PbcAssigneeAudience = 'MANDANT' | 'KANZLEI' | 'WORKSPACE';

export type PbcAssigneeOption = {
  id: string;
  value: string;
  name: string;
  email: string | null;
  audience: PbcAssigneeAudience;
  source: string;
};

type UserCandidate = {
  id: string;
  name: string;
  email: string;
};

const AUDIENCE_ORDER: Record<PbcAssigneeAudience, number> = {
  MANDANT: 0,
  KANZLEI: 1,
  WORKSPACE: 2,
};

function cleanDisplayValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function addUserOption(
  options: PbcAssigneeOption[],
  seenUsers: Set<string>,
  user: UserCandidate,
  audience: PbcAssigneeAudience,
  source: string
) {
  const value = cleanDisplayValue(user.name);
  if (!value || seenUsers.has(user.id)) return;

  seenUsers.add(user.id);
  options.push({
    id: user.id,
    value,
    name: value,
    email: user.email,
    audience,
    source,
  });
}

export function normalizePbcAssigneeValue(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const normalized = cleanDisplayValue(value);
  return normalized || null;
}

export async function getPbcListAssigneeOptions(
  listId: string
): Promise<PbcAssigneeOption[] | null> {
  const list = await prisma.pbcRequestList.findUnique({
    where: { id: listId },
    select: {
      workspaceId: true,
      workspace: {
        select: {
          engagement: {
            select: {
              mandantId: true,
              mandant: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!list) return null;

  const mandantId = list.workspace.engagement.mandantId;
  const mandantName = cleanDisplayValue(list.workspace.engagement.mandant.name);

  const [workspaceMembers, linkedMandantUsers, legacyMandantUsers, teamMembers] =
    await Promise.all([
      prisma.pbcMember.findMany({
        where: { workspaceId: list.workspaceId, user: { status: 'ACTIVE' } },
        include: { user: { select: { id: true, name: true, email: true, kind: true } } },
        orderBy: { user: { name: 'asc' } },
      }),
      prisma.userMandant.findMany({
        where: { mandantId, user: { status: 'ACTIVE' } },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { user: { name: 'asc' } },
      }),
      prisma.user.findMany({
        where: { mandantId, status: 'ACTIVE' },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      }),
      prisma.teamMember.findMany({
        where: {
          team: { mandanten: { some: { mandantId } } },
          user: { status: 'ACTIVE', kind: 'WP' },
        },
        include: {
          team: { select: { name: true } },
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ team: { name: 'asc' } }, { user: { name: 'asc' } }],
      }),
    ]);

  const options: PbcAssigneeOption[] = [];
  const seenUsers = new Set<string>();

  if (mandantName) {
    options.push({
      id: `mandant:${list.workspace.engagement.mandant.id}`,
      value: mandantName,
      name: mandantName,
      email: null,
      audience: 'MANDANT',
      source: 'Mandant',
    });
  }

  for (const link of linkedMandantUsers) {
    addUserOption(options, seenUsers, link.user, 'MANDANT', 'Mandantenzugriff');
  }

  for (const user of legacyMandantUsers) {
    addUserOption(options, seenUsers, user, 'MANDANT', 'Mandantenzugriff');
  }

  for (const member of teamMembers) {
    addUserOption(
      options,
      seenUsers,
      member.user,
      'KANZLEI',
      `Kanzlei-Team: ${member.team.name}`
    );
  }

  for (const member of workspaceMembers) {
    addUserOption(
      options,
      seenUsers,
      member.user,
      member.user.kind === 'WP' ? 'KANZLEI' : 'MANDANT',
      `PBC-Zugriff: ${member.role}`
    );
  }

  return options.sort((a, b) => {
    const audience = AUDIENCE_ORDER[a.audience] - AUDIENCE_ORDER[b.audience];
    if (audience !== 0) return audience;
    return a.name.localeCompare(b.name, 'de');
  });
}

export async function isAllowedPbcAssignee(
  listId: string,
  value: string | null
): Promise<boolean> {
  if (!value) return true;
  const options = await getPbcListAssigneeOptions(listId);
  if (!options) return false;
  return options.some((option) => option.value === value);
}

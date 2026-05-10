import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import type { AzureTool } from './azure';
import type { SessionUser } from '@/lib/require-auth';

export const ASSISTANT_TOOLS: AzureTool[] = [
  {
    type: 'function',
    function: {
      name: 'lookup_mandant',
      description: 'Sucht Mandanten anhand von Name oder Stichwort. Gibt die Top-5-Treffer zurück.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Suchbegriff, z. B. Firmenname oder Teil davon' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lookup_engagement',
      description: 'Sucht Engagements (Jahresabschlussprüfungen, Sonderprüfungen etc.). Kann nach Mandant oder Geschäftsjahr filtern.',
      parameters: {
        type: 'object',
        properties: {
          mandantId: { type: 'string', description: 'ID des Mandanten (optional)' },
          query: { type: 'string', description: 'Textsuchbegriff im Titel (optional)' },
          fiscalYear: { type: 'number', description: 'Geschäftsjahr, z. B. 2024 (optional)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lookup_user',
      description: 'Sucht Benutzer innerhalb der gleichen Teams oder Mandanten wie der anfragende Benutzer.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Name oder E-Mail des gesuchten Benutzers' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_pbc_lists',
      description: 'Listet alle PBC-Anforderungslisten eines Engagements auf.',
      parameters: {
        type: 'object',
        properties: {
          engagementId: { type: 'string', description: 'ID des Engagements' },
        },
        required: ['engagementId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'summarize_engagement',
      description: 'Gibt eine Zusammenfassung eines Engagements zurück: PBC-Zählungen (offen, hochgeladen, akzeptiert, überfällig), Kampagnen-Status.',
      parameters: {
        type: 'object',
        properties: {
          engagementId: { type: 'string', description: 'ID des Engagements' },
        },
        required: ['engagementId'],
      },
    },
  },
];

export type ToolResult = {
  success: boolean;
  data?: unknown;
  error?: string;
};

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  caller: SessionUser,
): Promise<ToolResult> {
  try {
    switch (name) {
      case 'lookup_mandant':
        return await toolLookupMandant(args.query as string, caller);
      case 'lookup_engagement':
        return await toolLookupEngagement(args, caller);
      case 'lookup_user':
        return await toolLookupUser(args.query as string, caller);
      case 'list_pbc_lists':
        return await toolListPbcLists(args.engagementId as string, caller);
      case 'summarize_engagement':
        return await toolSummarizeEngagement(args.engagementId as string, caller);
      default:
        return { success: false, error: `Unbekanntes Tool: ${name}` };
    }
  } catch (err) {
    console.error(`Tool ${name} Fehler:`, err);
    return { success: false, error: err instanceof Error ? err.message : 'Interner Fehler' };
  }
}

async function toolLookupMandant(query: string, caller: SessionUser): Promise<ToolResult> {
  const isWp = ['WP_ADMIN', 'WP_TEAM'].includes(caller.role ?? '');

  if (isWp) {
    const mandanten = await prisma.mandant.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { legalName: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, legalName: true, taxId: true },
      take: 5,
      orderBy: { name: 'asc' },
    });
    return { success: true, data: mandanten };
  }

  // Mandanten-User: nur eigene Mandanten durchsuchen
  const links = await prisma.userMandant.findMany({
    where: { userId: caller.id },
    include: { mandant: { select: { id: true, name: true, legalName: true } } },
  });
  const filtered = links
    .map((l) => l.mandant)
    .filter(
      (m) =>
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        (m.legalName && m.legalName.toLowerCase().includes(query.toLowerCase())),
    );
  return { success: true, data: filtered.slice(0, 5) };
}

async function toolLookupEngagement(
  args: Record<string, unknown>,
  caller: SessionUser,
): Promise<ToolResult> {
  const { mandantId, query, fiscalYear } = args as {
    mandantId?: string;
    query?: string;
    fiscalYear?: number;
  };

  const isWp = ['WP_ADMIN', 'WP_TEAM'].includes(caller.role ?? '');

  let mandantFilter: Prisma.EngagementWhereInput['mandantId'] = mandantId ?? undefined;

  if (!isWp) {
    const links = await prisma.userMandant.findMany({
      where: { userId: caller.id },
      select: { mandantId: true },
    });
    const allowed = links.map((l) => l.mandantId);
    mandantFilter = mandantId && allowed.includes(mandantId) ? mandantId : { in: allowed };
  }

  const where: Prisma.EngagementWhereInput = {
    ...(mandantFilter !== undefined ? { mandantId: mandantFilter } : {}),
    ...(fiscalYear ? { fiscalYear } : {}),
    ...(query ? { title: { contains: query, mode: 'insensitive' } } : {}),
  };

  const engagements = await prisma.engagement.findMany({
    where,
    include: { mandant: { select: { name: true } } },
    take: 10,
    orderBy: [{ fiscalYear: 'desc' }, { createdAt: 'desc' }],
  });

  return {
    success: true,
    data: engagements.map((e) => ({
      id: e.id,
      title: e.title,
      fiscalYear: e.fiscalYear,
      type: e.type,
      status: e.status,
      mandant: e.mandant.name,
    })),
  };
}

async function toolLookupUser(query: string, caller: SessionUser): Promise<ToolResult> {
  const isWp = ['WP_ADMIN', 'WP_TEAM'].includes(caller.role ?? '');

  if (isWp) {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, email: true, role: true, status: true },
      take: 10,
      orderBy: { name: 'asc' },
    });
    return { success: true, data: users };
  }

  // Mandanten-User: nur gleiche Mandanten-Kollegen
  const links = await prisma.userMandant.findMany({
    where: { userId: caller.id },
    select: { mandantId: true },
  });
  const mandantIds = links.map((l) => l.mandantId);

  const users = await prisma.user.findMany({
    where: {
      mandanten: { some: { mandantId: { in: mandantIds } } },
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, email: true, role: true },
    take: 10,
    orderBy: { name: 'asc' },
  });
  return { success: true, data: users };
}

async function toolListPbcLists(engagementId: string, caller: SessionUser): Promise<ToolResult> {
  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
    include: { pbcWorkspace: { include: { requestLists: { include: { _count: { select: { items: true } } } } } } },
  });

  if (!engagement) return { success: false, error: 'Engagement nicht gefunden.' };

  // Permission: WP immer, Mandant nur wenn eigener Mandant
  const isWp = ['WP_ADMIN', 'WP_TEAM'].includes(caller.role ?? '');
  if (!isWp) {
    const link = await prisma.userMandant.findUnique({
      where: { userId_mandantId: { userId: caller.id, mandantId: engagement.mandantId } },
    });
    if (!link) return { success: false, error: 'Kein Zugriff auf dieses Engagement.' };
  }

  const lists = engagement.pbcWorkspace?.requestLists ?? [];
  return {
    success: true,
    data: lists.map((l) => ({
      id: l.id,
      title: l.title,
      description: l.description,
      itemCount: l._count.items,
    })),
  };
}

async function toolSummarizeEngagement(
  engagementId: string,
  caller: SessionUser,
): Promise<ToolResult> {
  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
    include: {
      mandant: { select: { name: true } },
      pbcWorkspace: {
        include: {
          requestLists: {
            include: {
              items: { select: { status: true, dueDate: true } },
            },
          },
        },
      },
      campaigns: { select: { id: true, title: true, status: true } },
    },
  });

  if (!engagement) return { success: false, error: 'Engagement nicht gefunden.' };

  const isWp = ['WP_ADMIN', 'WP_TEAM'].includes(caller.role ?? '');
  if (!isWp) {
    const link = await prisma.userMandant.findUnique({
      where: { userId_mandantId: { userId: caller.id, mandantId: engagement.mandantId } },
    });
    if (!link) return { success: false, error: 'Kein Zugriff auf dieses Engagement.' };
  }

  const now = new Date();
  const allItems = engagement.pbcWorkspace?.requestLists.flatMap((l) => l.items) ?? [];

  const counts = {
    open: allItems.filter((i) => i.status === 'OPEN').length,
    uploaded: allItems.filter((i) => i.status === 'UPLOADED').length,
    accepted: allItems.filter((i) => i.status === 'ACCEPTED').length,
    needsRevision: allItems.filter((i) => i.status === 'NEEDS_REVISION').length,
    rejected: allItems.filter((i) => i.status === 'REJECTED').length,
    overdue: allItems.filter(
      (i) => i.dueDate && i.dueDate < now && !['ACCEPTED', 'REJECTED'].includes(i.status),
    ).length,
    total: allItems.length,
  };

  return {
    success: true,
    data: {
      id: engagement.id,
      title: engagement.title,
      fiscalYear: engagement.fiscalYear,
      type: engagement.type,
      status: engagement.status,
      mandant: engagement.mandant.name,
      pbc: counts,
      listCount: engagement.pbcWorkspace?.requestLists.length ?? 0,
      campaigns: engagement.campaigns.map((c) => ({ id: c.id, title: c.title, status: c.status })),
    },
  };
}

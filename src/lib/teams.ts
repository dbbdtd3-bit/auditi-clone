import { prisma } from './db';

export { TEAM_COLOR_HEX, TEAM_COLOR_LABEL } from './team-colors';

export async function getUserTeams(userId: string) {
  return prisma.team.findMany({
    where: { members: { some: { userId } } },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      },
      mandanten: {
        include: {
          mandant: { select: { id: true, name: true, legalName: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getAllTeams() {
  return prisma.team.findMany({
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      },
      mandanten: {
        include: {
          mandant: { select: { id: true, name: true, legalName: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

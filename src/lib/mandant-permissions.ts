import { prisma } from './db';
import type { SessionUser } from './require-auth';

export async function canViewMandant(user: SessionUser, mandantId: string): Promise<boolean> {
  if (user.role === 'WP_ADMIN') return true;

  if (user.role === 'WP_TEAM') {
    const count = await prisma.teamMandant.count({
      where: {
        mandantId,
        team: { members: { some: { userId: user.id } } },
      },
    });
    return count > 0;
  }

  const count = await prisma.userMandant.count({
    where: { mandantId, userId: user.id },
  });
  if (count > 0) return true;

  const legacy = await prisma.user.count({
    where: { id: user.id, mandantId },
  });
  return legacy > 0;
}

export async function canManageMandantUsers(
  user: SessionUser,
  mandantId: string
): Promise<boolean> {
  if (user.role === 'WP_ADMIN') return true;
  if (user.role === 'WP_TEAM') return canViewMandant(user, mandantId);

  const adminLink = await prisma.userMandant.findFirst({
    where: {
      mandantId,
      userId: user.id,
      role: 'MANDANT_ADMIN',
    },
  });
  return adminLink !== null;
}

export function normalizeMandantRole(role: unknown): 'MANDANT_ADMIN' | 'MANDANT_USER' {
  return role === 'MANDANT_ADMIN' ? 'MANDANT_ADMIN' : 'MANDANT_USER';
}


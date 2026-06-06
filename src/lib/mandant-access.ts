import type { Prisma } from '@prisma/client';
import type { SessionUser } from './require-auth';

export const WP_ROLES = ['WP_ADMIN', 'WP_TEAM'] as const;
export const CLIENT_ROLES = ['MANDANT_ADMIN', 'MANDANT_USER'] as const;

export function isWpRole(role?: string): boolean {
  return WP_ROLES.includes(role as (typeof WP_ROLES)[number]);
}

export function isClientRole(role?: string): boolean {
  return CLIENT_ROLES.includes(role as (typeof CLIENT_ROLES)[number]);
}

export function visibleMandantWhere(user: SessionUser): Prisma.MandantWhereInput {
  if (user.role === 'WP_ADMIN') return {};

  if (user.role === 'WP_TEAM') {
    return {
      teamLinks: {
        some: {
          team: {
            members: { some: { userId: user.id } },
          },
        },
      },
    };
  }

  return {
    OR: [
      { userLinks: { some: { userId: user.id } } },
      { users: { some: { id: user.id } } },
    ],
  };
}

export function visibleEngagementWhere(user: SessionUser): Prisma.EngagementWhereInput {
  return { mandant: visibleMandantWhere(user) };
}

export function visibleCampaignWhere(user: SessionUser): Prisma.ConfirmationCampaignWhereInput {
  return { engagement: visibleEngagementWhere(user) };
}

export function visiblePbcWorkspaceWhere(user: SessionUser): Prisma.PbcWorkspaceWhereInput {
  if (isWpRole(user.role)) {
    return { engagement: visibleEngagementWhere(user) };
  }

  return {
    OR: [
      { members: { some: { userId: user.id } } },
      { engagement: visibleEngagementWhere(user) },
    ],
  };
}


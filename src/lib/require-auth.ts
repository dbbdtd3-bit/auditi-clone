import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export type SessionUser = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
};

const WP_ROLES = ['WP_ADMIN', 'WP_TEAM'];

export async function getAuthUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as SessionUser;
}

export function isWpUser(user: SessionUser): boolean {
  return WP_ROLES.includes(user.role ?? '');
}

export function isAdmin(user: SessionUser): boolean {
  return user.role === 'WP_ADMIN';
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function requireAdmin(): Promise<SessionUser | NextResponse> {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!isAdmin(user)) return forbidden();
  return user;
}

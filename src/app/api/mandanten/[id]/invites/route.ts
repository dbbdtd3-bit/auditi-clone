import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { prisma } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden } from '@/lib/require-auth';
import { canManageMandantUsers, normalizeMandantRole } from '@/lib/mandant-permissions';
import { sendMandantInviteEmail } from '@/lib/email';
import { recordAudit } from '@/lib/audit';

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function appUrl(path: string) {
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3100';
  return `${base.replace(/\/$/, '')}${path}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;
  if (!await canManageMandantUsers(user, id)) return forbidden();

  const body = await req.json();
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const role = normalizeMandantRole(body.role);

  if (!name || !email || !email.includes('@')) {
    return NextResponse.json({ error: 'Name und gueltige E-Mail sind erforderlich' }, { status: 400 });
  }

  const mandant = await prisma.mandant.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!mandant) return NextResponse.json({ error: 'Mandant nicht gefunden' }, { status: 404 });

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await prisma.mandantInvite.create({
    data: {
      mandantId: id,
      createdById: user.id,
      name,
      email,
      role,
      tokenHash: tokenHash(token),
      expiresAt,
    },
  });

  const inviteUrl = appUrl(`/invite/${token}`);
  await sendMandantInviteEmail({
    to: email,
    name,
    mandantName: mandant.name,
    inviteUrl,
    expiresAt: expiresAt.toLocaleDateString('de-DE'),
  });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: 'MANDANT_INVITE_CREATED',
    entityType: 'Mandant',
    entityId: id,
    details: { inviteId: invite.id, email, role },
  });

  return NextResponse.json({ invite: { id: invite.id, email, role, expiresAt }, inviteUrl }, { status: 201 });
}


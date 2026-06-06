import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/audit';

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const invite = await prisma.mandantInvite.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { mandant: { select: { name: true } } },
  });

  if (!invite) return NextResponse.json({ error: 'Einladung nicht gefunden' }, { status: 404 });
  if (invite.status !== 'PENDING') {
    return NextResponse.json({ error: 'Einladung ist nicht mehr aktiv' }, { status: 409 });
  }
  if (invite.expiresAt < new Date()) {
    await prisma.mandantInvite.update({
      where: { id: invite.id },
      data: { status: 'EXPIRED' },
    });
    return NextResponse.json({ error: 'Einladung ist abgelaufen' }, { status: 403 });
  }

  return NextResponse.json({
    name: invite.name,
    email: invite.email,
    role: invite.role,
    mandantName: invite.mandant.name,
    expiresAt: invite.expiresAt,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json();
  const password = typeof body.password === 'string' ? body.password : '';
  const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';

  if (password.length < 8) {
    return NextResponse.json({ error: 'Das Passwort muss mindestens 8 Zeichen lang sein' }, { status: 400 });
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ error: 'Die Passwort-Bestaetigung stimmt nicht ueberein' }, { status: 400 });
  }

  const invite = await prisma.mandantInvite.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { mandant: { select: { name: true } } },
  });

  if (!invite) return NextResponse.json({ error: 'Einladung nicht gefunden' }, { status: 404 });
  if (invite.status !== 'PENDING') {
    return NextResponse.json({ error: 'Einladung ist nicht mehr aktiv' }, { status: 409 });
  }
  if (invite.expiresAt < new Date()) {
    await prisma.mandantInvite.update({
      where: { id: invite.id },
      data: { status: 'EXPIRED' },
    });
    return NextResponse.json({ error: 'Einladung ist abgelaufen' }, { status: 403 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email: invite.email } });

    if (existing?.kind === 'WP') {
      throw Object.assign(new Error('WP_USER_CONFLICT'), { code: 'WP_USER_CONFLICT' });
    }

    const globalRole =
      invite.role === 'MANDANT_ADMIN' || existing?.role === 'MANDANT_ADMIN'
        ? 'MANDANT_ADMIN'
        : 'MANDANT_USER';

    const dbUser = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            name: existing.name || invite.name,
            passwordHash,
            status: 'ACTIVE',
            kind: 'CLIENT',
            role: globalRole,
          },
        })
      : await tx.user.create({
          data: {
            email: invite.email,
            name: invite.name,
            passwordHash,
            status: 'ACTIVE',
            kind: 'CLIENT',
            role: globalRole,
          },
        });

    await tx.userMandant.upsert({
      where: { userId_mandantId: { userId: dbUser.id, mandantId: invite.mandantId } },
      create: { userId: dbUser.id, mandantId: invite.mandantId, role: invite.role },
      update: { role: invite.role },
    });

    await tx.mandantInvite.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });

    return dbUser;
  }).catch((error) => {
    if ((error as { code?: string }).code === 'WP_USER_CONFLICT') {
      return null;
    }
    throw error;
  });

  if (!result) {
    return NextResponse.json(
      { error: 'Diese E-Mail-Adresse ist bereits als Kanzlei-Benutzer registriert' },
      { status: 409 }
    );
  }

  await recordAudit({
    actorId: result.id,
    actorEmail: result.email,
    action: 'MANDANT_INVITE_ACCEPTED',
    entityType: 'Mandant',
    entityId: invite.mandantId,
    details: { inviteId: invite.id, role: invite.role },
  });

  return NextResponse.json({ ok: true, mandantName: invite.mandant.name });
}


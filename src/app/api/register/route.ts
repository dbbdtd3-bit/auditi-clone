import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, password, kind } = body as {
      email: string;
      name: string;
      password: string;
      kind?: string;
    };

    if (!email || !name || !password) {
      return NextResponse.json({ error: 'E-Mail, Name und Passwort sind erforderlich' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Das Passwort muss mindestens 8 Zeichen lang sein' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Diese E-Mail-Adresse ist bereits registriert' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userKind = kind === 'CLIENT' ? 'CLIENT' : 'WP';
    const defaultRole = userKind === 'CLIENT' ? 'MANDANT_USER' : 'WP_TEAM';

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        status: 'PENDING',
        kind: userKind as 'WP' | 'CLIENT',
        role: defaultRole as 'WP_TEAM' | 'MANDANT_USER',
      },
    });

    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: user.id,
      details: { name: user.name, kind: userKind },
    });

    return NextResponse.json({ message: 'Registrierung erfolgreich. Ihr Konto wartet auf Freischaltung.' }, { status: 201 });
  } catch (error) {
    console.error('POST /api/register error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

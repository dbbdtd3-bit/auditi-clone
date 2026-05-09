import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

const VALID_ROLES = ['WP_LEAD', 'WP_TEAM', 'MANDANT_ADMIN', 'MANDANT_UPLOADER'];

async function canAccessWorkspace(userId: string, isWp: boolean, workspaceId: string): Promise<boolean> {
  if (isWp) return true;
  const member = await prisma.pbcMember.findFirst({ where: { workspaceId, userId } });
  return member !== null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();

    const { workspaceId } = await params;

    if (!await canAccessWorkspace(user.id, isWpUser(user), workspaceId)) return forbidden();

    const members = await prisma.pbcMember.findMany({
      where: { workspaceId },
      include: { user: true },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error('GET /api/pbc/workspaces/[workspaceId]/members error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { workspaceId } = await params;
    const body = await req.json();
    const { email, role } = body as { email: string; role: string };

    if (!email || !role) {
      return NextResponse.json({ error: 'E-Mail und Rolle sind erforderlich' }, { status: 400 });
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Ungültige Rolle' }, { status: 400 });
    }

    const member = await prisma.$transaction(async (tx) => {
      let dbUser = await tx.user.findUnique({ where: { email } });

      if (!dbUser) {
        const tempPassword = randomBytes(16).toString('hex');
        const passwordHash = await bcrypt.hash(tempPassword, 12);

        dbUser = await tx.user.create({
          data: {
            email,
            name: email.split('@')[0],
            role: 'MANDANT_USER',
            passwordHash,
          },
        });
      }

      const existingMember = await tx.pbcMember.findFirst({
        where: { workspaceId, userId: dbUser.id },
      });

      if (existingMember) {
        return existingMember;
      }

      return tx.pbcMember.create({
        data: {
          workspaceId,
          userId: dbUser.id,
          role,
        },
        include: { user: true },
      });
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error('POST /api/pbc/workspaces/[workspaceId]/members error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { workspaceId } = await params;

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
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { workspaceId } = await params;
    const body = await req.json();
    const { email, role } = body as { email: string; role: string };

    if (!email || !role) {
      return NextResponse.json({ error: 'E-Mail und Rolle sind erforderlich' }, { status: 400 });
    }

    const member = await prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { email } });

      if (!user) {
        const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
        const passwordHash = await bcrypt.hash(tempPassword, 12);

        user = await tx.user.create({
          data: {
            email,
            name: email.split('@')[0],
            role: 'MANDANT_USER',
            passwordHash,
          },
        });
      }

      const existingMember = await tx.pbcMember.findFirst({
        where: { workspaceId, userId: user.id },
      });

      if (existingMember) {
        return existingMember;
      }

      return tx.pbcMember.create({
        data: {
          workspaceId,
          userId: user.id,
          role: role as 'WP_LEAD' | 'WP_TEAM' | 'MANDANT_ADMIN' | 'MANDANT_UPLOADER',
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

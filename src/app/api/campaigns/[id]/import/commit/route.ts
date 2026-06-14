import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import type { SbaImportValidRow } from '@/lib/sba-import';
import { visibleCampaignWhere } from '@/lib/mandant-access';
import { forbidden, getAuthUser, isWpUser, unauthorized } from '@/lib/require-auth';

function isValidRow(row: unknown): row is SbaImportValidRow {
  const candidate = row as SbaImportValidRow;
  return Boolean(
    candidate &&
      typeof candidate.rowNumber === 'number' &&
      typeof candidate.partnerName === 'string' &&
      typeof candidate.partnerEmail === 'string' &&
      typeof candidate.expectedBalance === 'number' &&
      typeof candidate.currency === 'string'
  );
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { id } = await params;
    const campaign = await prisma.confirmationCampaign.findFirst({
      where: { id, ...visibleCampaignWhere(user) },
    });
    if (!campaign) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

    if (campaign.status === 'COMPLETED' || campaign.status === 'ARCHIVED') {
      return NextResponse.json(
        { error: 'Abgeschlossene oder archivierte Kampagnen können nicht importiert werden.' },
        { status: 400 }
      );
    }

    const body = (await req.json()) as { rows?: unknown[] };
    const rows = Array.isArray(body.rows) ? body.rows.filter(isValidRow) : [];
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Keine gültigen Importzeilen übermittelt.' }, { status: 400 });
    }

    const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const created = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const row of rows) {
        await tx.confirmationRequest.create({
          data: {
            campaignId: id,
            partnerName: row.partnerName.trim(),
            partnerEmail: row.partnerEmail.trim(),
            accountNumber: row.accountNumber?.trim() || null,
            expectedBalance: row.expectedBalance.toFixed(2),
            currency: row.currency || 'EUR',
            status: 'DRAFT',
            publicToken: randomBytes(32).toString('hex'),
            tokenExpiresAt,
            review: {
              create: {
                addressVerificationStatus: 'UNVERIFIED',
              },
            },
            auditLog: {
              create: {
                event: 'CREATED',
                actor: user.email ?? user.id,
                meta: { source: 'csv', rowNumber: row.rowNumber },
              },
            },
          },
        });
        count++;
      }
      return count;
    });

    return NextResponse.json({ created }, { status: 201 });
  } catch (error) {
    console.error('POST /api/campaigns/[id]/import/commit error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

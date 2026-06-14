import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';

function formatDate(d: Date | null | undefined): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('de-DE');
}

function escapeCsvField(value: string | null | undefined): string {
  const str = value == null ? '' : String(value);
  // Wrap in quotes if the value contains commas, quotes, or newlines
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

const CSV_HEADERS = [
  'confirmationMethod',
  'counterpartyType',
  'partnerName',
  'partnerEmail',
  'accountNumber',
  'expectedBalance',
  'currency',
  'status',
  'sentAt',
  'respondedAt',
  'confirmedBalance',
  'hasDifference',
  'differenceNote',
  'addressVerificationStatus',
  'reliabilityStatus',
  'differenceResolutionStatus',
  'alternativeProcedureStatus',
  'conclusionStatus',
  'conclusionNote',
];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { id } = await params;

    const campaign = await prisma.confirmationCampaign.findUnique({ where: { id } });
    if (!campaign) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    const requests = await prisma.confirmationRequest.findMany({
      where: { campaignId: id },
      include: { response: true, review: true },
      orderBy: { createdAt: 'asc' },
    });

    const lines: string[] = [CSV_HEADERS.join(',')];

    for (const r of requests) {
      const row = [
        escapeCsvField(campaign.confirmationMethod),
        escapeCsvField(campaign.counterpartyType),
        escapeCsvField(r.partnerName),
        escapeCsvField(r.partnerEmail),
        escapeCsvField(r.accountNumber),
        escapeCsvField(r.expectedBalance.toString()),
        escapeCsvField(r.currency),
        escapeCsvField(r.status),
        escapeCsvField(formatDate(r.sentAt)),
        escapeCsvField(formatDate(r.respondedAt)),
        escapeCsvField(r.response?.confirmedBalance?.toString() ?? ''),
        escapeCsvField(r.response ? String(r.response.hasDifference) : ''),
        escapeCsvField(r.response?.differenceNote),
        escapeCsvField(r.review?.addressVerificationStatus),
        escapeCsvField(r.review?.reliabilityStatus),
        escapeCsvField(r.review?.differenceResolutionStatus),
        escapeCsvField(r.review?.alternativeProcedureStatus),
        escapeCsvField(r.review?.conclusionStatus),
        escapeCsvField(r.review?.conclusionNote),
      ];
      lines.push(row.join(','));
    }

    const csv = lines.join('\r\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="export-${id}.csv"`,
      },
    });
  } catch (error) {
    console.error('GET /api/campaigns/[id]/export error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

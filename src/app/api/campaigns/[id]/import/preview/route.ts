import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseSbaImport } from '@/lib/sba-import';
import { visibleCampaignWhere } from '@/lib/mandant-access';
import { forbidden, getAuthUser, isWpUser, unauthorized } from '@/lib/require-auth';

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

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'CSV-Datei fehlt.' }, { status: 400 });
    }

    const parsed = parseSbaImport(await file.text());
    return NextResponse.json({
      delimiter: parsed.delimiter,
      rows: parsed.rows,
      validRows: parsed.validRows,
      errors: parsed.errors,
      summary: {
        total: parsed.rows.length,
        valid: parsed.validRows.length,
        invalid: parsed.rows.length - parsed.validRows.length,
      },
    });
  } catch (error) {
    console.error('POST /api/campaigns/[id]/import/preview error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

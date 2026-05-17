import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUpload } from '@/lib/obs';
import { requireRespondablePublicToken } from '@/lib/public-response';

interface RouteParams {
  params: Promise<{ token: string }>;
}

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/csv',
]);

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { token } = await params;

  try {
    const body = await req.json();
    const { filename, mimeType } = body;

    if (!filename || typeof filename !== 'string' || filename.trim() === '') {
      return NextResponse.json({ error: 'Dateiname ist erforderlich' }, { status: 400 });
    }

    if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: 'Dateityp nicht erlaubt. Erlaubt sind: PDF, JPG, PNG, XLSX, XLS, DOCX, DOC, CSV' },
        { status: 400 }
      );
    }

    const access = await requireRespondablePublicToken(token);
    if (!access.ok) return NextResponse.json(access.body, { status: access.status });

    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const obsKey = `sba/${access.request.id}/${Date.now()}-${sanitizedFilename}`;

    const uploadUrl = await getPresignedUpload(obsKey, mimeType, 300);

    return NextResponse.json({ uploadUrl, obsKey });
  } catch (error) {
    console.error('POST /api/r/[token]/upload error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

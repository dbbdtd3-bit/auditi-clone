import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getPresignedUpload } from '@/lib/obs';
import { RequestStatus } from '@prisma/client';

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

    const request = await prisma.confirmationRequest.findUnique({
      where: { publicToken: token },
    });

    if (!request) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    const now = new Date();
    if (request.tokenExpiresAt < now) {
      return NextResponse.json({ error: 'Token abgelaufen', expired: true }, { status: 403 });
    }

    if (request.status !== RequestStatus.SENT && request.status !== RequestStatus.QUEUED) {
      return NextResponse.json({ error: 'Diese Anfrage ist nicht aktiv' }, { status: 403 });
    }

    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const obsKey = `sba/${request.id}/${Date.now()}-${sanitizedFilename}`;

    const uploadUrl = await getPresignedUpload(obsKey, mimeType, 300);

    return NextResponse.json({ uploadUrl, obsKey });
  } catch (error) {
    console.error('POST /api/r/[token]/upload error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

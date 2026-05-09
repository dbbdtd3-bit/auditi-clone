import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPresignedUpload } from '@/lib/obs';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { filename, mimeType, prefix } = body as {
      filename: string;
      mimeType: string;
      prefix?: string;
    };

    if (!filename || !mimeType) {
      return NextResponse.json({ error: 'filename und mimeType sind erforderlich' }, { status: 400 });
    }

    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const obsKey = `${prefix || 'pbc'}/${Date.now()}-${sanitizedFilename}`;

    const uploadUrl = await getPresignedUpload(obsKey, mimeType);

    return NextResponse.json({ uploadUrl, obsKey });
  } catch (error) {
    console.error('POST /api/upload/presign error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

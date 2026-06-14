import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import { getAuthUser, isWpUser, unauthorized, forbidden } from '@/lib/require-auth';

interface CsvRow {
  partnerName: string;
  partnerEmail: string;
  accountNumber: string;
  expectedBalance: string;
  currency: string;
}

interface ImportError {
  row: number;
  message: string;
}

/**
 * Simple CSV parser that handles quoted fields.
 * Returns array of string arrays (rows of cells).
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  for (const line of lines) {
    if (line.trim() === '') continue;

    const cells: string[] = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        // Quoted field
        let cell = '';
        i++; // skip opening quote
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') {
            // Escaped quote
            cell += '"';
            i += 2;
          } else if (line[i] === '"') {
            i++; // skip closing quote
            break;
          } else {
            cell += line[i];
            i++;
          }
        }
        cells.push(cell);
        if (i < line.length && line[i] === ',') i++; // skip comma
      } else {
        // Unquoted field
        const commaIdx = line.indexOf(',', i);
        if (commaIdx === -1) {
          cells.push(line.slice(i).trim());
          break;
        } else {
          cells.push(line.slice(i, commaIdx).trim());
          i = commaIdx + 1;
        }
      }
    }
    rows.push(cells);
  }

  return rows;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (!isWpUser(user)) return forbidden();

    const { id } = await params;

    const campaign = await prisma.confirmationCampaign.findUnique({ where: { id } });
    if (!campaign) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Ungültige Anfrage: CSV-Datei (Feld "file") fehlt' }, { status: 400 });
    }

    const text = await file.text();
    const allRows = parseCsv(text);

    if (allRows.length < 2) {
      return NextResponse.json({ error: 'Ungültige Anfrage: CSV enthält keine Datenzeilen' }, { status: 400 });
    }

    // First row is header — normalize it
    const header = allRows[0].map((h) => h.trim().toLowerCase());
    const dataRows = allRows.slice(1);

    const colIndex = {
      partnerName: header.indexOf('partnername'),
      partnerEmail: header.indexOf('partneremail'),
      accountNumber: header.indexOf('accountnumber'),
      expectedBalance: header.indexOf('expectedbalance'),
      currency: header.indexOf('currency'),
    };

    if (colIndex.partnerName === -1 || colIndex.partnerEmail === -1 || colIndex.expectedBalance === -1) {
      return NextResponse.json({
        error: 'Ungültige Anfrage: CSV-Header muss mindestens partnerName, partnerEmail und expectedBalance enthalten',
      }, { status: 400 });
    }

    const errors: ImportError[] = [];
    const toCreate: CsvRow[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const rowNum = i + 2; // 1-based, accounting for header
      const row = dataRows[i];

      const partnerName = (row[colIndex.partnerName] ?? '').trim();
      const partnerEmail = (row[colIndex.partnerEmail] ?? '').trim();
      const expectedBalanceRaw = (row[colIndex.expectedBalance] ?? '').trim();
      const accountNumber = colIndex.accountNumber !== -1 ? (row[colIndex.accountNumber] ?? '').trim() : '';
      const currency = colIndex.currency !== -1 ? (row[colIndex.currency] ?? '').trim() || 'EUR' : 'EUR';

      if (!partnerName) {
        errors.push({ row: rowNum, message: 'partnerName fehlt' });
        continue;
      }
      if (!partnerEmail || !partnerEmail.includes('@')) {
        errors.push({ row: rowNum, message: 'partnerEmail fehlt oder ungültig' });
        continue;
      }
      if (!expectedBalanceRaw) {
        errors.push({ row: rowNum, message: 'expectedBalance fehlt' });
        continue;
      }

      const balanceNum = parseFloat(expectedBalanceRaw.replace(',', '.'));
      if (isNaN(balanceNum)) {
        errors.push({ row: rowNum, message: `expectedBalance ist keine gültige Zahl: "${expectedBalanceRaw}"` });
        continue;
      }

      toCreate.push({ partnerName, partnerEmail, accountNumber, expectedBalance: balanceNum.toFixed(2), currency });
    }

    // Bulk create all valid rows
    const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.$transaction(
      toCreate.map((row) =>
        prisma.confirmationRequest.create({
          data: {
            campaignId: id,
            partnerName: row.partnerName,
            partnerEmail: row.partnerEmail,
            accountNumber: row.accountNumber || null,
            expectedBalance: row.expectedBalance,
            currency: row.currency,
            status: 'DRAFT',
            publicToken: randomBytes(32).toString('hex'),
            tokenExpiresAt,
            review: {
              create: {
                addressVerificationStatus: 'UNVERIFIED',
              },
            },
          },
        })
      )
    );

    return NextResponse.json({ created: toCreate.length, errors }, { status: 201 });
  } catch (error) {
    console.error('POST /api/campaigns/[id]/import error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

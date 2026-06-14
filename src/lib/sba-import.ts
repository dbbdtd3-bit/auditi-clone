import { parseGermanDecimal } from './sba';

export interface SbaImportValidRow {
  rowNumber: number;
  partnerName: string;
  partnerEmail: string;
  accountNumber: string | null;
  expectedBalance: number;
  currency: string;
}

export interface SbaImportPreviewRow extends SbaImportValidRow {
  status: 'valid' | 'invalid';
  errors: string[];
}

const HEADER_ALIASES: Record<keyof Omit<SbaImportValidRow, 'rowNumber'>, string[]> = {
  partnerName: ['partnername', 'partner', 'name', 'name des partners', 'name_des_partners'],
  partnerEmail: ['partneremail', 'email', 'e-mail', 'mail', 'e mail'],
  accountNumber: ['accountnumber', 'konto', 'kontonummer', 'konto nummer', 'account'],
  expectedBalance: ['expectedbalance', 'saldo', 'buchsaldo', 'expected balance', 'betrag'],
  currency: ['currency', 'waehrung', 'währung'],
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function detectDelimiter(headerLine: string) {
  const commaCount = (headerLine.match(/,/g) ?? []).length;
  const semicolonCount = (headerLine.match(/;/g) ?? []).length;
  return semicolonCount > commaCount ? ';' : ',';
}

function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(current.trim());
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i++;
      row.push(current.trim());
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  row.push(current.trim());
  if (row.some((cell) => cell !== '')) rows.push(row);
  return rows;
}

function findColumn(header: string[], key: keyof Omit<SbaImportValidRow, 'rowNumber'>) {
  const aliases = HEADER_ALIASES[key];
  return header.findIndex((cell) => aliases.includes(cell));
}

export function parseSbaImport(text: string) {
  const firstLine = text.replace(/^\uFEFF/, '').split(/\r?\n/)[0] ?? '';
  const delimiter = detectDelimiter(firstLine);
  const rows = parseDelimited(text.replace(/^\uFEFF/, ''), delimiter);

  if (rows.length < 2) {
    return {
      delimiter,
      rows: [] as SbaImportPreviewRow[],
      validRows: [] as SbaImportValidRow[],
      errors: ['CSV enthält keine Datenzeilen.'],
    };
  }

  const header = rows[0].map(normalizeHeader);
  const col = {
    partnerName: findColumn(header, 'partnerName'),
    partnerEmail: findColumn(header, 'partnerEmail'),
    accountNumber: findColumn(header, 'accountNumber'),
    expectedBalance: findColumn(header, 'expectedBalance'),
    currency: findColumn(header, 'currency'),
  };

  const headerErrors: string[] = [];
  if (col.partnerName === -1) headerErrors.push('Spalte partnerName/name fehlt.');
  if (col.partnerEmail === -1) headerErrors.push('Spalte partnerEmail/email fehlt.');
  if (col.expectedBalance === -1) headerErrors.push('Spalte expectedBalance/saldo fehlt.');

  if (headerErrors.length > 0) {
    return {
      delimiter,
      rows: [] as SbaImportPreviewRow[],
      validRows: [] as SbaImportValidRow[],
      errors: headerErrors,
    };
  }

  const seen = new Set<string>();
  const previewRows: SbaImportPreviewRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;
    const partnerName = (row[col.partnerName] ?? '').trim();
    const partnerEmail = (row[col.partnerEmail] ?? '').trim();
    const accountNumber = col.accountNumber === -1 ? null : (row[col.accountNumber] ?? '').trim() || null;
    const currency = (col.currency === -1 ? 'EUR' : (row[col.currency] ?? '').trim().toUpperCase()) || 'EUR';
    const amountRaw = (row[col.expectedBalance] ?? '').trim();
    const expectedBalance = parseGermanDecimal(amountRaw);
    const errors: string[] = [];

    if (!partnerName) errors.push('Name fehlt.');
    if (!partnerEmail || !partnerEmail.includes('@')) errors.push('E-Mail fehlt oder ist ungültig.');
    if (!amountRaw || !Number.isFinite(expectedBalance)) errors.push('Buchsaldo fehlt oder ist ungültig.');
    if (!['EUR', 'USD', 'CHF'].includes(currency)) errors.push('Währung wird nicht unterstützt.');

    const duplicateKey = `${partnerEmail.toLowerCase()}|${accountNumber ?? ''}|${partnerName.toLowerCase()}`;
    if (seen.has(duplicateKey)) errors.push('Dublettenverdacht innerhalb der CSV.');
    seen.add(duplicateKey);

    const previewRow: SbaImportPreviewRow = {
      rowNumber,
      partnerName,
      partnerEmail,
      accountNumber,
      expectedBalance: Number.isFinite(expectedBalance) ? expectedBalance : 0,
      currency,
      status: errors.length > 0 ? 'invalid' : 'valid',
      errors,
    };

    previewRows.push(previewRow);
  }

  const validRows = previewRows
    .filter((row) => row.status === 'valid')
    .map(({ status: _status, errors: _errors, ...row }) => row);

  return { delimiter, rows: previewRows, validRows, errors: [] as string[] };
}

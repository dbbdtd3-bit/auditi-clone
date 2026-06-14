export const CONFIRMATION_METHODS = ['OPEN', 'STATED'] as const;
export const COUNTERPARTY_TYPES = ['DEBTOR', 'CREDITOR'] as const;

export type ConfirmationMethodValue = (typeof CONFIRMATION_METHODS)[number];
export type CounterpartyTypeValue = (typeof COUNTERPARTY_TYPES)[number];

export const confirmationMethodLabels: Record<ConfirmationMethodValue, string> = {
  OPEN: 'Offen',
  STATED: 'Geschlossen (Saldo genannt)',
};

export const counterpartyTypeLabels: Record<CounterpartyTypeValue, string> = {
  DEBTOR: 'Debitoren',
  CREDITOR: 'Kreditoren',
};

export const addressVerificationLabels: Record<string, string> = {
  UNVERIFIED: 'Nicht verifiziert',
  VERIFIED: 'Verifiziert',
  NEEDS_REVIEW: 'Prüfen',
};

export const addressVerificationMethodLabels: Record<string, string> = {
  CORRESPONDENCE: 'Schriftwechsel',
  INTERNET_RESEARCH: 'Internetrecherche',
  MASTER_DATA: 'Stammdatenprozess',
  OTHER: 'Sonstiges',
};

export const reliabilityLabels: Record<string, string> = {
  NOT_REVIEWED: 'Nicht beurteilt',
  RELIABLE: 'Verlässlich',
  DOUBTFUL: 'Zweifel',
  UNRELIABLE: 'Nicht verlässlich',
};

export const differenceResolutionLabels: Record<string, string> = {
  NOT_REQUIRED: 'Nicht erforderlich',
  OPEN: 'Offen',
  RESOLVED: 'Geklärt',
  MISSTATEMENT: 'Falsche Darstellung',
  NOT_MISSTATEMENT: 'Keine falsche Darstellung',
};

export const alternativeProcedureLabels: Record<string, string> = {
  NOT_REQUIRED: 'Nicht erforderlich',
  OPEN: 'Offen',
  COMPLETED: 'Durchgeführt',
  NOT_POSSIBLE: 'Nicht möglich',
};

export function isConfirmationMethod(value: unknown): value is ConfirmationMethodValue {
  return typeof value === 'string' && CONFIRMATION_METHODS.includes(value as ConfirmationMethodValue);
}

export function isCounterpartyType(value: unknown): value is CounterpartyTypeValue {
  return typeof value === 'string' && COUNTERPARTY_TYPES.includes(value as CounterpartyTypeValue);
}

export function shouldShowExpectedBalance(method: string): boolean {
  return method !== 'OPEN';
}

export function parseGermanDecimal(value: unknown): number {
  if (typeof value === 'number') return value;
  const raw = String(value ?? '').trim();
  if (!raw) return Number.NaN;

  if (raw.includes(',')) {
    return Number.parseFloat(raw.replace(/\./g, '').replace(',', '.'));
  }

  const dotCount = (raw.match(/\./g) ?? []).length;
  if (dotCount > 1 || /\.\d{3}$/.test(raw)) {
    return Number.parseFloat(raw.replace(/\./g, ''));
  }

  return Number.parseFloat(raw);
}

export function amountsDiffer(a: unknown, b: unknown): boolean {
  const first = typeof a === 'object' && a !== null && 'toNumber' in a
    ? (a as { toNumber: () => number }).toNumber()
    : Number(a);
  const second = typeof b === 'object' && b !== null && 'toNumber' in b
    ? (b as { toNumber: () => number }).toNumber()
    : Number(b);

  if (!Number.isFinite(first) || !Number.isFinite(second)) return true;
  return Math.abs(first - second) >= 0.005;
}

export function formatConfirmationScope(method: string, counterpartyType: string): string {
  const methodLabel = confirmationMethodLabels[method as ConfirmationMethodValue] ?? method;
  const counterpartyLabel = counterpartyTypeLabels[counterpartyType as CounterpartyTypeValue] ?? counterpartyType;
  return `${counterpartyLabel} · ${methodLabel}`;
}

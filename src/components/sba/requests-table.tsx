'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect as Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Bell, Edit2, Mail, Send, Trash2 } from 'lucide-react';
import { RequestAuditLog } from './request-audit-log';
import { RequestResponseDetails } from './request-response-details';
import {
  addressVerificationLabels,
  addressVerificationMethodLabels,
  alternativeProcedureLabels,
  differenceResolutionLabels,
  reliabilityLabels,
} from '@/lib/sba';

type RequestStatus = 'DRAFT' | 'QUEUED' | 'SENT' | 'RESPONDED' | 'CLOSED' | 'BOUNCED';
type RequestAction = 'send' | 'remind';

interface RequestReview {
  addressVerificationStatus: string;
  addressVerificationMethod: string | null;
  addressVerificationNote: string | null;
  reliabilityStatus: string;
  reliabilityNote: string | null;
  differenceResolutionStatus: string;
  differenceResolutionNote: string | null;
  alternativeProcedureStatus: string;
  alternativeProcedureNote: string | null;
  conclusionStatus: string;
  conclusionNote: string | null;
}

interface RequestRow {
  id: string;
  partnerName: string;
  partnerEmail: string;
  accountNumber: string | null;
  expectedBalance: unknown;
  currency: string;
  status: string;
  sentAt: Date | string | null;
  respondedAt: Date | string | null;
  reminderCount: number;
  response: { hasDifference?: boolean | null } | null;
  review: RequestReview | null;
}

interface Props {
  campaignId: string;
  campaignStatus: string;
  confirmationMethod: string;
  counterpartyType: string;
  requests: RequestRow[];
}

const MAX_REMINDER_COUNT = 3;

const requestStatusConfig: Record<
  RequestStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' }
> = {
  DRAFT: { label: 'Entwurf', variant: 'secondary' },
  QUEUED: { label: 'In Warteschlange', variant: 'warning' },
  SENT: { label: 'Versendet', variant: 'default' },
  RESPONDED: { label: 'Beantwortet', variant: 'success' },
  CLOSED: { label: 'Geschlossen', variant: 'secondary' },
  BOUNCED: { label: 'Unzustellbar', variant: 'destructive' },
};

const differenceStatusConfig = {
  label: 'Differenz gemeldet',
  variant: 'warning' as const,
};

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function toNumber(amount: unknown): number {
  if (typeof amount === 'object' && amount !== null && 'toNumber' in amount) {
    return (amount as { toNumber: () => number }).toNumber();
  }

  return Number(amount);
}

function formatCurrency(amount: unknown, currency: string): string {
  const num = toNumber(amount);
  if (Number.isNaN(num)) return '-';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency || 'EUR',
    minimumFractionDigits: 2,
  }).format(num);
}

function formatBalanceInput(amount: unknown): string {
  const num = toNumber(amount);
  if (Number.isNaN(num)) return '';
  return num.toFixed(2);
}

function canEditRequest(req: RequestRow, campaignLocked: boolean) {
  return !campaignLocked && req.status !== 'RESPONDED' && req.status !== 'CLOSED';
}

function canDeleteRequest(req: RequestRow, campaignLocked: boolean) {
  return !campaignLocked && ['DRAFT', 'QUEUED', 'SENT', 'BOUNCED'].includes(req.status);
}

function canSendRequest(req: RequestRow, campaignLocked: boolean) {
  return (
    !campaignLocked &&
    (req.status === 'DRAFT' || req.status === 'BOUNCED') &&
    req.review?.addressVerificationStatus === 'VERIFIED'
  );
}

function canRemindRequest(req: RequestRow, campaignLocked: boolean) {
  return !campaignLocked && req.status === 'SENT' && req.reminderCount < MAX_REMINDER_COUNT;
}

function EditRequestDialog({
  campaignId,
  request,
  open,
  onOpenChange,
  canDelete,
  onDeleteRequest,
}: {
  campaignId: string;
  request: RequestRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canDelete: boolean;
  onDeleteRequest: (request: RequestRow) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    partnerName: '',
    partnerEmail: '',
    accountNumber: '',
    expectedBalance: '',
    currency: 'EUR',
  });

  React.useEffect(() => {
    if (!request || !open) return;

    setForm({
      partnerName: request.partnerName,
      partnerEmail: request.partnerEmail,
      accountNumber: request.accountNumber ?? '',
      expectedBalance: formatBalanceInput(request.expectedBalance),
      currency: request.currency || 'EUR',
    });
    setError(null);
  }, [request, open]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!request) return;

    setError(null);

    if (!form.partnerName.trim() || !form.partnerEmail.trim() || !form.expectedBalance) {
      setError('Bitte füllen Sie alle Pflichtfelder aus.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerName: form.partnerName.trim(),
          partnerEmail: form.partnerEmail.trim(),
          accountNumber: form.accountNumber.trim() || null,
          expectedBalance: Number(form.expectedBalance),
          currency: form.currency,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Fehler beim Speichern.');
        return;
      }

      onOpenChange(false);
      router.refresh();
    } catch {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Partner bearbeiten</DialogTitle>
          <DialogDescription>
            Kontakt- und Saldodaten für diese Saldenbestätigung aktualisieren.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-partnerName">Name des Partners *</Label>
            <Input
              id="edit-partnerName"
              name="partnerName"
              value={form.partnerName}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-partnerEmail">E-Mail *</Label>
            <Input
              id="edit-partnerEmail"
              name="partnerEmail"
              type="email"
              value={form.partnerEmail}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-accountNumber">
              Kontonummer <span className="font-normal text-dataly-muted">(optional)</span>
            </Label>
            <Input
              id="edit-accountNumber"
              name="accountNumber"
              value={form.accountNumber}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-expectedBalance">Erwarteter Saldo *</Label>
              <Input
                id="edit-expectedBalance"
                name="expectedBalance"
                type="number"
                step="0.01"
                value={form.expectedBalance}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-currency">Währung</Label>
              <Select
                id="edit-currency"
                name="currency"
                value={form.currency}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="CHF">CHF</option>
              </Select>
            </div>
          </div>

          {error && (
            <p className="rounded-md border border-dataly-danger/20 bg-dataly-danger-soft px-3 py-2 text-sm text-dataly-danger">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2 border-t border-dataly-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            {request && canDelete ? (
              <Button
                type="button"
                variant="outline"
                className="border-dataly-danger/30 text-dataly-danger hover:bg-dataly-danger-soft hover:text-dataly-danger"
                onClick={() => {
                  onOpenChange(false);
                  onDeleteRequest(request);
                }}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4" />
                Partner entfernen
              </Button>
            ) : (
              <span />
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Speichert...' : 'Speichern'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteRequestDialog({
  campaignId,
  request,
  open,
  onOpenChange,
}: {
  campaignId: string;
  request: RequestRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) setError(null);
  }, [open]);

  async function handleDelete() {
    if (!request) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/requests/${request.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Fehler beim Löschen.');
        return;
      }

      onOpenChange(false);
      router.refresh();
    } catch {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Partner löschen</DialogTitle>
          <DialogDescription>
            {request?.partnerName
              ? `${request.partnerName} wird aus dieser Kampagne entfernt. Bereits beantwortete oder geschlossene Anfragen bleiben aus Audit-Gründen geschützt.`
              : 'Dieser Partner wird aus der Kampagne entfernt.'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="rounded-md border border-dataly-danger/20 bg-dataly-danger-soft px-3 py-2 text-sm text-dataly-danger">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Abbrechen
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? 'Löscht...' : 'Löschen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewPanel({
  campaignId,
  request,
  campaignLocked,
}: {
  campaignId: string;
  request: RequestRow;
  campaignLocked: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    addressVerificationStatus: request.review?.addressVerificationStatus ?? 'UNVERIFIED',
    addressVerificationMethod: request.review?.addressVerificationMethod ?? '',
    addressVerificationNote: request.review?.addressVerificationNote ?? '',
    reliabilityStatus: request.review?.reliabilityStatus ?? 'NOT_REVIEWED',
    reliabilityNote: request.review?.reliabilityNote ?? '',
    differenceResolutionStatus: request.review?.differenceResolutionStatus ?? (request.response?.hasDifference ? 'OPEN' : 'NOT_REQUIRED'),
    differenceResolutionNote: request.review?.differenceResolutionNote ?? '',
    alternativeProcedureStatus: request.review?.alternativeProcedureStatus ?? (['SENT', 'BOUNCED'].includes(request.status) ? 'OPEN' : 'NOT_REQUIRED'),
    alternativeProcedureNote: request.review?.alternativeProcedureNote ?? '',
    conclusionStatus: request.review?.conclusionStatus ?? 'OPEN',
    conclusionNote: request.review?.conclusionNote ?? '',
  });

  React.useEffect(() => {
    setForm({
      addressVerificationStatus: request.review?.addressVerificationStatus ?? 'UNVERIFIED',
      addressVerificationMethod: request.review?.addressVerificationMethod ?? '',
      addressVerificationNote: request.review?.addressVerificationNote ?? '',
      reliabilityStatus: request.review?.reliabilityStatus ?? 'NOT_REVIEWED',
      reliabilityNote: request.review?.reliabilityNote ?? '',
      differenceResolutionStatus: request.review?.differenceResolutionStatus ?? (request.response?.hasDifference ? 'OPEN' : 'NOT_REQUIRED'),
      differenceResolutionNote: request.review?.differenceResolutionNote ?? '',
      alternativeProcedureStatus: request.review?.alternativeProcedureStatus ?? (['SENT', 'BOUNCED'].includes(request.status) ? 'OPEN' : 'NOT_REQUIRED'),
      alternativeProcedureNote: request.review?.alternativeProcedureNote ?? '',
      conclusionStatus: request.review?.conclusionStatus ?? 'OPEN',
      conclusionNote: request.review?.conclusionNote ?? '',
    });
    setMessage(null);
    setError(null);
  }, [request]);

  function handleChange(
    e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement | HTMLInputElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/requests/${request.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          addressVerificationMethod: form.addressVerificationMethod || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Review konnte nicht gespeichert werden.');
        return;
      }

      setMessage('Review gespeichert.');
      router.refresh();
    } catch {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-dataly-line-strong">
      <div className="border-b border-dataly-line bg-dataly-surface-subtle px-4 py-3">
        <h3 className="text-sm font-semibold text-dataly-ink">ISA-505-Prüfung: {request.partnerName}</h3>
        <p className="mt-1 text-xs leading-5 text-dataly-slate">
          Dokumentieren Sie Empfängerverifikation, Verlässlichkeit, Differenzen und alternative Prüfungshandlungen.
        </p>
      </div>
      <form onSubmit={handleSave} className="space-y-4 p-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 rounded-md border border-dataly-line p-3">
            <h4 className="text-xs font-semibold uppercase text-dataly-muted">Empfänger / Adresse</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="addressVerificationStatus">Status</Label>
                <Select
                  id="addressVerificationStatus"
                  name="addressVerificationStatus"
                  value={form.addressVerificationStatus}
                  onChange={handleChange}
                  disabled={campaignLocked || loading}
                >
                  <option value="UNVERIFIED">{addressVerificationLabels.UNVERIFIED}</option>
                  <option value="VERIFIED">{addressVerificationLabels.VERIFIED}</option>
                  <option value="NEEDS_REVIEW">{addressVerificationLabels.NEEDS_REVIEW}</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addressVerificationMethod">Methode</Label>
                <Select
                  id="addressVerificationMethod"
                  name="addressVerificationMethod"
                  value={form.addressVerificationMethod}
                  onChange={handleChange}
                  disabled={campaignLocked || loading}
                >
                  <option value="">Nicht angegeben</option>
                  <option value="CORRESPONDENCE">{addressVerificationMethodLabels.CORRESPONDENCE}</option>
                  <option value="INTERNET_RESEARCH">{addressVerificationMethodLabels.INTERNET_RESEARCH}</option>
                  <option value="MASTER_DATA">{addressVerificationMethodLabels.MASTER_DATA}</option>
                  <option value="OTHER">{addressVerificationMethodLabels.OTHER}</option>
                </Select>
              </div>
            </div>
            <Textarea
              name="addressVerificationNote"
              value={form.addressVerificationNote}
              onChange={handleChange}
              rows={3}
              disabled={campaignLocked || loading}
              placeholder="Notiz zur Verifikation, z. B. Abgleich mit Rechnung oder Website."
            />
          </div>

          <div className="space-y-2 rounded-md border border-dataly-line p-3">
            <h4 className="text-xs font-semibold uppercase text-dataly-muted">Antwort-Verlässlichkeit</h4>
            <Select
              name="reliabilityStatus"
              value={form.reliabilityStatus}
              onChange={handleChange}
              disabled={campaignLocked || loading || request.status !== 'RESPONDED'}
            >
              <option value="NOT_REVIEWED">{reliabilityLabels.NOT_REVIEWED}</option>
              <option value="RELIABLE">{reliabilityLabels.RELIABLE}</option>
              <option value="DOUBTFUL">{reliabilityLabels.DOUBTFUL}</option>
              <option value="UNRELIABLE">{reliabilityLabels.UNRELIABLE}</option>
            </Select>
            <Textarea
              name="reliabilityNote"
              value={form.reliabilityNote}
              onChange={handleChange}
              rows={3}
              disabled={campaignLocked || loading || request.status !== 'RESPONDED'}
              placeholder="Notiz zu Identität, direktem Rücklauf oder weiteren Rückfragen."
            />
          </div>

          <div className="space-y-2 rounded-md border border-dataly-line p-3">
            <h4 className="text-xs font-semibold uppercase text-dataly-muted">Differenzklärung</h4>
            <Select
              name="differenceResolutionStatus"
              value={form.differenceResolutionStatus}
              onChange={handleChange}
              disabled={campaignLocked || loading || !request.response?.hasDifference}
            >
              <option value="NOT_REQUIRED">{differenceResolutionLabels.NOT_REQUIRED}</option>
              <option value="OPEN">{differenceResolutionLabels.OPEN}</option>
              <option value="RESOLVED">{differenceResolutionLabels.RESOLVED}</option>
              <option value="MISSTATEMENT">{differenceResolutionLabels.MISSTATEMENT}</option>
              <option value="NOT_MISSTATEMENT">{differenceResolutionLabels.NOT_MISSTATEMENT}</option>
            </Select>
            <Textarea
              name="differenceResolutionNote"
              value={form.differenceResolutionNote}
              onChange={handleChange}
              rows={3}
              disabled={campaignLocked || loading || !request.response?.hasDifference}
              placeholder="Ursache und Ergebnis der Differenzklärung."
            />
          </div>

          <div className="space-y-2 rounded-md border border-dataly-line p-3">
            <h4 className="text-xs font-semibold uppercase text-dataly-muted">Alternative Prüfungshandlung</h4>
            <Select
              name="alternativeProcedureStatus"
              value={form.alternativeProcedureStatus}
              onChange={handleChange}
              disabled={campaignLocked || loading}
            >
              <option value="NOT_REQUIRED">{alternativeProcedureLabels.NOT_REQUIRED}</option>
              <option value="OPEN">{alternativeProcedureLabels.OPEN}</option>
              <option value="COMPLETED">{alternativeProcedureLabels.COMPLETED}</option>
              <option value="NOT_POSSIBLE">{alternativeProcedureLabels.NOT_POSSIBLE}</option>
            </Select>
            <Textarea
              name="alternativeProcedureNote"
              value={form.alternativeProcedureNote}
              onChange={handleChange}
              rows={3}
              disabled={campaignLocked || loading}
              placeholder="Dokumentation bei Nichtantwort, Bounce oder unvollständiger Antwort."
            />
          </div>
        </div>

        <div className="space-y-2 rounded-md border border-dataly-line p-3">
          <h4 className="text-xs font-semibold uppercase text-dataly-muted">Abschlussnotiz</h4>
          <div className="grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
            <Select
              name="conclusionStatus"
              value={form.conclusionStatus}
              onChange={handleChange}
              disabled={campaignLocked || loading}
            >
              <option value="OPEN">Offen</option>
              <option value="READY">Bereit zum Abschluss</option>
              <option value="CLOSED">Abgeschlossen</option>
            </Select>
            <Input
              name="conclusionNote"
              value={form.conclusionNote}
              onChange={handleChange}
              disabled={campaignLocked || loading}
              placeholder="Kurze Schlussfolgerung zur Anfrage"
            />
          </div>
        </div>

        {(message || error) && (
          <div className="space-y-2">
            {message ? (
              <p className="rounded-md border border-dataly-success/20 bg-dataly-success-soft px-3 py-2 text-sm text-dataly-success">
                {message}
              </p>
            ) : null}
            {error ? (
              <p className="rounded-md border border-dataly-danger/20 bg-dataly-danger-soft px-3 py-2 text-sm text-dataly-danger">
                {error}
              </p>
            ) : null}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={campaignLocked || loading}>
            {loading ? 'Speichert...' : 'Review speichern'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function RequestsTable({
  campaignId,
  campaignStatus,
  requests,
}: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [editingRequest, setEditingRequest] = React.useState<RequestRow | null>(null);
  const [deletingRequest, setDeletingRequest] = React.useState<RequestRow | null>(null);
  const [actionLoading, setActionLoading] = React.useState<{ id: string; action: RequestAction } | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const campaignLocked = campaignStatus === 'COMPLETED' || campaignStatus === 'ARCHIVED';
  const selectedRequest = selectedId
    ? requests.find((r) => r.id === selectedId) ?? null
    : null;

  function handleRowClick(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  function handleRowKeyDown(e: React.KeyboardEvent<HTMLTableRowElement>, id: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRowClick(id);
    }
  }

  async function handleRequestAction(req: RequestRow, action: RequestAction) {
    setMessage(null);
    setError(null);
    setActionLoading({ id: req.id, action });

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/requests/${req.id}/${action}`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Aktion konnte nicht ausgeführt werden.');
        return;
      }

      setMessage(
        action === 'send'
          ? `${req.partnerName} wurde in die Versand-Warteschlange gestellt.`
          : `Erinnerung für ${req.partnerName} wurde in die Warteschlange gestellt.`
      );
      router.refresh();
    } catch {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setActionLoading(null);
    }
  }

  if (requests.length === 0) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
          <Mail className="mb-3 h-8 w-8 text-dataly-muted" />
          <p className="mb-1 text-sm font-medium text-dataly-ink">
            Noch keine Partner hinzugefügt
          </p>
          <p className="text-xs text-dataly-slate">
            Fügen Sie Partner einzeln hinzu oder importieren Sie eine CSV-Datei.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {(message || error) && (
          <div className="space-y-2">
            {message && (
              <p className="rounded-md border border-dataly-success/20 bg-dataly-success-soft px-3 py-2 text-sm text-dataly-success">
                {message}
              </p>
            )}
            {error && (
              <p className="rounded-md border border-dataly-danger/20 bg-dataly-danger-soft px-3 py-2 text-sm text-dataly-danger">
                {error}
              </p>
            )}
          </div>
        )}

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dataly-line bg-dataly-surface-subtle">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-dataly-slate">
                    Partner
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-dataly-slate">
                    E-Mail
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase text-dataly-slate md:table-cell">
                    Konto
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-dataly-slate">
                    Saldo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-dataly-slate">
                    Status
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase text-dataly-slate xl:table-cell">
                    Adresse
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase text-dataly-slate xl:table-cell">
                    Prüfung
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase text-dataly-slate lg:table-cell">
                    Versendet
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase text-dataly-slate lg:table-cell">
                    Geantwortet
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-dataly-slate">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dataly-line">
                {requests.map((req) => {
                  const reqStatus =
                    req.status === 'RESPONDED' && req.response?.hasDifference
                      ? differenceStatusConfig
                      : requestStatusConfig[req.status as RequestStatus] ?? {
                          label: req.status,
                          variant: 'outline' as const,
                        };
                  const isSelected = req.id === selectedId;
                  const sendLoading =
                    actionLoading?.id === req.id && actionLoading.action === 'send';
                  const remindLoading =
                    actionLoading?.id === req.id && actionLoading.action === 'remind';

                  return (
                    <tr
                      key={req.id}
                      tabIndex={0}
                      onClick={() => handleRowClick(req.id)}
                      onKeyDown={(e) => handleRowKeyDown(e, req.id)}
                      className={`cursor-pointer select-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dataly-blue focus-visible:ring-offset-2 ${
                        isSelected
                          ? 'bg-dataly-info-soft hover:bg-dataly-info-soft'
                          : 'hover:bg-dataly-surface-subtle'
                      }`}
                      title="Klicken für Audit-Log"
                    >
                      <td className="px-4 py-3 font-medium text-dataly-ink">
                        <button
                          type="button"
                          className="max-w-[220px] truncate text-left font-semibold text-dataly-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dataly-blue focus-visible:ring-offset-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canEditRequest(req, campaignLocked)) setEditingRequest(req);
                          }}
                          disabled={!canEditRequest(req, campaignLocked)}
                        >
                          {req.partnerName}
                        </button>
                      </td>
                      <td className="max-w-[180px] truncate px-4 py-3 text-dataly-slate">
                        {req.partnerEmail}
                      </td>
                      <td className="hidden px-4 py-3 text-dataly-slate md:table-cell">
                        {req.accountNumber ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-dataly-ink">
                        {formatCurrency(req.expectedBalance, req.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={reqStatus.variant}>{reqStatus.label}</Badge>
                      </td>
                      <td className="hidden px-4 py-3 xl:table-cell">
                        <Badge
                          variant={
                            req.review?.addressVerificationStatus === 'VERIFIED'
                              ? 'success'
                              : req.review?.addressVerificationStatus === 'NEEDS_REVIEW'
                                ? 'warning'
                                : 'secondary'
                          }
                        >
                          {addressVerificationLabels[
                            req.review?.addressVerificationStatus ?? 'UNVERIFIED'
                          ] ?? 'Nicht verifiziert'}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-3 xl:table-cell">
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={
                              req.review?.reliabilityStatus === 'RELIABLE'
                                ? 'success'
                                : req.review?.reliabilityStatus === 'DOUBTFUL'
                                  ? 'warning'
                                  : req.review?.reliabilityStatus === 'UNRELIABLE'
                                    ? 'destructive'
                                    : 'secondary'
                            }
                          >
                            {reliabilityLabels[
                              req.review?.reliabilityStatus ?? 'NOT_REVIEWED'
                            ] ?? 'Nicht beurteilt'}
                          </Badge>
                          {req.response?.hasDifference ? (
                            <Badge
                              variant={
                                ['RESOLVED', 'MISSTATEMENT', 'NOT_MISSTATEMENT'].includes(
                                  req.review?.differenceResolutionStatus ?? ''
                                )
                                  ? 'success'
                                  : 'warning'
                              }
                            >
                              {differenceResolutionLabels[
                                req.review?.differenceResolutionStatus ?? 'OPEN'
                              ] ?? 'Differenz offen'}
                            </Badge>
                          ) : null}
                          {['SENT', 'BOUNCED'].includes(req.status) ? (
                            <Badge
                              variant={
                                ['COMPLETED', 'NOT_POSSIBLE'].includes(
                                  req.review?.alternativeProcedureStatus ?? ''
                                )
                                  ? 'success'
                                  : 'warning'
                              }
                            >
                              {alternativeProcedureLabels[
                                req.review?.alternativeProcedureStatus ?? 'OPEN'
                              ] ?? 'Alternative offen'}
                            </Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-dataly-slate lg:table-cell">
                        {formatDate(req.sentAt)}
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        {req.status === 'RESPONDED' && req.response ? (
                          <span className="font-medium text-dataly-success">
                            {formatDate(req.respondedAt)}
                          </span>
                        ) : (
                          <span className="text-dataly-muted">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {canSendRequest(req, campaignLocked) && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleRequestAction(req, 'send');
                              }}
                              disabled={!!actionLoading}
                            >
                              <Send className="h-4 w-4" />
                              {sendLoading ? 'Sendet...' : 'Senden'}
                            </Button>
                          )}

                          {canRemindRequest(req, campaignLocked) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleRequestAction(req, 'remind');
                              }}
                              disabled={!!actionLoading}
                            >
                              <Bell className="h-4 w-4" />
                              {remindLoading ? 'Erinnert...' : 'Erinnern'}
                            </Button>
                          )}

                          {canEditRequest(req, campaignLocked) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-9 w-9"
                                  aria-label={`${req.partnerName} bearbeiten`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingRequest(req);
                                  }}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Bearbeiten</TooltipContent>
                            </Tooltip>
                          )}

                          {canDeleteRequest(req, campaignLocked) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-9 w-9 text-dataly-danger hover:bg-dataly-danger-soft hover:text-dataly-danger"
                                  aria-label={`${req.partnerName} löschen`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingRequest(req);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Löschen</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {selectedRequest && (
          <div className="space-y-3">
            <ReviewPanel
              campaignId={campaignId}
              request={selectedRequest}
              campaignLocked={campaignLocked}
            />
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.85fr)]">
              <RequestResponseDetails campaignId={campaignId} request={selectedRequest} />
              <RequestAuditLog
                campaignId={campaignId}
                requestId={selectedRequest.id}
                partnerName={selectedRequest.partnerName}
                onClose={() => setSelectedId(null)}
              />
            </div>
          </div>
        )}

        {!selectedRequest && (
          <p className="pt-1 text-center text-xs text-dataly-muted">
            Zeile anklicken für Audit-Log, Partnername anklicken zum Bearbeiten.
          </p>
        )}

        <EditRequestDialog
          campaignId={campaignId}
          request={editingRequest}
          open={!!editingRequest}
          canDelete={editingRequest ? canDeleteRequest(editingRequest, campaignLocked) : false}
          onDeleteRequest={(request) => setDeletingRequest(request)}
          onOpenChange={(open) => {
            if (!open) setEditingRequest(null);
          }}
        />

        <DeleteRequestDialog
          campaignId={campaignId}
          request={deletingRequest}
          open={!!deletingRequest}
          onOpenChange={(open) => {
            if (!open) setDeletingRequest(null);
          }}
        />
      </div>
    </TooltipProvider>
  );
}

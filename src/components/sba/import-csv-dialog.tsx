'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Download, Upload } from 'lucide-react';

interface Props {
  campaignId: string;
}

interface PreviewRow {
  rowNumber: number;
  partnerName: string;
  partnerEmail: string;
  accountNumber: string | null;
  expectedBalance: number;
  currency: string;
  status: 'valid' | 'invalid';
  errors: string[];
}

const CSV_TEMPLATE =
  'partnerName;partnerEmail;accountNumber;expectedBalance;currency\n' +
  'Müller GmbH;buchhaltung@mueller.de;1200;150.000,00;EUR\n' +
  'Schmidt AG;info@schmidt-ag.de;3300;87.500,00;EUR\n';

function formatAmount(value: number, currency: string) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function ImportCsvDialog({ campaignId }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [committing, setCommitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<PreviewRow[]>([]);
  const [validRows, setValidRows] = React.useState<PreviewRow[]>([]);
  const [file, setFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function resetState() {
    setFile(null);
    setRows([]);
    setValidRows([]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleDownloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sba-vorlage.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('Bitte wählen Sie eine CSV-Datei aus.');
      return;
    }

    setLoading(true);
    setError(null);
    setRows([]);
    setValidRows([]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/campaigns/${campaignId}/import/preview`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || (Array.isArray(data.errors) && data.errors.length > 0)) {
        setError(data.error || data.errors?.join(' ') || 'CSV konnte nicht validiert werden.');
        return;
      }

      setRows(data.rows ?? []);
      setValidRows(data.validRows ?? []);
    } catch {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    if (validRows.length === 0) return;

    setCommitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/import/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validRows }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Import konnte nicht gespeichert werden.');
        return;
      }

      resetState();
      setOpen(false);
      router.refresh();
    } catch {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setCommitting(false);
    }
  }

  const invalidCount = rows.filter((row) => row.status === 'invalid').length;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          resetState();
          setOpen(true);
        }}
      >
        <Upload className="h-4 w-4" />
        CSV importieren
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Partner per CSV importieren</DialogTitle>
          </DialogHeader>

          <form onSubmit={handlePreview} className="space-y-4">
            <div className="rounded-md border border-dataly-line bg-dataly-surface-subtle p-3">
              <p className="text-xs font-semibold uppercase text-dataly-muted">Erwartetes CSV-Format</p>
              <pre className="mt-2 whitespace-pre-wrap text-xs leading-5 text-dataly-slate">
                partnerName;partnerEmail;accountNumber;expectedBalance;currency
              </pre>
              <p className="mt-2 text-xs leading-5 text-dataly-muted">
                Komma und Semikolon werden erkannt. Deutsche Beträge wie 150.000,00 sind zulässig.
                Der Buchsaldo bleibt bei offenen Kampagnen intern und wird nicht veröffentlicht.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-dataly-blue hover:underline"
            >
              <Download className="h-3.5 w-3.5" />
              Vorlage herunterladen
            </button>

            <div className="space-y-1.5">
              <Label htmlFor="csv-file">CSV-Datei *</Label>
              <input
                ref={fileInputRef}
                id="csv-file"
                type="file"
                accept=".csv,.txt"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setRows([]);
                  setValidRows([]);
                  setError(null);
                }}
                disabled={loading || committing}
                className="block w-full cursor-pointer text-sm text-dataly-slate file:mr-3 file:rounded-md file:border file:border-dataly-line file:bg-white file:px-3 file:py-1.5 file:text-sm hover:file:bg-dataly-surface-subtle"
              />
              {file ? (
                <p className="text-xs text-dataly-muted">
                  Ausgewählt: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              ) : null}
            </div>

            {error ? (
              <p className="rounded-md border border-dataly-danger/30 bg-dataly-danger-soft px-3 py-2 text-sm text-dataly-danger">
                {error}
              </p>
            ) : null}

            {rows.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="success">{validRows.length} gültig</Badge>
                  <Badge variant={invalidCount > 0 ? 'warning' : 'secondary'}>
                    {invalidCount} mit Fehlern
                  </Badge>
                </div>
                <div className="max-h-72 overflow-auto rounded-md border border-dataly-line">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-dataly-surface-subtle">
                      <tr className="border-b border-dataly-line">
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-dataly-slate">Zeile</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-dataly-slate">Partner</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-dataly-slate">E-Mail</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-dataly-slate">Saldo</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-dataly-slate">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dataly-line bg-white">
                      {rows.map((row) => (
                        <tr key={row.rowNumber}>
                          <td className="px-3 py-2 tabular-nums text-dataly-muted">{row.rowNumber}</td>
                          <td className="px-3 py-2 font-medium text-dataly-ink">{row.partnerName || '-'}</td>
                          <td className="px-3 py-2 text-dataly-slate">{row.partnerEmail || '-'}</td>
                          <td className="px-3 py-2 text-right font-mono text-dataly-ink">
                            {row.status === 'valid' ? formatAmount(row.expectedBalance, row.currency) : '-'}
                          </td>
                          <td className="px-3 py-2">
                            {row.status === 'valid' ? (
                              <Badge variant="success">Gültig</Badge>
                            ) : (
                              <span className="text-xs leading-5 text-dataly-danger">
                                {row.errors.join(' ')}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading || committing}>
                Abbrechen
              </Button>
              <Button type="submit" variant="outline" disabled={loading || committing || !file}>
                {loading ? 'Validiert...' : 'Vorschau prüfen'}
              </Button>
              <Button
                type="button"
                onClick={handleCommit}
                disabled={committing || loading || validRows.length === 0}
              >
                {committing ? 'Importiert...' : `Importieren (${validRows.length})`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

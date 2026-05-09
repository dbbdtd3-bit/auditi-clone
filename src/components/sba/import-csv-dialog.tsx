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
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Download } from 'lucide-react';

interface Props {
  campaignId: string;
}

const CSV_TEMPLATE =
  'partnerName,partnerEmail,accountNumber,expectedBalance,currency\n' +
  'Müller GmbH,mueller@example.com,12345,150000.00,EUR\n' +
  'Schmidt AG,info@schmidt-ag.de,12346,87500.00,EUR\n';

export function ImportCsvDialog({ campaignId }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ imported: number; errors: number } | null>(null);
  const [file, setFile] = React.useState<File | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setError(null);
    setResult(null);
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

  function resetState() {
    setFile(null);
    setError(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!file) {
      setError('Bitte wählen Sie eine CSV-Datei aus.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/campaigns/${campaignId}/import`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Fehler beim Import');
        return;
      }

      setResult({
        imported: data.imported ?? 0,
        errors: data.errors ?? 0,
      });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      router.refresh();
    } catch {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  }

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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Partner per CSV importieren</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Format hint */}
            <div className="rounded-md bg-slate-50 border border-slate-200 p-3">
              <p className="text-xs font-semibold text-slate-600 mb-1.5">
                Erwartetes CSV-Format:
              </p>
              <pre className="text-xs text-slate-500 whitespace-pre-wrap leading-relaxed">
                {`partnerName,partnerEmail,accountNumber,expectedBalance,currency
Müller GmbH,mueller@example.com,12345,150000.00,EUR`}
              </pre>
              <p className="text-xs text-slate-400 mt-1.5">
                Spalten <code>accountNumber</code> und <code>currency</code> sind
                optional. Standard-Währung: EUR.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              <Download className="h-3.5 w-3.5" />
              Vorlage herunterladen
            </button>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="csv-file">CSV-Datei *</Label>
                <input
                  ref={fileInputRef}
                  id="csv-file"
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  disabled={loading}
                  className="block w-full text-sm text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-300 file:text-sm file:bg-white hover:file:bg-slate-50 cursor-pointer"
                />
                {file && (
                  <p className="text-xs text-slate-500">
                    Ausgewählt: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
                  {error}
                </p>
              )}

              {result && (
                <div className="text-sm bg-green-50 border border-green-200 px-3 py-2 rounded-md">
                  <span className="text-green-800 font-medium">
                    {result.imported} Partner importiert
                  </span>
                  {result.errors > 0 && (
                    <span className="text-amber-700 ml-2">
                      ({result.errors} Zeile{result.errors !== 1 ? 'n' : ''} mit
                      Fehlern übersprungen)
                    </span>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  {result ? 'Schließen' : 'Abbrechen'}
                </Button>
                {!result && (
                  <Button
                    type="submit"
                    className="bg-blue-700 hover:bg-blue-800"
                    disabled={loading || !file}
                  >
                    {loading ? 'Wird importiert...' : 'Importieren'}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

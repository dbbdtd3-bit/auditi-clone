'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Clock, Loader2, Paperclip, X } from 'lucide-react';

interface RequestData {
  id: string;
  partnerName: string;
  partnerEmail: string;
  accountNumber: string | null;
  expectedBalance: string;
  currency: string;
  balanceDate: string;
  kanzleiName: string;
  tokenExpiresAt: string;
  status: string;
  alreadyResponded: boolean;
}

type PageState = 'loading' | 'expired' | 'already_responded' | 'closed' | 'error' | 'form' | 'success';

function formatBalance(value: string, currency: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return `${value} ${currency}`;
  return num.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    style: 'currency',
    currency,
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function PublicResponsePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [pageState, setPageState] = useState<PageState>('loading');
  const [requestData, setRequestData] = useState<RequestData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Formular-State
  const [respondedBy, setRespondedBy] = useState('');
  const [hasDifference, setHasDifference] = useState<boolean>(false);
  const [confirmedBalance, setConfirmedBalance] = useState('');
  const [differenceNote, setDifferenceNote] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Upload-State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Token aus params auflösen
  useEffect(() => {
    params.then(({ token: t }) => setToken(t));
  }, [params]);

  // Daten laden
  useEffect(() => {
    if (!token) return;

    async function loadData() {
      try {
        const res = await fetch(`/api/r/${token}`);
        const data = await res.json();

        if (!res.ok) {
          if (data.expired) {
            setPageState('expired');
          } else if (res.status === 403) {
            if (data.error?.includes('abgeschlossen')) {
              setPageState('closed');
            } else {
              setErrorMessage(data.error ?? 'Zugriff verweigert');
              setPageState('error');
            }
          } else {
            setErrorMessage(data.error ?? 'Unbekannter Fehler');
            setPageState('error');
          }
          return;
        }

        setRequestData(data);
        if (data.alreadyResponded) {
          setPageState('already_responded');
        } else {
          setPageState('form');
        }
      } catch {
        setErrorMessage('Die Anfrage konnte nicht geladen werden. Bitte versuchen Sie es erneut.');
        setPageState('error');
      }
    }

    loadData();
  }, [token]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
    if (file.size > MAX_SIZE) {
      setUploadError('Die Datei ist zu groß. Maximale Dateigröße: 20 MB.');
      return;
    }

    setUploadFile(file);
    setUploadError('');
    setUploadedKey(null);
    setIsUploading(true);

    try {
      // Presigned URL anfordern
      const uploadRes = await fetch(`/api/r/${token}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, mimeType: file.type }),
      });

      if (!uploadRes.ok) {
        const uploadData = await uploadRes.json();
        setUploadError(uploadData.error ?? 'Upload konnte nicht vorbereitet werden.');
        setUploadFile(null);
        setIsUploading(false);
        return;
      }

      const { uploadUrl, obsKey } = await uploadRes.json();

      // Direkt zu OBS hochladen
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!putRes.ok) {
        setUploadError('Der Upload ist fehlgeschlagen. Bitte versuchen Sie es erneut.');
        setUploadFile(null);
        setIsUploading(false);
        return;
      }

      setUploadedKey(obsKey);
    } catch {
      setUploadError('Verbindungsfehler beim Upload.');
      setUploadFile(null);
    } finally {
      setIsUploading(false);
    }
  }

  function removeFile() {
    setUploadFile(null);
    setUploadedKey(null);
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');

    if (!respondedBy.trim()) {
      setSubmitError('Bitte geben Sie Ihren Namen an.');
      return;
    }

    if (!privacyAccepted) {
      setSubmitError('Bitte stimmen Sie der Datenschutzerklärung zu.');
      return;
    }

    if (hasDifference && !differenceNote.trim()) {
      setSubmitError('Bitte erläutern Sie die Abweichung.');
      return;
    }

    if (isUploading) {
      setSubmitError('Bitte warten Sie, bis der Upload abgeschlossen ist.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        respondedBy: respondedBy.trim(),
        hasDifference,
        differenceNote: differenceNote.trim() || null,
        attachmentKey: uploadedKey ?? null,
      };

      if (hasDifference && confirmedBalance.trim() !== '') {
        const parsed = parseFloat(confirmedBalance.replace(',', '.'));
        if (!isNaN(parsed)) {
          payload.confirmedBalance = parsed;
        }
      }

      const res = await fetch(`/api/r/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error ?? 'Die Antwort konnte nicht übermittelt werden.');
        return;
      }

      setPageState('success');
    } catch {
      setSubmitError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // --- Lade-Zustand ---
  if (pageState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm">Anfrage wird geladen ...</p>
      </div>
    );
  }

  // --- Token abgelaufen ---
  if (pageState === 'expired') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">Link abgelaufen</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-slate-600 text-sm">
            Der Bestätigungslink ist nicht mehr gültig. Links sind aus Sicherheitsgründen
            zeitlich begrenzt.
          </p>
          <p className="text-slate-600 text-sm">
            Bitte wenden Sie sich direkt an die Wirtschaftsprüfungskanzlei, die Ihnen dieses
            Schreiben zugesandt hat, um einen neuen Link anzufordern.
          </p>
        </CardContent>
      </Card>
    );
  }

  // --- Bereits beantwortet ---
  if (pageState === 'already_responded') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-lg">Antwort bereits eingegangen</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-slate-600 text-sm">
            Wir haben Ihre Antwort bereits erhalten. Vielen Dank für Ihre Mitwirkung.
          </p>
          {requestData && (
            <p className="text-slate-500 text-sm">
              Anfrage von: <span className="font-medium text-slate-700">{requestData.kanzleiName}</span>
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // --- Geschlossen ---
  if (pageState === 'closed') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-slate-400" />
            <CardTitle className="text-lg">Vorgang abgeschlossen</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 text-sm">
            Dieser Vorgang wurde bereits abgeschlossen und ist nicht mehr zugänglich.
          </p>
        </CardContent>
      </Card>
    );
  }

  // --- Allgemeiner Fehler ---
  if (pageState === 'error') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <CardTitle className="text-lg">Fehler</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 text-sm">{errorMessage}</p>
        </CardContent>
      </Card>
    );
  }

  // --- Erfolg ---
  if (pageState === 'success') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-lg">Vielen Dank für Ihre Antwort</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-slate-600 text-sm">
            Ihre Saldobestätigung wurde erfolgreich übermittelt und wird der Prüfungsdokumentation
            beigefügt.
          </p>
          {requestData && (
            <p className="text-slate-500 text-sm">
              Die Bestätigung wurde an{' '}
              <span className="font-medium text-slate-700">{requestData.kanzleiName}</span>{' '}
              weitergeleitet.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // --- Formular ---
  if (!requestData) return null;

  const balanceFormatted = formatBalance(requestData.expectedBalance, requestData.currency);

  return (
    <div className="space-y-6">
      {/* Kopfbereich */}
      <div>
        <p className="text-sm text-slate-500 mb-1">Saldobestätigung</p>
        <h1 className="text-xl font-semibold text-slate-900">
          Anfrage von {requestData.kanzleiName}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Bitte bestätigen Sie den unten aufgeführten Saldo zum angegebenen Stichtag.
        </p>
      </div>

      {/* Info-Karte */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Absender</dt>
              <dd className="font-medium text-slate-900 mt-0.5">{requestData.kanzleiName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Stichtag</dt>
              <dd className="font-medium text-slate-900 mt-0.5">
                {formatDate(requestData.balanceDate)}
              </dd>
            </div>
            {requestData.accountNumber && (
              <div>
                <dt className="text-slate-500">Kontonummer</dt>
                <dd className="font-medium text-slate-900 mt-0.5">{requestData.accountNumber}</dd>
              </div>
            )}
            <div className="col-span-2 pt-2 border-t border-slate-100">
              <dt className="text-slate-500 text-xs uppercase tracking-wide">
                Unser Saldo laut Buchführung
              </dt>
              <dd className="text-2xl font-bold text-slate-900 mt-1">{balanceFormatted}</dd>
              <Badge variant="outline" className="mt-1 text-xs">
                zum {formatDate(requestData.balanceDate)}
              </Badge>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Formular */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="respondedBy">
            Ihr Name / Position <span className="text-red-500">*</span>
          </Label>
          <Input
            id="respondedBy"
            type="text"
            placeholder="z. B. Max Mustermann, Leiter Buchhaltung"
            value={respondedBy}
            onChange={(e) => setRespondedBy(e.target.value)}
            required
          />
        </div>

        {/* Saldobestätigung */}
        <div className="space-y-3">
          <Label>Saldobestätigung <span className="text-red-500">*</span></Label>

          <label
            className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
              !hasDifference
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="hasDifference"
              className="mt-0.5 accent-emerald-600"
              checked={!hasDifference}
              onChange={() => setHasDifference(false)}
            />
            <div>
              <p className="font-medium text-slate-900 text-sm">
                Ich bestätige den Saldo von {balanceFormatted}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Der von Ihnen genannte Saldo stimmt mit unserer Buchführung überein.
              </p>
            </div>
          </label>

          <label
            className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
              hasDifference
                ? 'border-amber-500 bg-amber-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="hasDifference"
              className="mt-0.5 accent-amber-600"
              checked={hasDifference}
              onChange={() => setHasDifference(true)}
            />
            <div>
              <p className="font-medium text-slate-900 text-sm">Ich melde eine Abweichung</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Der Saldo laut unserer Buchführung weicht vom genannten Betrag ab.
              </p>
            </div>
          </label>
        </div>

        {/* Abweichungsfelder */}
        {hasDifference && (
          <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="space-y-1.5">
              <Label htmlFor="confirmedBalance">Saldo laut unserer Buchführung ({requestData.currency})</Label>
              <Input
                id="confirmedBalance"
                type="text"
                inputMode="decimal"
                placeholder="z. B. 12.345,67"
                value={confirmedBalance}
                onChange={(e) => setConfirmedBalance(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                Geben Sie den Betrag in {requestData.currency} an, ggf. mit Dezimalstellen.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="differenceNote">
                Erläuterung der Abweichung <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="differenceNote"
                placeholder="Bitte erläutern Sie die Ursache der Abweichung ..."
                rows={4}
                value={differenceNote}
                onChange={(e) => setDifferenceNote(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Datei-Upload */}
        <div className="space-y-2">
          <Label>Beleg hochladen (optional)</Label>

          {uploadFile ? (
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400 shrink-0" />
              ) : (
                <Paperclip className="h-4 w-4 text-slate-400 shrink-0" />
              )}
              <span className="text-sm text-slate-700 flex-1 truncate">{uploadFile.name}</span>
              {isUploading ? (
                <span className="text-xs text-slate-500">Wird hochgeladen ...</span>
              ) : uploadedKey ? (
                <span className="text-xs text-emerald-600 font-medium">Hochgeladen</span>
              ) : null}
              {!isUploading && (
                <button
                  type="button"
                  onClick={removeFile}
                  className="text-slate-400 hover:text-slate-600 shrink-0"
                  aria-label="Datei entfernen"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <label className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-3 cursor-pointer hover:border-slate-400 transition-colors">
              <Paperclip className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600">Datei auswählen</span>
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.docx,.doc,.csv"
                onChange={handleFileChange}
              />
            </label>
          )}

          {uploadError && (
            <p className="text-xs text-red-600">{uploadError}</p>
          )}

          <p className="text-xs text-slate-400">
            Erlaubte Formate: PDF, JPG, PNG, XLSX, XLS, DOCX, DOC, CSV — max. 20 MB
          </p>
        </div>

        {/* Datenschutz */}
        <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <input
            id="privacy"
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-emerald-600 shrink-0"
            checked={privacyAccepted}
            onChange={(e) => setPrivacyAccepted(e.target.checked)}
          />
          <label htmlFor="privacy" className="text-sm text-slate-600 cursor-pointer leading-relaxed">
            Ich stimme zu, dass meine Angaben zur Prüfungsdokumentation gespeichert werden. Die
            Daten werden ausschließlich im Rahmen der gesetzlichen Aufbewahrungspflichten verwendet.
          </label>
        </div>

        {/* Fehler */}
        {submitError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={isSubmitting || isUploading}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Wird übermittelt ...
            </>
          ) : (
            'Antwort absenden'
          )}
        </Button>

        <p className="text-xs text-center text-slate-400">
          Ihre Angaben werden verschlüsselt übertragen und sicher gespeichert.
        </p>
      </form>
    </div>
  );
}

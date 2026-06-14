'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useRef, useState } from 'react';
import type {
  PublicPortalResult,
  PublicPortalState,
  PublicRequestData,
} from '@/lib/public-response';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileCheck2,
  Loader2,
  Paperclip,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PortalStatusCard } from '@/components/public-response/portal-status-card';
import { PublicRequestSummary, formatBalance } from '@/components/public-response/request-summary';

type ClientPageState = PublicPortalState | 'success' | 'error';

function resultData(result: PublicPortalResult): PublicRequestData | null {
  return 'data' in result ? result.data : null;
}

function resultMessage(result: PublicPortalResult): string {
  return 'message' in result ? result.message : '';
}

function parseAmountInput(value: string): number | null {
  const parsed = Number.parseFloat(value.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export function ResponsePortal({
  token,
  initialResult,
}: {
  token: string;
  initialResult: PublicPortalResult;
}) {
  const [pageState, setPageState] = useState<ClientPageState>(initialResult.state);
  const [requestData] = useState<PublicRequestData | null>(resultData(initialResult));
  const [errorMessage, setErrorMessage] = useState(resultMessage(initialResult));

  const [respondedBy, setRespondedBy] = useState('');
  const [hasDifference, setHasDifference] = useState(false);
  const [confirmedBalance, setConfirmedBalance] = useState('');
  const [differenceNote, setDifferenceNote] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOpenConfirmation = requestData?.confirmationMethod === 'OPEN';

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError('Die Datei ist zu groß. Maximale Dateigröße: 20 MB.');
      return;
    }

    setUploadFile(file);
    setUploadError('');
    setUploadedKey(null);
    setIsUploading(true);

    try {
      const uploadRes = await fetch(`/api/r/${token}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, mimeType: file.type }),
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        setUploadError(uploadData.error ?? 'Upload konnte nicht vorbereitet werden.');
        setUploadFile(null);
        return;
      }

      const putRes = await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!putRes.ok) {
        setUploadError('Der Upload ist fehlgeschlagen. Bitte versuchen Sie es erneut.');
        setUploadFile(null);
        return;
      }

      setUploadedKey(uploadData.obsKey);
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

  async function handleSubmit(e: FormEvent) {
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

    if (isOpenConfirmation && !confirmedBalance.trim()) {
      setSubmitError('Bitte geben Sie den Saldo laut Ihrer Buchführung an.');
      return;
    }

    if (!isOpenConfirmation && hasDifference && !differenceNote.trim()) {
      setSubmitError('Bitte erläutern Sie die Abweichung.');
      return;
    }

    if (isUploading) {
      setSubmitError('Bitte warten Sie, bis der Upload abgeschlossen ist.');
      return;
    }

    const parsedBalance = confirmedBalance.trim() ? parseAmountInput(confirmedBalance) : null;
    if ((isOpenConfirmation || hasDifference) && confirmedBalance.trim() && parsedBalance === null) {
      setSubmitError('Bitte geben Sie einen gültigen Saldo ein.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        respondedBy: respondedBy.trim(),
        hasDifference: isOpenConfirmation ? false : hasDifference,
        differenceNote: differenceNote.trim() || null,
        attachmentKey: uploadedKey ?? null,
        privacyAccepted,
      };

      if (parsedBalance !== null) payload.confirmedBalance = parsedBalance;

      const res = await fetch(`/api/r/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.state) setPageState(data.state);
        setSubmitError(data.error ?? 'Die Antwort konnte nicht übermittelt werden.');
        setErrorMessage(data.error ?? '');
        return;
      }

      setPageState('success');
    } catch {
      setSubmitError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (pageState === 'expired') {
    return (
      <PortalStatusCard icon={Clock} tone="warning" title="Link abgelaufen">
        <p>{errorMessage || 'Der Bestätigungslink ist nicht mehr gültig.'}</p>
        <p>Bitte wenden Sie sich an die Kanzlei, die Ihnen dieses Schreiben zugesandt hat.</p>
      </PortalStatusCard>
    );
  }

  if (pageState === 'already_responded') {
    return (
      <PortalStatusCard icon={CheckCircle} tone="success" title="Antwort bereits eingegangen">
        <p>Wir haben Ihre Antwort bereits erhalten. Vielen Dank für Ihre Mitwirkung.</p>
        {requestData ? <p>Vorgang: {requestData.clientName}</p> : null}
      </PortalStatusCard>
    );
  }

  if (pageState === 'closed') {
    return (
      <PortalStatusCard icon={AlertCircle} tone="info" title="Vorgang abgeschlossen">
        <p>{errorMessage || 'Dieser Vorgang wurde bereits abgeschlossen und ist nicht mehr zugänglich.'}</p>
      </PortalStatusCard>
    );
  }

  if (pageState === 'inactive' || pageState === 'not_found' || pageState === 'error') {
    return (
      <PortalStatusCard icon={AlertCircle} tone="danger" title="Antwortportal nicht verfügbar">
        <p>{errorMessage || 'Die Anfrage konnte nicht geladen werden.'}</p>
      </PortalStatusCard>
    );
  }

  if (pageState === 'success') {
    return (
      <PortalStatusCard icon={CheckCircle} tone="success" title="Vielen Dank für Ihre Antwort">
        <p>Ihre Saldobestätigung wurde erfolgreich übermittelt und der Prüfungsdokumentation beigefügt.</p>
        {requestData ? <p>Die Bestätigung wurde für {requestData.clientName} gespeichert.</p> : null}
      </PortalStatusCard>
    );
  }

  if (!requestData) return null;

  const balanceFormatted = formatBalance(requestData.expectedBalance, requestData.currency);
  const canSubmit =
    privacyAccepted &&
    !isSubmitting &&
    !isUploading &&
    (!isOpenConfirmation || confirmedBalance.trim().length > 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-lg border border-dataly-line bg-white p-5 shadow-[0_1px_2px_rgba(16,32,51,0.04)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-dataly-navy text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-dataly-blue">Dataly Antwortportal</p>
              <h1 className="mt-1 text-[28px] font-semibold leading-9 text-dataly-ink">
                {isOpenConfirmation ? 'Saldo mitteilen' : 'Saldo bestätigen'}
              </h1>
              <p className="mt-2 text-sm leading-[22px] text-dataly-slate">
                {isOpenConfirmation
                  ? 'Bitte teilen Sie den Saldo laut Ihrer Buchführung zum angegebenen Stichtag direkt an Dataly mit.'
                  : 'Bitte prüfen Sie den angefragten Saldo und senden Sie Ihre Bestätigung oder Abweichung direkt an Dataly zurück.'}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-md border border-dataly-line bg-dataly-surface-subtle px-3 py-2 text-xs font-semibold text-dataly-slate">
            <FileCheck2 className="h-4 w-4 text-dataly-blue" />
            <span>{requestData.clientName}</span>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
        <div className="space-y-5 lg:sticky lg:top-6">
          <PublicRequestSummary request={requestData} />

          <section className="rounded-lg border border-dataly-line bg-white p-4 text-sm leading-[22px] text-dataly-slate">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-dataly-info-soft text-dataly-info">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-dataly-ink">Sichere Übermittlung</h2>
                <p className="mt-1">
                  Ihre Antwort wird verschlüsselt übertragen und direkt dem Prüfungsnachweis zugeordnet.
                </p>
              </div>
            </div>
          </section>
        </div>

        <Card className="overflow-hidden">
          <div className="border-b border-dataly-line bg-dataly-surface-subtle px-5 py-4">
            <p className="text-xs font-semibold uppercase text-dataly-slate">Rückmeldung erfassen</p>
            <h2 className="mt-1 text-base font-semibold leading-6 text-dataly-ink">
              {isOpenConfirmation ? 'Ihr Saldo' : 'Ihre Bestätigung'}
            </h2>
          </div>
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="respondedBy">
                  Ihr Name / Position <span className="text-dataly-danger">*</span>
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

              {isOpenConfirmation ? (
                <div className="space-y-4 rounded-lg border border-dataly-line bg-dataly-surface-subtle p-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmedBalance">
                      Saldo laut Ihrer Buchführung ({requestData.currency}){' '}
                      <span className="text-dataly-danger">*</span>
                    </Label>
                    <Input
                      id="confirmedBalance"
                      type="text"
                      inputMode="decimal"
                      placeholder="z. B. 12.345,67"
                      value={confirmedBalance}
                      onChange={(e) => setConfirmedBalance(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="differenceNote">Erläuterung oder Hinweise (optional)</Label>
                    <Textarea
                      id="differenceNote"
                      placeholder="Optional: Geben Sie Hinweise zur Zusammensetzung oder zu offenen Posten an."
                      rows={4}
                      value={differenceNote}
                      onChange={(e) => setDifferenceNote(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <Label>
                      Saldobestätigung <span className="text-dataly-danger">*</span>
                    </Label>

                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                        !hasDifference
                          ? 'border-dataly-blue bg-dataly-info-soft'
                          : 'border-dataly-line hover:border-dataly-line-strong'
                      }`}
                    >
                      <input
                        type="radio"
                        name="hasDifference"
                        className="mt-1 accent-dataly-blue"
                        checked={!hasDifference}
                        onChange={() => setHasDifference(false)}
                      />
                      <span>
                        <span className="block text-sm font-semibold text-dataly-ink">
                          Ich bestätige den Saldo von {balanceFormatted}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-dataly-slate">
                          Der genannte Saldo stimmt mit unserer Buchführung überein.
                        </span>
                      </span>
                    </label>

                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                        hasDifference
                          ? 'border-dataly-warning bg-dataly-warning-soft'
                          : 'border-dataly-line hover:border-dataly-line-strong'
                      }`}
                    >
                      <input
                        type="radio"
                        name="hasDifference"
                        className="mt-1 accent-dataly-warning"
                        checked={hasDifference}
                        onChange={() => setHasDifference(true)}
                      />
                      <span>
                        <span className="block text-sm font-semibold text-dataly-ink">
                          Ich melde eine Abweichung
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-dataly-slate">
                          Der Saldo laut unserer Buchführung weicht vom angefragten Betrag ab.
                        </span>
                      </span>
                    </label>
                  </div>

                  {hasDifference ? (
                    <div className="space-y-4 rounded-lg border border-dataly-warning/30 bg-dataly-warning-soft p-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="confirmedBalance">
                          Saldo laut unserer Buchführung ({requestData.currency})
                        </Label>
                        <Input
                          id="confirmedBalance"
                          type="text"
                          inputMode="decimal"
                          placeholder="z. B. 12.345,67"
                          value={confirmedBalance}
                          onChange={(e) => setConfirmedBalance(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="differenceNote">
                          Erläuterung der Abweichung <span className="text-dataly-danger">*</span>
                        </Label>
                        <Textarea
                          id="differenceNote"
                          placeholder="Bitte erläutern Sie die Ursache der Abweichung."
                          rows={4}
                          value={differenceNote}
                          onChange={(e) => setDifferenceNote(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : null}
                </>
              )}

              <div className="space-y-2">
                <Label>Beleg hochladen (optional)</Label>

                {uploadFile ? (
                  <div className="flex items-center gap-3 rounded-lg border border-dataly-line bg-dataly-surface-subtle px-3 py-2">
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-dataly-muted" />
                    ) : (
                      <Paperclip className="h-4 w-4 shrink-0 text-dataly-muted" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm text-dataly-ink">{uploadFile.name}</span>
                    {isUploading ? (
                      <span className="text-xs text-dataly-slate">Wird hochgeladen...</span>
                    ) : uploadedKey ? (
                      <span className="text-xs font-semibold text-dataly-success">Hochgeladen</span>
                    ) : null}
                    {!isUploading ? (
                      <button
                        type="button"
                        onClick={removeFile}
                        className="shrink-0 rounded-sm text-dataly-muted hover:text-dataly-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dataly-blue"
                        aria-label="Datei entfernen"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-dataly-line-strong px-4 py-3 transition-colors hover:bg-dataly-surface-subtle">
                    <Paperclip className="h-4 w-4 text-dataly-muted" />
                    <span className="text-sm text-dataly-slate">Datei auswählen</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="sr-only"
                      accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.docx,.doc,.csv"
                      onChange={handleFileChange}
                    />
                  </label>
                )}

                {uploadError ? <p className="text-xs text-dataly-danger">{uploadError}</p> : null}
                <p className="text-xs leading-5 text-dataly-muted">
                  Erlaubte Formate: PDF, JPG, PNG, XLSX, XLS, DOCX, DOC, CSV. Maximal 20 MB.
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-dataly-line bg-dataly-surface-subtle p-4">
                <input
                  id="privacy"
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-dataly-blue"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                />
                <label htmlFor="privacy" className="cursor-pointer text-sm leading-[22px] text-dataly-slate">
                  Ich stimme zu, dass meine Angaben zur Prüfungsdokumentation gespeichert und im Rahmen
                  der gesetzlichen Aufbewahrungspflichten verwendet werden.
                </label>
              </div>

              {submitError ? (
                <div className="flex items-start gap-2 rounded-lg border border-dataly-danger/30 bg-dataly-danger-soft px-4 py-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-dataly-danger" />
                  <p className="text-sm text-dataly-danger">{submitError}</p>
                </div>
              ) : null}

              <Button type="submit" className="w-full" disabled={!canSubmit}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Wird übermittelt...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Antwort absenden
                  </>
                )}
              </Button>

              <p className="text-center text-xs leading-5 text-dataly-muted">
                Ihre Angaben werden verschlüsselt übertragen und sicher gespeichert.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

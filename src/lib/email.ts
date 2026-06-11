import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.BREVO_SMTP_HOST ?? 'smtp-relay.brevo.com';
const SMTP_PORT = Number(process.env.BREVO_SMTP_PORT ?? 587);
const SMTP_USER = process.env.BREVO_SMTP_USERNAME ?? process.env.BREVO_LOGIN ?? '';
const SMTP_PASSWORD = process.env.BREVO_SMTP_PASSWORD ?? process.env.BREVO_SMTP_KEY ?? '';
const MAIL_FROM_ADDRESS = process.env.MAIL_FROM_ADDRESS ?? process.env.BREVO_LOGIN ?? '';
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME ?? '';

function createTransporter() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });
}

function isEmailConfigured() {
  return Boolean(SMTP_USER && SMTP_PASSWORD && MAIL_FROM_ADDRESS);
}

function fromAddress(fallbackName: string) {
  const displayName = MAIL_FROM_NAME || fallbackName;
  return `"${displayName}" <${MAIL_FROM_ADDRESS}>`;
}

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });
}

function parseAmount(value: string): number {
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

function formatCurrencyAmount(value: string, currency: string): string {
  const amount = parseAmount(value);
  const safeCurrency = currency || 'EUR';

  if (Number.isNaN(amount)) return `${value} ${safeCurrency}`;

  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: safeCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)} ${safeCurrency}`;
  }
}

interface EmailDetail {
  label: string;
  value: string;
  strong?: boolean;
}

interface EmailLayoutData {
  subjectLabel: string;
  title: string;
  introHtml: string;
  details?: EmailDetail[];
  buttonLabel?: string;
  buttonUrl?: string;
  noticeHtml?: string;
  footerHtml?: string;
}

function buildDetailTable(details: EmailDetail[] = []): string {
  if (details.length === 0) return '';

  const rows = details.map((detail, index) => `
    <tr>
      <td style="padding: 13px 16px; border-top: ${index === 0 ? '0' : '1px solid #d9e2ec'}; background: #f8fafc; color: #53657a; font-size: 13px; line-height: 20px; font-weight: 600; width: 40%;">
        ${escapeHtml(detail.label)}
      </td>
      <td style="padding: 13px 16px; border-top: ${index === 0 ? '0' : '1px solid #d9e2ec'}; color: #102033; font-size: ${detail.strong ? '18px' : '14px'}; line-height: 22px; font-weight: ${detail.strong ? '700' : '500'};">
        ${escapeHtml(detail.value)}
      </td>
    </tr>
  `).join('');

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin: 24px 0; border: 1px solid #d9e2ec; border-radius: 8px; overflow: hidden;">
      ${rows}
    </table>
  `;
}

function buildEmailLayout(data: EmailLayoutData): string {
  const details = buildDetailTable(data.details);
  const button = data.buttonUrl && data.buttonLabel ? `
    <tr>
      <td align="center" style="padding: 6px 0 26px;">
        <a href="${escapeHtml(data.buttonUrl)}" style="display: inline-block; min-width: 190px; padding: 14px 24px; background: #1e63e9; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; line-height: 20px; font-weight: 700; text-align: center;">
          ${escapeHtml(data.buttonLabel)}
        </a>
      </td>
    </tr>
  ` : '';

  const notice = data.noticeHtml ? `
    <tr>
      <td style="padding: 0 0 22px;">
        <div style="border: 1px solid #d9e2ec; background: #f8fafc; border-radius: 8px; padding: 14px 16px; color: #53657a; font-size: 13px; line-height: 20px;">
          ${data.noticeHtml}
        </div>
      </td>
    </tr>
  ` : '';

  return `
    <div style="margin: 0; padding: 0; background: #f5f7fa;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; background: #f5f7fa;">
        <tr>
          <td align="center" style="padding: 32px 12px;">
            <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 640px; border-collapse: collapse;">
              <tr>
                <td style="background: #0b2d5c; padding: 24px 30px; border-radius: 10px 10px 0 0;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                    <tr>
                      <td>
                        <div style="color: #ffffff; font-family: IBM Plex Sans, Segoe UI, Arial, sans-serif; font-size: 20px; line-height: 26px; font-weight: 700;">Dataly</div>
                        <div style="margin-top: 4px; color: #d9e2ec; font-family: IBM Plex Sans, Segoe UI, Arial, sans-serif; font-size: 12px; line-height: 18px; font-weight: 500;">Prüfungsplattform</div>
                      </td>
                      <td align="right" style="vertical-align: top;">
                        <span style="display: inline-block; border: 1px solid rgba(255,255,255,0.28); border-radius: 999px; padding: 5px 10px; color: #ffffff; font-family: IBM Plex Sans, Segoe UI, Arial, sans-serif; font-size: 11px; line-height: 14px; font-weight: 700;">
                          ${escapeHtml(data.subjectLabel)}
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="background: #ffffff; border: 1px solid #d9e2ec; border-top: 0; border-radius: 0 0 10px 10px; padding: 30px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; font-family: IBM Plex Sans, Segoe UI, Arial, sans-serif; color: #102033;">
                    <tr>
                      <td style="padding: 0 0 10px;">
                        <h1 style="margin: 0; color: #0b2d5c; font-size: 22px; line-height: 30px; font-weight: 700;">${escapeHtml(data.title)}</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 0; color: #102033; font-size: 14px; line-height: 22px;">
                        ${data.introHtml}
                      </td>
                    </tr>
                    <tr>
                      <td>${details}</td>
                    </tr>
                    ${notice}
                    ${button}
                    <tr>
                      <td style="border-top: 1px solid #d9e2ec; padding-top: 16px; color: #53657a; font-size: 12px; line-height: 18px;">
                        ${data.footerHtml ?? 'Diese Nachricht wurde automatisch durch Dataly versendet.'}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

export interface ConfirmationEmailData {
  to: string;
  partnerName: string;
  kanzleiName: string;
  expectedBalance: string;
  currency: string;
  balanceDate: string;
  portalUrl: string;
  expiresAt: string;
}

function buildConfirmationHtml(
  data: ConfirmationEmailData,
  variant: 'request' | 'reminder' = 'request'
): string {
  const balanceFormatted = formatCurrencyAmount(data.expectedBalance, data.currency);
  const safeBalanceDate = escapeHtml(data.balanceDate);
  const safeExpiresAt = escapeHtml(data.expiresAt);
  const isReminder = variant === 'reminder';

  return buildEmailLayout({
    subjectLabel: isReminder ? 'Erinnerung' : 'Saldobestätigung',
    title: isReminder ? 'Erinnerung zur Saldenbestätigung' : 'Saldenbestätigung',
    introHtml: `
      <p style="margin: 0 0 12px;">Sehr geehrte Damen und Herren,</p>
      <p style="margin: 0;">
        ${isReminder ? 'zu dieser Anfrage liegt noch keine Rückmeldung vor.' : 'im Rahmen unserer Prüfung bitten wir Sie um Rückmeldung zu folgendem Saldo.'}
        Bitte prüfen Sie die Angaben und antworten Sie über das sichere Dataly-Portal.
      </p>
    `,
    details: [
      { label: 'Geschäftspartner', value: data.kanzleiName },
      { label: 'Stichtag', value: safeBalanceDate },
      { label: 'Saldo laut Buchführung', value: balanceFormatted, strong: true },
      { label: 'Rückmeldung bis', value: safeExpiresAt },
    ],
    buttonLabel: 'Zum Antwortportal',
    buttonUrl: data.portalUrl,
    noticeHtml: `
      Der Link ist bis zum <strong style="color: #102033;">${safeExpiresAt}</strong> gültig und kann nur für diese Anfrage verwendet werden.
      Bei Fragen wenden Sie sich bitte direkt an Ihre Prüfungsstelle.
    `,
  });
}

export async function sendConfirmationEmail(data: ConfirmationEmailData): Promise<void> {
  if (!isEmailConfigured()) {
    console.log('[email] BREVO nicht konfiguriert — E-Mail-Versand übersprungen', {
      to: data.to,
      subject: `Saldenbestätigung zum ${data.balanceDate} — Bitte um Rückmeldung`,
    });
    return;
  }

  const transporter = createTransporter();
  await transporter.sendMail({
    from: fromAddress(data.kanzleiName),
    to: data.to,
    subject: `Saldenbestätigung zum ${data.balanceDate} — Bitte um Rückmeldung`,
    html: buildConfirmationHtml(data),
  });
}

export async function sendReminderEmail(data: ConfirmationEmailData): Promise<void> {
  if (!isEmailConfigured()) {
    console.log('[email] BREVO nicht konfiguriert - E-Mail-Versand uebersprungen', {
      to: data.to,
      subject: `Erinnerung: Saldenbestaetigung zum ${data.balanceDate} noch ausstehend`,
    });
    return;
  }

  const transporter = createTransporter();
  await transporter.sendMail({
    from: fromAddress(data.kanzleiName),
    to: data.to,
    subject: `Erinnerung: Saldenbestätigung zum ${data.balanceDate} noch ausstehend`,
    html: buildConfirmationHtml(data, 'reminder'),
  });
}

interface SimpleMailData {
  to: string;
  subject: string;
  title: string;
  intro: string;
  buttonLabel?: string;
  buttonUrl?: string;
  details?: Array<{ label: string; value: string }>;
}

function buildSimpleHtml(data: SimpleMailData): string {
  return buildEmailLayout({
    subjectLabel: 'Dataly',
    title: data.title,
    introHtml: `<p style="margin: 0;">${escapeHtml(data.intro)}</p>`,
    details: data.details?.map((detail) => ({
      label: detail.label,
      value: detail.value,
    })),
    buttonLabel: data.buttonLabel,
    buttonUrl: data.buttonUrl,
  });
}

async function sendSimpleMail(data: SimpleMailData): Promise<void> {
  if (!isEmailConfigured()) {
    console.log('[email] BREVO nicht konfiguriert - E-Mail-Versand uebersprungen', {
      to: data.to,
      subject: data.subject,
    });
    return;
  }

  const transporter = createTransporter();
  await transporter.sendMail({
    from: fromAddress('Dataly'),
    to: data.to,
    subject: data.subject,
    html: buildSimpleHtml(data),
  });
}

export async function sendMandantInviteEmail(data: {
  to: string;
  name: string;
  mandantName: string;
  inviteUrl: string;
  expiresAt: string;
}): Promise<void> {
  await sendSimpleMail({
    to: data.to,
    subject: `Einladung zu Dataly - ${data.mandantName}`,
    title: 'Einladung zu Dataly',
    intro: `Hallo ${data.name}, Sie wurden zum Mandantenbereich ${data.mandantName} eingeladen. Bitte legen Sie Ihr Passwort ueber den folgenden Link fest.`,
    buttonLabel: 'Einladung annehmen',
    buttonUrl: data.inviteUrl,
    details: [
      { label: 'Mandant', value: data.mandantName },
      { label: 'Gueltig bis', value: data.expiresAt },
    ],
  });
}

export async function sendPbcUploadDigestEmail(data: {
  to: string;
  listTitle: string;
  mandantName: string;
  uploadCount: number;
  fileNames: string[];
  listUrl: string;
}): Promise<void> {
  await sendSimpleMail({
    to: data.to,
    subject: `Neue Uploads in Dataly - ${data.listTitle}`,
    title: 'Neue Dokumente hochgeladen',
    intro: `Im Dokumentenaustausch für ${data.mandantName} wurden neue Dateien hochgeladen.`,
    buttonLabel: 'Anforderungsliste öffnen',
    buttonUrl: data.listUrl,
    details: [
      { label: 'Anforderungsliste', value: data.listTitle },
      { label: 'Dateien', value: String(data.uploadCount) },
      { label: 'Auszug', value: data.fileNames.slice(0, 8).join(', ') || 'Keine Dateinamen verfügbar' },
    ],
  });
}

export async function sendPbcMandantRequestEmail(data: {
  to: string;
  listTitle: string;
  mandantName: string;
  listUrl: string;
}): Promise<void> {
  await sendSimpleMail({
    to: data.to,
    subject: `Bitte prüfen: ${data.listTitle}`,
    title: 'Anforderungsliste prüfen',
    intro: `Die Kanzlei bittet Sie, die Anforderungsliste für ${data.mandantName} zu prüfen.`,
    buttonLabel: 'Anforderungsliste öffnen',
    buttonUrl: data.listUrl,
    details: [
      { label: 'Mandant', value: data.mandantName },
      { label: 'Anforderungsliste', value: data.listTitle },
    ],
  });
}

export async function sendSbaResponseNotificationEmail(data: {
  to: string;
  campaignTitle: string;
  partnerName: string;
  mandantName: string;
  campaignUrl: string;
}): Promise<void> {
  await sendSimpleMail({
    to: data.to,
    subject: `SBA-Rückmeldung eingegangen - ${data.campaignTitle}`,
    title: 'Rückmeldung eingegangen',
    intro: 'Zu einer Saldenbestätigungs-Kampagne ist eine neue Rückmeldung eingegangen.',
    buttonLabel: 'Kampagne öffnen',
    buttonUrl: data.campaignUrl,
    details: [
      { label: 'Mandant', value: data.mandantName },
      { label: 'Kampagne', value: data.campaignTitle },
      { label: 'Partner', value: data.partnerName },
    ],
  });
}

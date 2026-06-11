import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.BREVO_SMTP_HOST ?? 'smtp-relay.brevo.com';
const SMTP_PORT = Number(process.env.BREVO_SMTP_PORT ?? 587);
const SMTP_USER = process.env.BREVO_SMTP_USERNAME ?? process.env.BREVO_LOGIN ?? '';
const SMTP_PASSWORD = process.env.BREVO_SMTP_PASSWORD ?? process.env.BREVO_SMTP_KEY ?? '';
const MAIL_FROM_ADDRESS = process.env.MAIL_FROM_ADDRESS ?? process.env.BREVO_LOGIN ?? '';
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME ?? '';

const MAIL_FONT = "'IBM Plex Sans', Arial, sans-serif";
const NAVY = '#0B2D5C';
const BLUE = '#1E63E9';
const PAPER = '#F5F7FA';
const SURFACE_SUBTLE = '#F8FAFC';
const LINE = '#D9E2EC';
const INK = '#102033';
const SLATE = '#53657A';
const MUTED = '#7A8A9E';
const WARNING = '#B7791F';
const WARNING_SOFT = '#FFF4D6';

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
  const displayName = (MAIL_FROM_NAME || fallbackName).replace(/"/g, "'");
  return `"${displayName}" <${MAIL_FROM_ADDRESS}>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
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

function parseDecimal(value: string): number {
  const compact = value.trim().replace(/\s/g, '');
  const commaIndex = compact.lastIndexOf(',');
  const dotIndex = compact.lastIndexOf('.');

  if (commaIndex > dotIndex) {
    return Number.parseFloat(compact.replace(/\./g, '').replace(',', '.'));
  }

  if (dotIndex > -1) {
    const fraction = compact.slice(dotIndex + 1);
    const looksLikeGermanThousands = commaIndex === -1 && fraction.length === 3;
    return Number.parseFloat(
      looksLikeGermanThousands ? compact.replace(/\./g, '') : compact.replace(/,/g, '')
    );
  }

  return Number.parseFloat(compact);
}

function formatCurrency(value: string, currency: string): string {
  const amount = parseDecimal(value);
  const safeCurrency = currency || 'EUR';

  if (Number.isNaN(amount)) {
    return `${value} ${safeCurrency}`;
  }

  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: safeCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${safeCurrency}`;
  }
}

function buildEmailShell({
  preheader,
  title,
  eyebrow,
  children,
}: {
  preheader: string;
  title: string;
  eyebrow: string;
  children: string;
}) {
  return `
<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0; padding:0; background:${PAPER};">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
      ${escapeHtml(preheader)}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%; background:${PAPER}; border-collapse:collapse;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%; max-width:640px; border-collapse:separate; border-spacing:0; font-family:${MAIL_FONT}; color:${INK};">
            <tr>
              <td style="background:${NAVY}; padding:24px 30px; border-radius:8px 8px 0 0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <tr>
                    <td>
                      <div style="font-size:20px; line-height:26px; font-weight:700; color:#ffffff;">Dataly</div>
                      <div style="margin-top:4px; font-size:13px; line-height:20px; color:#D9E2EC;">Pr&uuml;fungsplattform</div>
                    </td>
                    <td align="right" style="font-size:11px; line-height:14px; font-weight:700; letter-spacing:.03em; text-transform:uppercase; color:#D9E2EC;">
                      ${escapeHtml(eyebrow)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff; padding:30px; border-right:1px solid ${LINE}; border-bottom:1px solid ${LINE}; border-left:1px solid ${LINE}; border-radius:0 0 8px 8px;">
                ${children}
                <div style="margin-top:28px; padding-top:16px; border-top:1px solid ${LINE}; font-size:12px; line-height:18px; color:${SLATE};">
                  Diese Nachricht wurde automatisch durch Dataly versendet. Bitte verwenden Sie den Link nur, wenn Sie die Anfrage erwartet haben.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildCta(label: string, url: string) {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:28px auto 8px; border-collapse:collapse;">
      <tr>
        <td align="center" style="border-radius:6px; background:${BLUE};">
          <a href="${escapeHtml(url)}" style="display:inline-block; padding:14px 28px; min-width:190px; border-radius:6px; color:#ffffff; font-size:14px; line-height:18px; font-weight:700; text-align:center; text-decoration:none;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>`;
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

function buildDetailRows(details: Array<{ label: string; value: string; strong?: boolean }>) {
  return details
    .map(
      (detail, index) => `
        <tr style="background:${index % 2 === 0 ? SURFACE_SUBTLE : '#ffffff'};">
          <td style="padding:12px 14px; border:1px solid ${LINE}; width:38%; color:${INK}; font-size:13px; line-height:20px; font-weight:700;">
            ${escapeHtml(detail.label)}
          </td>
          <td style="padding:12px 14px; border:1px solid ${LINE}; color:${INK}; font-size:${detail.strong ? '18px' : '14px'}; line-height:${detail.strong ? '24px' : '22px'}; font-weight:${detail.strong ? '700' : '500'};">
            ${escapeHtml(detail.value)}
          </td>
        </tr>`
    )
    .join('');
}

function buildConfirmationHtml(data: ConfirmationEmailData, options?: { reminder?: boolean }): string {
  const title = options?.reminder ? 'Erinnerung zur Saldenbest\u00e4tigung' : 'Saldenbest\u00e4tigung';
  const balance = formatCurrency(data.expectedBalance, data.currency);
  const reminder = options?.reminder
    ? `
      <div style="margin-bottom:20px; padding:12px 14px; border:1px solid ${WARNING}; border-radius:6px; background:${WARNING_SOFT}; color:${INK}; font-size:13px; line-height:20px;">
        <strong style="color:${WARNING};">R&uuml;ckmeldung ausstehend:</strong>
        Bitte senden Sie Ihre Best&auml;tigung bis zum ${escapeHtml(data.expiresAt)}.
      </div>`
    : '';

  return buildEmailShell({
    preheader: `Bitte best\u00e4tigen Sie den Saldo zum ${data.balanceDate}.`,
    title: options?.reminder ? 'Erinnerung: Saldenbest\u00e4tigung' : 'Saldenbest\u00e4tigung',
    eyebrow: 'Saldenbest\u00e4tigung',
    children: `
      ${reminder}
      <h1 style="margin:0; color:${NAVY}; font-size:22px; line-height:30px; font-weight:700;">${title}</h1>
      <p style="margin:18px 0 0; color:${INK}; font-size:14px; line-height:22px;">Sehr geehrte Damen und Herren,</p>
      <p style="margin:12px 0 0; color:${INK}; font-size:14px; line-height:22px;">
        im Rahmen der Pr&uuml;fung bittet ${escapeHtml(data.kanzleiName)} Sie, den folgenden Saldo per
        <strong>${escapeHtml(data.balanceDate)}</strong> zu pr&uuml;fen und zu best&auml;tigen.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%; margin:22px 0; border-collapse:collapse;">
        ${buildDetailRows([
          { label: 'Ihr Gesch\u00e4ftspartner', value: data.kanzleiName },
          { label: 'Stichtag', value: data.balanceDate },
          { label: 'Saldo laut Buchf\u00fchrung', value: balance, strong: true },
        ])}
      </table>
      <p style="margin:0; color:${INK}; font-size:14px; line-height:22px;">
        Bitte geben Sie Ihre R&uuml;ckmeldung bis zum <strong>${escapeHtml(data.expiresAt)}</strong> &uuml;ber das sichere Antwortportal ab.
      </p>
      ${buildCta('Zum Antwortportal', data.portalUrl)}
      <p style="margin:16px 0 0; color:${MUTED}; font-size:12px; line-height:18px; text-align:center;">
        Der Link ist bis zum ${escapeHtml(data.expiresAt)} g&uuml;ltig und kann nur einmal verwendet werden.
      </p>
    `,
  });
}

function confirmationSubject(data: ConfirmationEmailData, reminder = false) {
  return reminder
    ? `Erinnerung: Saldenbest\u00e4tigung zum ${data.balanceDate} noch ausstehend`
    : `Saldenbest\u00e4tigung zum ${data.balanceDate} \u2014 Bitte um R\u00fcckmeldung`;
}

export async function sendConfirmationEmail(data: ConfirmationEmailData): Promise<void> {
  const subject = confirmationSubject(data);

  if (!isEmailConfigured()) {
    console.log('[email] BREVO nicht konfiguriert - E-Mail-Versand uebersprungen', {
      to: data.to,
      subject,
    });
    return;
  }

  const transporter = createTransporter();
  await transporter.sendMail({
    from: fromAddress(data.kanzleiName),
    to: data.to,
    subject,
    html: buildConfirmationHtml(data),
  });
}

export async function sendReminderEmail(data: ConfirmationEmailData): Promise<void> {
  const subject = confirmationSubject(data, true);

  if (!isEmailConfigured()) {
    console.log('[email] BREVO nicht konfiguriert - E-Mail-Versand uebersprungen', {
      to: data.to,
      subject,
    });
    return;
  }

  const transporter = createTransporter();
  await transporter.sendMail({
    from: fromAddress(data.kanzleiName),
    to: data.to,
    subject,
    html: buildConfirmationHtml(data, { reminder: true }),
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
  eyebrow?: string;
}

function buildSimpleHtml(data: SimpleMailData): string {
  const detailRows = data.details ? buildDetailRows(data.details) : '';

  return buildEmailShell({
    preheader: data.intro,
    title: data.title,
    eyebrow: data.eyebrow ?? 'Pr\u00fcfungsplattform',
    children: `
      <h1 style="margin:0; color:${NAVY}; font-size:22px; line-height:30px; font-weight:700;">${escapeHtml(data.title)}</h1>
      <p style="margin:14px 0 0; color:${INK}; font-size:14px; line-height:22px;">${escapeHtml(data.intro)}</p>
      ${
        detailRows
          ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%; margin:22px 0; border-collapse:collapse;">${detailRows}</table>`
          : ''
      }
      ${data.buttonUrl && data.buttonLabel ? buildCta(data.buttonLabel, data.buttonUrl) : ''}
    `,
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
    intro: `Hallo ${data.name}, Sie wurden zum Mandantenbereich ${data.mandantName} eingeladen. Bitte legen Sie Ihr Passwort \u00fcber den folgenden Link fest.`,
    buttonLabel: 'Einladung annehmen',
    buttonUrl: data.inviteUrl,
    details: [
      { label: 'Mandant', value: data.mandantName },
      { label: 'G\u00fcltig bis', value: data.expiresAt },
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
    intro: `Im Dokumentenaustausch f\u00fcr ${data.mandantName} wurden neue Dateien hochgeladen.`,
    buttonLabel: 'Anforderungsliste \u00f6ffnen',
    buttonUrl: data.listUrl,
    eyebrow: 'Dokumentenaustausch',
    details: [
      { label: 'Anforderungsliste', value: data.listTitle },
      { label: 'Dateien', value: String(data.uploadCount) },
      { label: 'Auszug', value: data.fileNames.slice(0, 8).join(', ') || 'Keine Dateinamen verf\u00fcgbar' },
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
    subject: `Bitte pr\u00fcfen: ${data.listTitle}`,
    title: 'Anforderungsliste pr\u00fcfen',
    intro: `Die Kanzlei bittet Sie, die Anforderungsliste f\u00fcr ${data.mandantName} zu pr\u00fcfen.`,
    buttonLabel: 'Anforderungsliste \u00f6ffnen',
    buttonUrl: data.listUrl,
    eyebrow: 'Dokumentenaustausch',
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
    subject: `SBA-R\u00fcckmeldung eingegangen - ${data.campaignTitle}`,
    title: 'R\u00fcckmeldung eingegangen',
    intro: 'Zu einer Saldenbest\u00e4tigungs-Kampagne ist eine neue R\u00fcckmeldung eingegangen.',
    buttonLabel: 'Kampagne \u00f6ffnen',
    buttonUrl: data.campaignUrl,
    details: [
      { label: 'Mandant', value: data.mandantName },
      { label: 'Kampagne', value: data.campaignTitle },
      { label: 'Partner', value: data.partnerName },
    ],
  });
}

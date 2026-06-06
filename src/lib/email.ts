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

function buildConfirmationHtml(data: ConfirmationEmailData): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
      <div style="background: #1e3a5f; padding: 24px 32px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 600;">Dataly</h1>
        <p style="color: #a8c4e0; margin: 4px 0 0; font-size: 13px;">Prüfungsplattform</p>
      </div>
      <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="margin-top: 0; color: #1e3a5f;">Saldenbestätigung</h2>
        <p>Sehr geehrte Damen und Herren,</p>
        <p>im Rahmen unserer Prüfung bitten wir Sie, den folgenden Saldo per <strong>${data.balanceDate}</strong> zu bestätigen:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr style="background: #f9fafb;">
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: 600; width: 40%;">Ihr Geschäftspartner</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">${data.kanzleiName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: 600;">Stichtag</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">${data.balanceDate}</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: 600;">Saldobetrag laut unserer Buchführung</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-size: 16px; font-weight: 700; color: #1e3a5f;">${data.expectedBalance} ${data.currency}</td>
          </tr>
        </table>
        <p>Bitte bestätigen Sie diesen Saldo bis zum <strong>${data.expiresAt}</strong> über unser sicheres Online-Portal:</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${data.portalUrl}" style="display: inline-block; padding: 14px 32px; background: #1e3a5f; color: white; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 600;">
            Zum Antwortportal
          </a>
        </div>
        <p style="color: #6b7280; font-size: 13px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          Dieser Link ist bis zum ${data.expiresAt} gültig und kann nur einmal verwendet werden.
          Bei Fragen wenden Sie sich bitte direkt an Ihre Prüfungsstelle.
        </p>
      </div>
    </div>
  `;
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
    console.log('[email] BREVO nicht konfiguriert — E-Mail-Versand übersprungen', {
      to: data.to,
      subject: `Erinnerung: Saldenbestätigung zum ${data.balanceDate} noch ausstehend`,
    });
    return;
  }

  const transporter = createTransporter();
  await transporter.sendMail({
    from: fromAddress(data.kanzleiName),
    to: data.to,
    subject: `Erinnerung: Saldenbestätigung zum ${data.balanceDate} noch ausstehend`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f59e0b; padding: 12px 24px; border-radius: 6px; margin-bottom: 16px;">
          <p style="margin: 0; color: #1a1a1a; font-weight: 600; font-size: 14px;">
            Erinnerung: Wir haben noch keine Rückmeldung erhalten.
          </p>
        </div>
        ${buildConfirmationHtml(data)}
      </div>
    `,
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
  const detailRows = data.details?.map((detail, index) => `
    <tr style="background: ${index % 2 === 0 ? '#f8fafc' : '#ffffff'};">
      <td style="padding: 10px 12px; border: 1px solid #d9e2ec; font-weight: 600; width: 36%;">${detail.label}</td>
      <td style="padding: 10px 12px; border: 1px solid #d9e2ec;">${detail.value}</td>
    </tr>
  `).join('') ?? '';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #102033;">
      <div style="background: #0b2d5c; padding: 22px 30px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 600;">Dataly</h1>
        <p style="color: #d9e2ec; margin: 4px 0 0; font-size: 13px;">Pruefungsplattform</p>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #d9e2ec; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="margin-top: 0; color: #0b2d5c;">${data.title}</h2>
        <p style="font-size: 14px; line-height: 22px;">${data.intro}</p>
        ${detailRows ? `<table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">${detailRows}</table>` : ''}
        ${data.buttonUrl && data.buttonLabel ? `
          <div style="text-align: center; margin: 28px 0;">
            <a href="${data.buttonUrl}" style="display: inline-block; padding: 13px 28px; background: #1e63e9; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
              ${data.buttonLabel}
            </a>
          </div>
        ` : ''}
        <p style="color: #53657a; font-size: 12px; border-top: 1px solid #d9e2ec; padding-top: 16px;">
          Diese Nachricht wurde automatisch durch Dataly versendet.
        </p>
      </div>
    </div>
  `;
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
    intro: `Im Dokumentenaustausch fuer ${data.mandantName} wurden neue Dateien hochgeladen.`,
    buttonLabel: 'Anforderungsliste oeffnen',
    buttonUrl: data.listUrl,
    details: [
      { label: 'Anforderungsliste', value: data.listTitle },
      { label: 'Dateien', value: String(data.uploadCount) },
      { label: 'Auszug', value: data.fileNames.slice(0, 8).join(', ') || 'Keine Dateinamen verfuegbar' },
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
    subject: `Bitte pruefen: ${data.listTitle}`,
    title: 'Anforderungsliste pruefen',
    intro: `Die Kanzlei bittet Sie, die Anforderungsliste fuer ${data.mandantName} zu pruefen.`,
    buttonLabel: 'Anforderungsliste oeffnen',
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
    subject: `SBA-Rueckmeldung eingegangen - ${data.campaignTitle}`,
    title: 'Rueckmeldung eingegangen',
    intro: 'Zu einer Saldenbestaetigungs-Kampagne ist eine neue Rueckmeldung eingegangen.',
    buttonLabel: 'Kampagne oeffnen',
    buttonUrl: data.campaignUrl,
    details: [
      { label: 'Mandant', value: data.mandantName },
      { label: 'Kampagne', value: data.campaignTitle },
      { label: 'Partner', value: data.partnerName },
    ],
  });
}

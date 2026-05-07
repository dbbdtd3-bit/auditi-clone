import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  auth: {
    user: process.env.BREVO_LOGIN!,
    pass: process.env.BREVO_SMTP_KEY!,
  },
});

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
        <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 600;">Auditi</h1>
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
  await transporter.sendMail({
    from: `"${data.kanzleiName}" <${process.env.BREVO_LOGIN}>`,
    to: data.to,
    subject: `Saldenbestätigung zum ${data.balanceDate} — Bitte um Rückmeldung`,
    html: buildConfirmationHtml(data),
  });
}

export async function sendReminderEmail(data: ConfirmationEmailData): Promise<void> {
  await transporter.sendMail({
    from: `"${data.kanzleiName}" <${process.env.BREVO_LOGIN}>`,
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

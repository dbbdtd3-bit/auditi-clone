/**
 * React Email template stub for Saldenbestätigung.
 *
 * Phase 1 verwendet nodemailer mit HTML-String direkt in lib/email.ts.
 * Dieses File ist ein Platzhalter für Phase 2, wenn React Email
 * (https://react.email) für typsichere E-Mail-Templates eingeführt wird.
 *
 * Installation für Phase 2:
 *   npm install @react-email/components react-email
 *
 * Dann kann dieses Template so gerendert werden:
 *   import { render } from '@react-email/render';
 *   const html = render(<ConfirmationRequestEmail {...data} />);
 */

export interface ConfirmationRequestEmailProps {
  partnerName: string;
  kanzleiName: string;
  expectedBalance: string;
  currency: string;
  balanceDate: string;
  portalUrl: string;
  expiresAt: string;
}

// Stub — wird in Phase 2 mit React Email implementiert
export function ConfirmationRequestEmail(_props: ConfirmationRequestEmailProps) {
  return null;
}

export default ConfirmationRequestEmail;

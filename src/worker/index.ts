import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { prisma } from '../lib/db';
import { sendConfirmationEmail, sendReminderEmail } from '../lib/email';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

new Worker(
  'email-dispatch',
  async (job) => {
    const { requestId } = job.data as { requestId: string };

    const request = await prisma.confirmationRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: {
        campaign: {
          include: {
            engagement: {
              include: { mandant: true },
            },
          },
        },
      },
    });

    const portalUrl = `${process.env.NEXTAUTH_URL}/r/${request.publicToken}`;
    const emailData = {
      to: request.partnerEmail,
      partnerName: request.partnerName,
      kanzleiName: request.campaign.engagement.mandant.name,
      expectedBalance: request.expectedBalance.toString(),
      currency: request.currency,
      balanceDate: request.campaign.balanceDate.toLocaleDateString('de-DE'),
      portalUrl,
      expiresAt: request.tokenExpiresAt.toLocaleDateString('de-DE'),
    };

    if (job.name === 'send-confirmation') {
      await sendConfirmationEmail(emailData);
      await prisma.confirmationRequest.update({
        where: { id: requestId },
        data: { status: 'SENT', sentAt: new Date() },
      });
      await prisma.auditEvent.create({
        data: { requestId, event: 'SENT', actor: 'system' },
      });
      console.log(`[worker] Confirmation sent for request ${requestId}`);
    }

    if (job.name === 'send-reminder') {
      await sendReminderEmail(emailData);
      await prisma.confirmationRequest.update({
        where: { id: requestId },
        data: {
          reminderCount: { increment: 1 },
          lastReminderAt: new Date(),
        },
      });
      await prisma.auditEvent.create({
        data: { requestId, event: 'REMINDER_SENT', actor: 'system' },
      });
      console.log(`[worker] Reminder sent for request ${requestId}`);
    }
  },
  { connection }
);

console.log('Auditi Worker gestartet — Queue: email-dispatch');

process.on('SIGTERM', async () => {
  console.log('Worker shutting down...');
  process.exit(0);
});

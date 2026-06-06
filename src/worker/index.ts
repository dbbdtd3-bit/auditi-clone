import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { prisma } from '../lib/db';
import {
  sendConfirmationEmail,
  sendPbcMandantRequestEmail,
  sendPbcUploadDigestEmail,
  sendReminderEmail,
  sendSbaResponseNotificationEmail,
} from '../lib/email';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const FIVE_MINUTES_MS = 5 * 60 * 1000;

function appUrl(path: string) {
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3100';
  return `${base.replace(/\/$/, '')}${path}`;
}

function uniqueRecipients<T extends { email: string }>(users: T[]): T[] {
  const seen = new Set<string>();
  return users.filter((user) => {
    const email = user.email.toLowerCase();
    if (seen.has(email)) return false;
    seen.add(email);
    return true;
  });
}

new Worker(
  'email-dispatch',
  async (job) => {
    if (job.name === 'send-pbc-upload-digest') {
      const { listId } = job.data as { listId: string };

      const list = await prisma.pbcRequestList.findUnique({
        where: { id: listId },
        include: {
          createdBy: { select: { id: true, email: true, status: true } },
          workspace: {
            include: {
              engagement: { include: { mandant: true } },
            },
          },
          notificationRecipients: {
            where: { audience: 'KANZLEI_UPLOADS' },
            include: { user: { select: { id: true, email: true, status: true } } },
          },
        },
      });

      if (!list?.uploadDigestStartedAt || !list.uploadDigestLastActivityAt) return;

      const quietForMs = Date.now() - list.uploadDigestLastActivityAt.getTime();
      if (quietForMs < FIVE_MINUTES_MS) return;

      const activities = await prisma.pbcActivity.findMany({
        where: {
          listId,
          event: 'FILE_UPLOADED',
          createdAt: {
            gte: list.uploadDigestStartedAt,
            lte: new Date(list.uploadDigestLastActivityAt.getTime() + 1000),
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const configured = list.notificationRecipients
        .map((recipient) => recipient.user)
        .filter((user) => user.status === 'ACTIVE');
      const fallback = list.createdBy?.status === 'ACTIVE' ? [list.createdBy] : [];
      const recipients = uniqueRecipients([...configured, ...fallback]);

      if (activities.length > 0 && recipients.length > 0) {
        const fileNames = activities
          .map((activity) => (activity.meta as { filename?: string } | null)?.filename)
          .filter((name): name is string => Boolean(name));

        await Promise.all(
          recipients.map((recipient) =>
            sendPbcUploadDigestEmail({
              to: recipient.email,
              listTitle: list.title,
              mandantName: list.workspace.engagement.mandant.name,
              uploadCount: activities.length,
              fileNames,
              listUrl: appUrl(`/pbc/${list.workspaceId}/lists/${list.id}`),
            })
          )
        );
      }

      await prisma.pbcRequestList.update({
        where: { id: listId },
        data: {
          uploadDigestStartedAt: null,
          uploadDigestLastActivityAt: null,
        },
      });
      console.log(`[worker] PBC upload digest processed for list ${listId}`);
      return;
    }

    if (job.name === 'send-pbc-mandant-notification') {
      const { listId } = job.data as { listId: string };

      const list = await prisma.pbcRequestList.findUnique({
        where: { id: listId },
        include: {
          workspace: {
            include: {
              engagement: { include: { mandant: true } },
            },
          },
          notificationRecipients: {
            where: { audience: 'MANDANT_REQUESTS' },
            include: { user: { select: { id: true, email: true, status: true } } },
          },
        },
      });

      if (!list) return;

      const configured = list.notificationRecipients
        .map((recipient) => recipient.user)
        .filter((user) => user.status === 'ACTIVE');
      const fallback = configured.length > 0
        ? []
        : (await prisma.userMandant.findMany({
            where: {
              mandantId: list.workspace.engagement.mandantId,
              role: 'MANDANT_ADMIN',
              user: { status: 'ACTIVE' },
            },
            include: { user: { select: { id: true, email: true, status: true } } },
          })).map((link) => link.user);
      const recipients = uniqueRecipients([...configured, ...fallback]);

      await Promise.all(
        recipients.map((recipient) =>
          sendPbcMandantRequestEmail({
            to: recipient.email,
            listTitle: list.title,
            mandantName: list.workspace.engagement.mandant.name,
            listUrl: appUrl(`/pbc/${list.workspaceId}/lists/${list.id}`),
          })
        )
      );
      console.log(`[worker] PBC mandant notification sent for list ${listId}`);
      return;
    }

    if (job.name === 'send-sba-response-notification') {
      const { requestId } = job.data as { requestId: string };

      const request = await prisma.confirmationRequest.findUniqueOrThrow({
        where: { id: requestId },
        include: {
          campaign: {
            include: {
              createdBy: { select: { id: true, email: true, status: true } },
              notificationRecipients: {
                include: { user: { select: { id: true, email: true, status: true } } },
              },
              engagement: {
                include: { mandant: true },
              },
            },
          },
        },
      });

      const configured = request.campaign.notificationRecipients
        .map((recipient) => recipient.user)
        .filter((user) => user.status === 'ACTIVE');
      const fallback = request.campaign.createdBy?.status === 'ACTIVE'
        ? [request.campaign.createdBy]
        : [];
      const recipients = uniqueRecipients([...configured, ...fallback]);

      await Promise.all(
        recipients.map((recipient) =>
          sendSbaResponseNotificationEmail({
            to: recipient.email,
            campaignTitle: request.campaign.title,
            partnerName: request.partnerName,
            mandantName: request.campaign.engagement.mandant.name,
            campaignUrl: appUrl(`/campaigns/${request.campaign.id}`),
          })
        )
      );
      console.log(`[worker] SBA response notification sent for request ${requestId}`);
      return;
    }

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

console.log('Dataly Worker gestartet — Queue: email-dispatch');

process.on('SIGTERM', async () => {
  console.log('Worker shutting down...');
  process.exit(0);
});

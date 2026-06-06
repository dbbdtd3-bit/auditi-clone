import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const emailQueue = new Queue('email-dispatch', { connection });

export async function enqueueConfirmationEmail(requestId: string): Promise<void> {
  await emailQueue.add(
    'send-confirmation',
    { requestId },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    }
  );
}

export async function enqueueReminder(requestId: string): Promise<void> {
  await emailQueue.add(
    'send-reminder',
    { requestId },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    }
  );
}

export async function enqueuePbcUploadDigest(listId: string): Promise<void> {
  await emailQueue.add(
    'send-pbc-upload-digest',
    { listId },
    {
      delay: 5 * 60 * 1000,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
    }
  );
}

export async function enqueuePbcMandantNotification(listId: string): Promise<void> {
  await emailQueue.add(
    'send-pbc-mandant-notification',
    { listId },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    }
  );
}

export async function enqueueSbaResponseNotification(requestId: string): Promise<void> {
  await emailQueue.add(
    'send-sba-response-notification',
    { requestId },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    }
  );
}

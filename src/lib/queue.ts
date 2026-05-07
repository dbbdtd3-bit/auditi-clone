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

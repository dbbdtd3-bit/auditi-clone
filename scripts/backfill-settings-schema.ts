/**
 * Backfills new User fields added in Phase 1:
 *   - status = ACTIVE for all existing users
 *   - kind   = WP for WP_* roles, CLIENT for MANDANT_* roles
 *   - UserMandant join table populated from User.mandantId
 *
 * Run once after `prisma db push`:
 *   npx ts-node scripts/backfill-settings-schema.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Backfilling User.status and User.kind…');

  const users = await prisma.user.findMany();
  let updated = 0;

  for (const user of users) {
    const kind = user.role === 'WP_ADMIN' || user.role === 'WP_TEAM' ? 'WP' : 'CLIENT';

    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'ACTIVE', kind: kind as never },
    });

    if (user.mandantId) {
      await prisma.userMandant.upsert({
        where: { userId_mandantId: { userId: user.id, mandantId: user.mandantId } },
        create: { userId: user.id, mandantId: user.mandantId },
        update: {},
      });
      console.log(`  Linked ${user.email} → mandantId ${user.mandantId}`);
    }

    updated++;
  }

  console.log(`Done. Updated ${updated} users.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

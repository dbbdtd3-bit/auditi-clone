import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@kanzlei.de';
  const password = process.env.ADMIN_PASSWORD || 'changeme123!';
  const name = process.env.ADMIN_NAME || 'Administrator';

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name, role: 'WP_ADMIN' },
    create: { email, name, role: 'WP_ADMIN', passwordHash },
  });

  console.log(`Admin-User angelegt/aktualisiert: ${user.email} (Rolle: ${user.role})`);
  console.log(`Passwort: ${password}`);
  console.log('Bitte Passwort nach dem ersten Login ändern!');
}

main()
  .catch((err) => {
    console.error('Seed fehlgeschlagen:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

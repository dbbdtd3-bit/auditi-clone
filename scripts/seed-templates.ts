import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEMPLATES = [
  {
    name: 'Standard-Jahresabschluss',
    description: 'Standardmäßige Unterlagensammlung für den Jahresabschluss',
    category: 'JAHRESABSCHLUSS',
    isBuiltIn: true,
    items: [
      { title: 'Kontennachweis aller Bilanzpositionen', sortOrder: 0 },
      { title: 'Anlagenverzeichnis / Anlagenspiegel', description: 'Mit Zu- und Abgängen im Geschäftsjahr', sortOrder: 1 },
      { title: 'Debitorenliste zum Stichtag', description: 'Offene Posten nach Fälligkeit', sortOrder: 2 },
      { title: 'Kreditorenliste zum Stichtag', description: 'Offene Posten nach Fälligkeit', sortOrder: 3 },
      { title: 'Bankkontoauszüge (letzter Monat)', sortOrder: 4 },
      { title: 'Kassenbuch / Kassenbestätigung', sortOrder: 5 },
      { title: 'Lohnliste / Gehaltsnachweise', description: 'Gesamt für das Geschäftsjahr', sortOrder: 6 },
      { title: 'Umsatzsteuervoranmeldungen (alle Monate)', sortOrder: 7 },
      { title: 'Saldenliste / BWA aktuell', sortOrder: 8 },
      { title: 'Inventurliste / Bestandsaufnahme', sortOrder: 9 },
      { title: 'Darlehensverträge und Tilgungspläne', sortOrder: 10 },
      { title: 'Miet- und Leasingverträge', sortOrder: 11 },
      { title: 'Gesellschafterversammlungsprotokoll', sortOrder: 12 },
      { title: 'Vorjahresabschluss (unterschrieben)', sortOrder: 13 },
    ],
  },
  {
    name: 'Due-Diligence-Basischeckliste',
    description: 'Grundlegende Unterlagen für eine Financial Due Diligence',
    category: 'DUE_DILIGENCE',
    isBuiltIn: true,
    items: [
      { title: 'Jahresabschlüsse der letzten 3 Jahre', sortOrder: 0 },
      { title: 'Aktuelle BWA (lfd. Jahr)', sortOrder: 1 },
      { title: 'Gesellschaftsvertrag / Satzung', sortOrder: 2 },
      { title: 'Handelsregisterauszug', sortOrder: 3 },
      { title: 'Organigramm und Personalübersicht', sortOrder: 4 },
      { title: 'Kundenliste (Top 20 nach Umsatz)', sortOrder: 5 },
      { title: 'Lieferantenliste (wesentliche Lieferanten)', sortOrder: 6 },
      { title: 'Bestehende Verträge (wesentlich)', description: 'z.B. Miet-, Lizenz-, Rahmenverträge', sortOrder: 7 },
      { title: 'Verbindlichkeiten und Darlehen (Übersicht)', sortOrder: 8 },
      { title: 'Steuerbescheide letzter 3 Jahre', sortOrder: 9 },
      { title: 'Laufende Rechtsstreitigkeiten', sortOrder: 10 },
      { title: 'Versicherungsübersicht', sortOrder: 11 },
    ],
  },
  {
    name: 'Sonderprüfung-Standardliste',
    description: 'Basisunterlagen für eine Sonderprüfung',
    category: 'SONDERPRUEFUNG',
    isBuiltIn: true,
    items: [
      { title: 'Prüfungsrelevante Kontenauszüge', sortOrder: 0 },
      { title: 'Belege zum Prüfungszeitraum', sortOrder: 1 },
      { title: 'Interne Buchungsanweisungen / Richtlinien', sortOrder: 2 },
      { title: 'Beschlüsse der Geschäftsführung (Zeitraum)', sortOrder: 3 },
      { title: 'Korrespondenz zu geprüften Vorgängen', sortOrder: 4 },
      { title: 'Verträge zu geprüften Sachverhalten', sortOrder: 5 },
    ],
  },
];

async function main() {
  console.log('Seeding PBC templates...');

  for (const tpl of TEMPLATES) {
    const existing = await prisma.pbcTemplate.findFirst({ where: { name: tpl.name } });
    if (existing) {
      console.log(`  Skipping (already exists): ${tpl.name}`);
      continue;
    }

    await prisma.pbcTemplate.create({
      data: {
        name: tpl.name,
        description: tpl.description,
        category: tpl.category,
        isBuiltIn: tpl.isBuiltIn,
        items: { create: tpl.items },
      },
    });
    console.log(`  Created: ${tpl.name} (${tpl.items.length} items)`);
  }

  console.log('Done.');
}

main()
  .catch((err) => {
    console.error('Seed fehlgeschlagen:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

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
  {
    name: 'Banken und Finanzierung',
    description: 'Bank-, Darlehens- und Sicherheitenunterlagen für Abschlussprüfung und Reviews',
    category: 'FINANZIERUNG',
    isBuiltIn: true,
    items: [
      { title: 'Bankbestätigungen zum Stichtag', sortOrder: 0 },
      { title: 'Kontoauszüge aller Bankkonten zum Stichtag', sortOrder: 1 },
      { title: 'Darlehensverträge inklusive Nachträge', sortOrder: 2 },
      { title: 'Tilgungspläne und Zinsabrechnungen', sortOrder: 3 },
      { title: 'Sicherheitenverträge / Bürgschaften', sortOrder: 4 },
      { title: 'Leasingverträge und Restwertübersichten', sortOrder: 5 },
      { title: 'Covenant-Berechnungen und Bankkorrespondenz', sortOrder: 6 },
    ],
  },
  {
    name: 'Lohn und Personal',
    description: 'Personal- und Payroll-Unterlagen für Jahresabschluss und Plausibilisierung',
    category: 'PERSONAL',
    isBuiltIn: true,
    items: [
      { title: 'Mitarbeiterliste zum Stichtag', sortOrder: 0 },
      { title: 'Lohnjournale für das Geschäftsjahr', sortOrder: 1 },
      { title: 'Gehaltsabrechnungen Stichproben', sortOrder: 2 },
      { title: 'Arbeitsverträge und Nachträge für Stichproben', sortOrder: 3 },
      { title: 'Urlaubs- und Überstundenrückstellungen', sortOrder: 4 },
      { title: 'Sozialversicherungsnachweise', sortOrder: 5 },
      { title: 'Tantiemen-, Bonus- und Provisionsvereinbarungen', sortOrder: 6 },
    ],
  },
  {
    name: 'Steuern und Abgaben',
    description: 'Steuerliche Nachweise, Bescheide und Abstimmungen für die Prüfung',
    category: 'STEUERN',
    isBuiltIn: true,
    items: [
      { title: 'Körperschaftsteuer- und Gewerbesteuerbescheide', sortOrder: 0 },
      { title: 'Umsatzsteuerjahreserklärung und Voranmeldungen', sortOrder: 1 },
      { title: 'Lohnsteuer-Anmeldungen', sortOrder: 2 },
      { title: 'Steuerrückstellungsberechnung', sortOrder: 3 },
      { title: 'Überleitungsrechnung Handelsbilanz / Steuerbilanz', sortOrder: 4 },
      { title: 'Korrespondenz mit Finanzbehörden', sortOrder: 5 },
      { title: 'Offene Betriebsprüfungen und Feststellungen', sortOrder: 6 },
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

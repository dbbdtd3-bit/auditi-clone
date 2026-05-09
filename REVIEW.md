# Code Review — auditi-clone Phase 2

**Datum:** 2026-05-09  
**Reviewer:** Claude Code (gsd-code-reviewer)  
**Tiefe:** Standard (vollständige Datei-Analyse)  
**Dateien reviewed:** 33

---

## Zusammenfassung

Phase 2 implementiert die vollständige CRUD-API für Mandanten, Engagements und den PBC-Dokumentenaustausch sowie die zugehörigen Next.js-Seiten und Client-Komponenten. Die Gesamtstruktur ist sauber, die Fehlerbehandlung ist auf API-Ebene konsistent, und die Transaktions-Nutzung in kritischen Stellen (Engagement-Erstellung, Datei-Upload) ist korrekt.

Es gibt jedoch **mehrere sicherheitsrelevante Lücken**, die vor einem Produktionsbetrieb zwingend behoben werden müssen: fehlende Autorisierungs-Checks (jeder eingeloggte User kann auf alle Mandanten-Daten zugreifen), unkontrollierte Enum-Eingaben, unsichere Kommentar-Autorisierung und ein potenziell gefährlicher obsKey-Pfad bei Uploads.

---

## KRITISCH

### K-01: Fehlende Autorisierung — alle API-Routen prüfen nur Authentifizierung, nicht Berechtigung

**Dateien:** Alle API-Routen (alle 14 Dateien in `src/app/api/`)

**Problem:**  
Jeder eingeloggte User — unabhängig von seiner Rolle — kann auf alle Mandanten, alle Engagements und alle PBC-Workspaces anderer Kanzleien zugreifen, lesen und schreiben. Die Prüfung lautet überall nur:

```typescript
const session = await auth();
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

Ein `MANDANT_USER` von Mandant A kann z.B.:
- Alle anderen Mandanten per `GET /api/mandanten` auslesen
- Mandanten anlegen (`POST /api/mandanten`)
- PBC-Listen und Items in fremden Workspaces erstellen und löschen
- Fremde Dateien herunterladen

**Fix:**  
Mindestens Rollen-Checks für schreibende Operationen einbauen. Für lesende Operationen: Workspace-Mitgliedschaft prüfen (User muss `PbcMember` des angefragten Workspaces sein). Beispiel für einen einfachen WP-only-Check:

```typescript
const session = await auth();
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

const user = session.user as { role?: string };
const isWpUser = ['WP_ADMIN', 'WP_TEAM', 'WP_LEAD'].includes(user.role ?? '');
if (!isWpUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
```

Für PBC-Routen: Zusätzlich prüfen, ob der User Mitglied des Workspaces ist:

```typescript
const membership = await prisma.pbcMember.findFirst({
  where: { workspaceId, userId: session.user.id },
});
if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
```

---

### K-02: Kommentar-Autor und -Rolle werden vom Client übernommen — keine serverseitige Verifikation

**Datei:** `src/app/api/pbc/items/[itemId]/comments/route.ts` (Zeilen 37–52)  
**Datei:** `src/components/pbc/comment-section.tsx` (Zeilen 48–55)

**Problem:**  
Author-Name und Rolle werden aus dem Request-Body übernommen, nicht aus der Session des eingeloggten Users:

```typescript
// route.ts
const { text, author, role } = body as {
  text: string;
  author: string;
  role: string;
};

const comment = await prisma.pbcComment.create({
  data: {
    itemId,
    text,
    author: author || 'Unbekannt',
    role: role || 'WP_TEAM',    // <-- Client bestimmt die Rolle!
  },
});
```

Ein Mandant-User kann als `WP_ADMIN` oder `WP_LEAD` kommentieren, indem er den Request-Body manipuliert. In einem Prüfungskontext ist die korrekte Rollenattribution rechtlich und fachlich bedeutsam.

**Fix:**  
Author und Rolle immer aus der Session lesen, nie aus dem Client:

```typescript
const session = await auth();
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

const sessionUser = session.user as { name?: string; role?: string };

const comment = await prisma.pbcComment.create({
  data: {
    itemId,
    text,
    author: sessionUser.name || 'Unbekannt',
    role: sessionUser.role || 'WP_TEAM',
  },
});
```

---

### K-03: Datei-Registrierung akzeptiert beliebige obsKey-Werte vom Client

**Datei:** `src/app/api/pbc/items/[itemId]/files/route.ts` (Zeilen 49–70)

**Problem:**  
Der `obsKey` wird aus dem Request-Body übernommen und direkt in die DB geschrieben, ohne zu prüfen, ob er tatsächlich vom aktuellen Upload-Flow stammt. Ein Angreifer kann beliebige OBS-Keys registrieren — z.B. `../../andere-datei` oder einen Key einer fremden Datei:

```typescript
const { filename, obsKey, mimeType, sizeBytes, uploadedBy } = body as {
  filename: string;
  obsKey: string;       // <-- komplett unkontrolliert
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;   // <-- auch vom Client
};
```

Außerdem ist `uploadedBy` wiederum vom Client kontrolliert (siehe K-02 analog).

**Fix:**  
1. Der `obsKey` muss validiert werden — er muss mit dem erwarteten Präfix anfangen (z.B. `pbc/`) und darf keine Path-Traversal-Zeichen enthalten:

```typescript
const ALLOWED_PREFIX = /^pbc\/[\d]+-[a-zA-Z0-9._-]+$/;
if (!ALLOWED_PREFIX.test(obsKey)) {
  return NextResponse.json({ error: 'Ungültiger obsKey' }, { status: 400 });
}
```

2. `uploadedBy` immer aus der Session lesen:

```typescript
const sessionUser = session.user as { name?: string };
const uploadedBy = sessionUser.name || 'Unbekannt';
```

---

### K-04: Enum-Werte werden per `as`-Cast direkt an Prisma übergeben — keine Validierung

**Dateien:**
- `src/app/api/engagements/route.ts` (Zeile 45)
- `src/app/api/engagements/[id]/route.ts` (Zeilen 57–58)
- `src/app/api/pbc/items/[itemId]/route.ts` (Zeile 65)
- `src/app/api/pbc/workspaces/[workspaceId]/members/route.ts` (Zeile 73)

**Problem:**  
Prisma-Enum-Werte wie `type` und `status` werden ohne Prüfung aus dem Request-Body übernommen:

```typescript
type: type as 'JAHRESABSCHLUSS' | 'SONDERPRUEFUNG' | 'DUE_DILIGENCE',
status: status as 'ACTIVE' | 'COMPLETED' | 'ARCHIVED',
```

TypeScript's `as` ist nur ein Compiler-Trick — zur Laufzeit ist `type` ein beliebiger String. Wird ein ungültiger Wert übergeben, wirft Prisma einen unbehandelten Datenbankfehler, der nach außen als `500 Interner Fehler` erscheint (kein 400). Schlimmer: Bei zukünftigen Prisma-Versionen könnten ungültige Enums anders behandelt werden.

**Fix:**  
Validierung vor dem Datenbankzugriff:

```typescript
const VALID_TYPES = ['JAHRESABSCHLUSS', 'SONDERPRUEFUNG', 'DUE_DILIGENCE'] as const;
if (!VALID_TYPES.includes(type as typeof VALID_TYPES[number])) {
  return NextResponse.json({ error: 'Ungültiger Auftragstyp' }, { status: 400 });
}
```

---

### K-05: Temporäres Passwort für neue User ist schwach und wird stillschweigend verworfen

**Datei:** `src/app/api/pbc/workspaces/[workspaceId]/members/route.ts` (Zeilen 48–58)

**Problem:**  
Wird ein neuer User per E-Mail eingeladen, wird ein temporäres Passwort mit `Math.random()` generiert:

```typescript
const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
```

`Math.random()` ist **kryptographisch nicht sicher** (kein CSPRNG). Das Passwort wird außerdem nirgends an den User übermittelt (die E-Mail-Funktion ist noch nicht implementiert), sodass der User sich faktisch nicht einloggen kann. Der User existiert in der DB, aber ohne funktionsfähigen Zugang und ohne Benachrichtigung.

**Fix:**  
Für das temporäre Passwort `crypto.randomBytes` verwenden:

```typescript
import { randomBytes } from 'crypto';
const tempPassword = randomBytes(16).toString('hex');
```

Außerdem sollte der API-Response klarstellen, ob ein neuer User angelegt wurde (nicht nur ob ein Mitglied hinzugefügt wurde), und die E-Mail-Implementierung als blocking Issue markieren — solange keine Einladungsmail verschickt wird, ist das Feature faktisch unfertig.

---

## MITTEL

### M-01: Server-Komponenten lesen DB direkt ohne Auth-Check

**Dateien:**
- `src/app/(app)/pbc/page.tsx` (Zeile 10)
- `src/app/(app)/pbc/[workspaceId]/page.tsx` (Zeile 37)
- `src/app/(app)/pbc/[workspaceId]/lists/[listId]/page.tsx` (Zeile 30)
- `src/app/(app)/mandanten/page.tsx` (Zeile 11)

**Problem:**  
Die Server-Komponenten lesen Daten direkt aus der DB (`prisma.pbcWorkspace.findMany()` etc.) ohne vorherige Auth-Prüfung. Zwar schützt das App-Layout vermutlich durch Middleware, aber die Defense-in-Depth fehlt. Die `ItemDetailPage` in `[itemId]/page.tsx` prüft immerhin die Session, aber nur für den Usernamen, nicht als Zugangskontrolle.

**Fix:**  
Jede Server-Komponenten-Seite sollte explizit auf Auth prüfen:

```typescript
export default async function PbcPage() {
  const session = await auth();
  if (!session) redirect('/login');
  
  const workspaces = await getWorkspaces();
  // ...
}
```

---

### M-02: Race Condition bei `sortOrder`-Berechnung für neue Items

**Datei:** `src/app/api/pbc/lists/[listId]/items/route.ts` (Zeilen 25–30)

**Problem:**  
Der `sortOrder` wird in zwei separaten Schritten berechnet:

```typescript
const maxSortOrder = await prisma.pbcRequestItem.aggregate({
  where: { listId },
  _max: { sortOrder: true },
});

const sortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

const item = await prisma.pbcRequestItem.create({
  data: { listId, title, ..., sortOrder },
});
```

Bei gleichzeitigen Requests können zwei Items denselben `sortOrder` erhalten, da kein Datenbanklock zwischen `aggregate` und `create` besteht.

**Fix:**  
In einer Transaktion kapseln oder einen DB-seitigen `DEFAULT` mit Sequence verwenden. Für den Moment reicht auch ein Unique-Constraint auf `(listId, sortOrder)` in Prisma, der den zweiten Schreiber mit einem Fehler abbricht:

```typescript
// In der Transaktion
const item = await prisma.$transaction(async (tx) => {
  const max = await tx.pbcRequestItem.aggregate({
    where: { listId },
    _max: { sortOrder: true },
  });
  return tx.pbcRequestItem.create({
    data: { listId, title, sortOrder: (max._max.sortOrder ?? -1) + 1 },
  });
});
```

---

### M-03: OBS-Cleanup nach Item-Delete ist fehlerhaft geordnet — DB-Delete zuerst, dann OBS

**Datei:** `src/app/api/pbc/items/[itemId]/route.ts` (Zeilen 88–98)

**Problem:**  
Die Reihenfolge ist: (1) Dateien aus DB lesen, (2) Item aus DB löschen (Cascade löscht auch Dateien), (3) OBS-Objekte löschen. Schritt 2 und 3 sind nicht atomar. Wenn der OBS-Delete fehlschlägt, sind die DB-Records bereits gelöscht, aber die Dateien existieren noch im Objektspeicher (Orphans). Das ist als Best-Effort kommentiert, aber das Risiko sollte dokumentiert sein.

Schlimmer: Wenn die DB-Transaktion in Schritt 2 erfolgreich ist, aber der OBS-Call in Schritt 3 einen Fehler wirft und das Catch ihn schluckt — der Aufrufer erhält trotzdem `{ success: true }`. Das ist korrekt für DB-Sicht, aber OBS-Müll akkumuliert sich still.

**Fix:**  
Entweder den OBS-Cleanup zu einem Job-Queue-System auslagern (robust, empfohlen für Produktion), oder zumindest die Fehlermeldung loggen:

```typescript
for (const file of files) {
  try {
    await deleteObject(file.obsKey);
  } catch (err) {
    console.error(`OBS cleanup failed for key ${file.obsKey}:`, err);
    // Monitoring-Alert hier
  }
}
```

---

### M-04: DELETE auf `pbcRequestList` löscht nicht zuerst OBS-Objekte

**Datei:** `src/app/api/pbc/lists/[listId]/route.ts` (Zeilen 62–75)

**Problem:**  
Beim Löschen einer Liste wird nur `prisma.pbcRequestList.delete()` aufgerufen. Durch Cascade-Delete in Prisma werden auch alle Items, Dateien (DB-Records) und Kommentare gelöscht. Die zugehörigen OBS-Objekte werden **nie gelöscht** — im Gegensatz zum Item-Delete (`/api/pbc/items/[itemId]`), der wenigstens Best-Effort-Cleanup macht.

**Fix:**  
Vor dem Delete alle PbcFile-Records der Liste laden und OBS-Cleanup durchführen:

```typescript
const files = await prisma.pbcFile.findMany({
  where: { item: { list: { id: listId } } },
});

await prisma.pbcRequestList.delete({ where: { id: listId } });

for (const file of files) {
  try {
    await deleteObject(file.obsKey);
  } catch (err) {
    console.error(`OBS cleanup failed for key ${file.obsKey}:`, err);
  }
}
```

---

### M-05: Datums-Validierung für `dueDate` fehlt — beliebige Strings werden als Datum geparst

**Dateien:**
- `src/app/api/pbc/lists/[listId]/items/route.ts` (Zeile 37)
- `src/app/api/pbc/items/[itemId]/route.ts` (Zeile 67)

**Problem:**  
```typescript
dueDate: dueDate ? new Date(dueDate) : null,
```

`new Date("garbage")` liefert `Invalid Date`. Prisma wird diesen Wert ablehnen und einen 500-Fehler produzieren statt einem korrekten 400. Außerdem gibt es keine Prüfung, ob das Datum in der Vergangenheit liegt.

**Fix:**  
```typescript
let parsedDueDate: Date | null = null;
if (dueDate) {
  parsedDueDate = new Date(dueDate);
  if (isNaN(parsedDueDate.getTime())) {
    return NextResponse.json({ error: 'Ungültiges Datum' }, { status: 400 });
  }
}
```

---

### M-06: Mandant-DELETE prüft Race Condition nicht atomar

**Datei:** `src/app/api/mandanten/[id]/route.ts` (Zeilen 49–60)

**Problem:**  
Prüfung auf aktive Engagements und anschließender Delete sind zwei separate DB-Operationen:

```typescript
const activeEngagements = await prisma.engagement.count({ ... });
if (activeEngagements > 0) { return 400 }
await prisma.mandant.delete({ where: { id } });
```

Zwischen Count und Delete könnte ein paralleler Request ein neues aktives Engagement anlegen. Ergebnis: Mandant mit aktivem Engagement wird gelöscht.

**Fix:**  
In einer Transaktion kapseln:

```typescript
await prisma.$transaction(async (tx) => {
  const activeCount = await tx.engagement.count({
    where: { mandantId: id, status: 'ACTIVE' },
  });
  if (activeCount > 0) throw new Error('ACTIVE_ENGAGEMENTS');
  await tx.mandant.delete({ where: { id } });
});
```

---

### M-07: Doppelter Datei-Eintrag bei Duplikat-Upload möglich (kein Uniqueness-Check auf obsKey)

**Datei:** `src/app/api/pbc/items/[itemId]/files/route.ts` (Zeile 61)  
**Schema:** `prisma/schema.prisma` (Zeilen 157–168)

**Problem:**  
Das Schema hat keinen `@unique`-Constraint auf `PbcFile.obsKey`. Ein doppelter POST mit demselben `obsKey` erzeugt zwei DB-Einträge für dieselbe Datei. Das führt zu doppeltem Download und Verwirrung beim User — und beim späteren Cleanup zu doppelten OBS-Delete-Aufrufen.

**Fix:**  
In `schema.prisma`:
```prisma
model PbcFile {
  obsKey  String  @unique
  // ...
}
```

---

### M-08: `workspaceId` in Breadcrumb-Links von `[listId]/page.tsx` nicht validiert gegen tatsächlichen Workspace

**Datei:** `src/app/(app)/pbc/[workspaceId]/lists/[listId]/page.tsx` (Zeile 29)

**Problem:**  
Die Seite lädt eine Liste anhand ihrer `listId`, aber der `workspaceId`-Parameter aus der URL wird nicht gegen die tatsächliche `workspaceId` der Liste verifiziert. Ein User könnte z.B.:
- `/pbc/workspace-A/lists/list-from-workspace-B` aufrufen
- Und würde trotzdem die Liste aus Workspace B sehen

Das ist vor allem ein Authorization-Problem (kombiniert mit K-01), aber auch ein Data-Integrity-Problem.

**Fix:**  
```typescript
const list = await getList(listId);
if (!list) notFound();

// Sicherstellen, dass die Liste zum angegebenen Workspace gehört
if (list.workspaceId !== workspaceId) notFound();
```

---

## NIEDRIG

### N-01: `console.error` in allen API-Routen ohne strukturiertes Logging

**Dateien:** Alle API-Routen

**Problem:**  
Alle Fehler werden per `console.error` geloggt. In Produktion ist das unstrukturiert und schwer zu aggregieren. Außerdem könnte `error` Datenbankdetails (Tabellenstrukturen, interne IDs) enthalten, die nicht geloggt werden sollten.

**Empfehlung:**  
Ein strukturiertes Logger-Modul einführen (z.B. `pino`) und die Error-Serialisierung kontrollieren.

---

### N-02: Kein Längen-Limit für Texteingaben

**Dateien:**
- `src/app/api/mandanten/route.ts` (Zeile 39): `name`, `legalName`, `taxId`
- `src/app/api/pbc/items/[itemId]/comments/route.ts` (Zeile 46): `text`
- `src/app/api/pbc/lists/[listId]/items/route.ts` (Zeile 22): `title`, `description`

**Problem:**  
Keine maximalen Längen für String-Felder. Ein User könnte ein `name`-Feld mit mehreren MB füllen und die DB-Performance beeinträchtigen.

**Empfehlung:**  
Maximale Längen prüfen, z.B.:
```typescript
if (name.length > 200) {
  return NextResponse.json({ error: 'Name zu lang (max. 200 Zeichen)' }, { status: 400 });
}
```

---

### N-03: `useEffect` im Engagement-Dialog hat fehlende Dependency — `form.mandantId`

**Datei:** `src/components/engagements/create-engagement-dialog.tsx` (Zeilen 41–55)

**Problem:**  
```typescript
React.useEffect(() => {
  if (open) {
    // ...
    if (Array.isArray(data) && data.length > 0 && !form.mandantId) {
      setForm((prev) => ({ ...prev, mandantId: data[0].id }));
    }
  }
}, [open]); // <-- form.mandantId fehlt in deps
```

`form.mandantId` wird in der Effect-Closure genutzt, aber nicht als Dependency deklariert. React ESLint-Regeln (`react-hooks/exhaustive-deps`) würden das melden. Das kann zu stale-closure-Bugs führen, wenn der User die Form schließt und wieder öffnet.

**Fix:**  
Entweder `form.mandantId` zu den Dependencies hinzufügen, oder den State aus dem Effect heraushalten (z.B. lokale Variable statt `form.mandantId` prüfen).

---

### N-04: Presigned Upload-URL setzt keinen `Content-Length`-Constraint

**Datei:** `src/lib/obs.ts` (Zeilen 21–30)

**Problem:**  
Die Presigned-Upload-URL hat kein maximales Dateigrößen-Limit. Ein User kann beliebig große Dateien hochladen (begrenzt nur durch OBS-Bucket-Quotas). Für eine WP-Plattform könnte das ein Missbrauchsvektor sein.

**Empfehlung:**  
OBS/S3 unterstützt `content-length-range` im Presign-Policy für einige Varianten. Alternativ: `sizeBytes` vor Erstellung des DB-Records prüfen und sehr große Werte ablehnen.

---

### N-05: Inkonsistente Status-Änderungs-Logik — `ItemStatusActions` zeigt sich allen eingeloggten Usern

**Datei:** `src/app/(app)/pbc/[workspaceId]/lists/[listId]/items/[itemId]/page.tsx` (Zeile 168)  
**Datei:** `src/components/pbc/item-status-actions.tsx` (Zeile 18)

**Problem:**  
Die "Akzeptieren / Überarbeitung nötig"-Buttons werden angezeigt, sobald Status `UPLOADED` ist — unabhängig davon, ob der aktuelle User ein WP-Mitarbeiter oder ein Mandant ist. Ein Mandant kann damit seinen eigenen Upload auf `ACCEPTED` setzen.

**Fix:**  
Die Komponente sollte die Rolle des Users prüfen:

```typescript
// In ItemStatusActions oder auf der Seite
if (currentStatus !== 'UPLOADED' || !isWpUser) return null;
```

---

### N-06: Redundante `as`-Casts im Prisma-Schema-Zugriff (TypeScript-Sicherheit)

**Dateien:**
- `src/app/(app)/mandanten/page.tsx` (Zeile 64): `m.address as { city?: string; ... } | null`
- `src/app/(app)/mandanten/[id]/page.tsx` (Zeile 56): `mandant.address as MandantAddress | null`
- `src/app/(app)/pbc/[workspaceId]/page.tsx` (Zeile 130): `list.items as PbcItemStatus[]`

**Problem:**  
Das `address`-Feld ist in Prisma als `Json` deklariert. Alle Casts sind unsicher — sie unterdrücken TypeScript-Fehler, ohne die Struktur zur Laufzeit zu prüfen. Wenn die Datenbank einen anderen JSON-Shape enthält, crasht der Code bei der Property-Zuweisung.

**Empfehlung:**  
Zod oder manuelle Validierung für Json-Felder einsetzen:

```typescript
import { z } from 'zod';
const AddressSchema = z.object({
  city: z.string().optional(),
  street: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
}).nullable();

const address = AddressSchema.safeParse(mandant.address);
```

---

### N-07: Upload-Fehler bei mehreren gleichzeitigen Dateien lässt UI inkonsistent zurück

**Datei:** `src/components/pbc/file-uploader.tsx` (Zeilen 88–97)

**Problem:**  
Mehrere Dateien werden sequenziell mit `for (const file of files) { await uploadFile(file); }` hochgeladen. Wenn die erste Datei erfolgreich ist und die zweite scheitert, ruft die erste `router.refresh()` auf, die zweite setzt `state: 'error'`. Nach dem Refresh kann die Error-State-UI der zweiten Datei verschwinden, bevor der User sie sieht — da `uploads` State beim Refresh nicht persistiert wird.

**Fix:**  
`router.refresh()` erst nach Abschluss aller Uploads aufrufen:

```typescript
for (const file of files) {
  await uploadFile(file);
}
router.refresh(); // einmal am Ende
```

---

### N-08: `getItem` in `[itemId]/page.tsx` prüft nicht, ob Item zum URL-Workspace gehört

**Datei:** `src/app/(app)/pbc/[workspaceId]/lists/[listId]/items/[itemId]/page.tsx` (Zeile 38)

**Problem:**  
Analog zu M-08: `getItem(itemId)` prüft nicht, ob das Item zur `listId` und `workspaceId` der URL gehört. Eine manipulierte URL könnte Items aus fremden Workspaces anzeigen.

**Fix:**  
```typescript
if (item.listId !== listId || item.list.workspaceId !== workspaceId) notFound();
```

---

## POSITIV

### Gut gemacht

**Transaktions-Nutzung bei Engagement-Erstellung** (`src/app/api/engagements/route.ts`, Zeilen 39–55):  
Die atomare Erstellung von Engagement + PBC-Workspace in einer Transaktion ist korrekt und verhindert inkonsistente Zustände.

**Transaktions-Nutzung beim Datei-Upload** (`src/app/api/pbc/items/[itemId]/files/route.ts`, Zeilen 61–82):  
Das automatische Setzen des Status auf `UPLOADED` beim ersten Datei-Upload ist ebenfalls sauber in einer Transaktion implementiert.

**Filename-Sanitization im Presign-Endpoint** (`src/app/api/upload/presign/route.ts`, Zeile 21):  
```typescript
const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
```
Gut — verhindert Path-Traversal im OBS-Key. (Allerdings fehlt noch die Validierung auf Client-Seite, dass der obsKey dieses Präfix auch tatsächlich hat, siehe K-03.)

**Soft-Delete bei Engagements mit Kampagnen** (`src/app/api/engagements/[id]/route.ts`, Zeilen 79–89):  
Die Entscheidung, Engagements mit Kampagnen auf `ARCHIVED` zu setzen statt hart zu löschen, ist für eine Prüfungsplattform fachlich richtig (Aufbewahrungspflichten).

**bcrypt mit Kostenfaktor 12** (`src/app/api/pbc/workspaces/[workspaceId]/members/route.ts`, Zeile 49):  
Kostenfaktor 12 ist ein vernünftiger Wert für bcrypt.

**Konsistente Fehlerbehandlung auf API-Ebene**:  
Alle API-Routen haben try/catch mit strukturierten JSON-Fehlern und korrekten HTTP-Status-Codes. Das ist solide.

**Presigned-URL-basierter Upload-Flow**:  
Der dreistufige Upload (Presign → direkter OBS-Upload → DB-Registrierung) ist architektonisch korrekt und entlastet den App-Server.

---

## Priorisierungsliste

| # | ID | Schweregrad | Aufwand | Beschreibung |
|---|-----|------------|---------|--------------|
| 1 | K-01 | Kritisch | Hoch | Autorisierungs-Checks auf allen API-Routen fehlen |
| 2 | K-02 | Kritisch | Niedrig | Kommentar-Autor/Rolle vom Client — Session nutzen |
| 3 | K-03 | Kritisch | Niedrig | obsKey-Validierung und uploadedBy aus Session |
| 4 | K-04 | Kritisch | Niedrig | Enum-Validierung vor Prisma-Zugriff |
| 5 | K-05 | Kritisch | Mittel | CSPRNG für temporäres Passwort, E-Mail-Block |
| 6 | M-04 | Mittel | Mittel | OBS-Cleanup beim Listen-Delete fehlt komplett |
| 7 | M-06 | Mittel | Niedrig | Mandant-Delete: Transaktion für atomaren Check |
| 8 | M-08 | Mittel | Niedrig | workspaceId gegen Liste validieren in URL-Params |
| 9 | N-05 | Niedrig | Niedrig | ItemStatusActions nur für WP-Rollen anzeigen |
| 10 | M-02 | Mittel | Niedrig | sortOrder Race Condition: Transaktion |

---

_Review erstellt: 2026-05-09_  
_Reviewer: Claude Code (gsd-code-reviewer)_  
_Tiefe: Standard_

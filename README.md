# Sports & Fueling Coach

Persönlicher Demo-Coach für Training, Ernährung, Fueling und sportliche Zielerreichung.

## Sprint 1

- Next.js App Router mit TypeScript
- Tailwind CSS
- Mobile-first Layout
- Heute-Seite als Startseite
- Mock-Daten ohne Backend, KI, Strava oder Supabase

## Sprint 2

- Domain-orientierte Struktur unter `src/domain`
- fachlich getrennte Mock-Daten unter `src/data/mock`
- regelbasierte Daily-Briefing-Engine
- Heute-Seite rendert aus einem erzeugten `DailyBriefing`
- lokale Projektdokumentation für Status, Roadmap, Backlog und Entscheidungen

## Sprint 3

- strukturierte Demo-Woche mit `WeekPlan`, `DayPlan` und `DayBlock`
- Planung-Seite mit auswählbaren Tagen
- Daily-Briefing-Vorschau aus dem ausgewählten Tag
- Link von Planung zu Heute über `?date=`
- Heute-Seite mit passiven Prioritäten statt Abhak-Checkliste

## Sprint 4-6

- lokaler App-State mit LocalStorage
- Planung editierbar: Home-Office, Büroarbeit, Reisetag und Training
- Training editierbar: Einheiten hinzufügen, Status ändern, entfernen
- Fueling editierbar: Standardmahlzeiten und Tages-Fueling
- Insights aus Training und Zielkontext
- Einstellungen für Profil, Ziele und Wettkampfziel
- Demo-Reset

## Standards

- Planungsstandards für Home-Office, Büroarbeit, Reisetag und Zusatzinfos
- Trainingsstandards, die aus neuen Einheiten gespeichert und wieder eingefügt werden können
- Fuelingstandards und einmalige Tagesmahlzeiten
- Standardwochen mit Planung, Training und groben Fueling-Slots

## Online-Betrieb

- Supabase Auth mit E-Mail und Passwort
- keine öffentliche Registrierung
- Middleware schützt App-Routen, sobald Supabase-Env gesetzt ist
- App-State wird pro Benutzer in `public.app_states` gespeichert
- RLS-SQL liegt in `supabase/001_app_state_rls.sql`
- Deployment-Anleitung liegt in `docs/deployment.md`

## Architektur

```text
src/
  app/          Next.js Routen
  components/   wiederverwendbare UI-Bausteine
  config/       App-Konfiguration wie Navigation
  data/mock/    austauschbare Demo-Daten
  domain/       fachliche Typen und Regeln ohne React
  features/     produktnahe UI pro Bereich
    app-state/  lokaler Demo-Zustand und Persistenz
```

## Lokal starten

Per Doppelklick auf macOS:

```text
start-app.command
```

Oder im Terminal:

```bash
pnpm install
pnpm dev
```

Danach im Browser öffnen:

```text
http://127.0.0.1:3000
```

## Prüfen

```bash
pnpm typecheck
pnpm lint
pnpm build
```

# Sports & Fueling Coach

Persönlicher Coach für Training, Ernährung, Fueling und sportliche Zielerreichung.

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

## Beta-Modus

- Online-Nutzer starten mit einem leeren Beta-Zustand statt mit der Demo-Woche.
- Profil, Ziele und Wettkampfziel können in den Einstellungen gepflegt werden.
- Planung, Training, Fueling und Standards werden als eigener Benutzerzustand gespeichert.
- Der Coach-Chat kann Planinformationen direkt in die Woche übernehmen.
- Bestehende Demo-Daten in Supabase können unter Einstellungen mit `Beta-Zustand neu starten` entfernt werden.
- Der lokale Betrieb ohne Supabase bleibt bewusst als Demo-Fallback erhalten.

## Coach-Chat

- API-Route: `/api/coach`
- Chat-Historie: `GET /api/coach` und `POST /api/coach/history`
- Provider-Auswahl über `AI_PROVIDER`
- Modell-Auswahl über `AI_MODEL`
- API-Key generisch über `AI_API_KEY`, für OpenAI alternativ direkt über `OPENAI_API_KEY`
- aktueller Startprovider: `openai`
- ohne AI-Env nutzt die App einen regelbasierten lokalen Parser
- eigener Coach-Bereich unter `/coach`
- Coach nutzt Profil, Ziele, Training, Fueling, Standards und Wochenplanung als Kontext
- Chat-Verlauf wird für eingeloggte Nutzer in Supabase gespeichert und als Gesprächskontext an die serverseitige Coach-API gegeben
- Coach Mode ist der Standard: Beratung, Einschätzung, Varianten und Empfehlungen ohne Planänderung
- Planning Mode entsteht nur bei ausdrücklichem Wunsch nach einem konkreten Plan
- Change Mode entsteht erst durch Bestätigung per Button oder klare Übernahme-Nachricht
- Vorschläge können bewusst in Training oder Fueling übernommen werden, werden aber nie automatisch gespeichert
- unterstützte Änderungen: Tageskontext, Zusatzinfos, Training und grobe Mahlzeiten
- Fueling- und Rezeptvorschläge sind Teil der Coach-Antwort
- Laufen unterscheidet Laufart und Fokus
- Coach-Kontext wird serverseitig gebaut und enthält importierte externe Aktivitäten nur als strukturierte Zusammenfassung
- Migration: `supabase/004_coach_chat_history.sql`

Beispiel für Vercel:

```text
AI_PROVIDER=openai
AI_MODEL=gpt-5-mini
OPENAI_API_KEY=...
```

## Strava-Integration

- OAuth-Routen: `/api/integrations/strava/connect` und `/api/integrations/strava/callback`
- Status-Route: `/api/integrations/strava/status`
- manuelle Synchronisation: `/api/integrations/strava/sync`
- Tokens werden ausschließlich serverseitig in `external_source_tokens` gespeichert
- Aktivitäten werden in ein providerneutrales Domain-Modell unter `activities`, `activity_streams`, `equipment` und `sync_jobs` importiert
- Strava ist nur der erste Adapter; das interne Modell ist für Garmin, Apple Health, Polar, Coros, Oura und ähnliche Quellen vorbereitet
- Migration: `supabase/002_external_activity_sources.sql`

Benötigte Env Vars:

```text
STRAVA_CLIENT_ID=...
STRAVA_CLIENT_SECRET=...
STRAVA_REDIRECT_URI=https://deine-domain.de/api/integrations/strava/callback
STRAVA_OAUTH_STATE_SECRET=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Optionale Sync-Limits:

```text
STRAVA_SYNC_MAX_PAGES=50
STRAVA_STREAM_SYNC_LIMIT=50
```

Wichtig: `SUPABASE_SERVICE_ROLE_KEY`, `STRAVA_CLIENT_SECRET`, OAuth-State-Secret und Tokens dürfen nie im Client oder Repository landen.

## Nutrition & Fueling

- Geloggte Mahlzeiten werden für eingeloggte Nutzer in `meal_logs` gespeichert
- Standardmahlzeiten, Rezepte, Zutaten und KI-Schätzungen sind mit `standard_meals`, `recipes`, `recipe_ingredients` und `nutrition_estimates` vorbereitet
- Migration: `supabase/003_nutrition.sql`
- API-Routen:
  - `GET/POST /api/nutrition/logs`
  - `POST /api/nutrition/estimate`
- AI-Schätzungen laufen ausschließlich serverseitig über `AI_PROVIDER`, `AI_MODEL` und `AI_API_KEY`
- Die UI kennzeichnet Werte als Standard, Rezept, Freitext, KI-Schätzung oder manuell bestätigt

## Architektur

```text
src/
  app/          Next.js Routen
  components/   wiederverwendbare UI-Bausteine
  config/       App-Konfiguration wie Navigation
  data/         Beta-Startzustand und austauschbare Demo-Daten
  domain/       fachliche Typen und Regeln ohne React
    integrations/ providerneutrale Aktivitätsmodelle
  features/     produktnahe UI pro Bereich
    app-state/  App-Zustand und Persistenz
    integrations/ externe Datenquellen im UI
  lib/
    integrations/ OAuth, Adapter und Synchronisation
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

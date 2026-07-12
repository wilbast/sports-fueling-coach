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
- Coach-Antworten können über `/api/coach?stream=1` als Server-Sent Events live angezeigt werden; strukturierte Vorschläge kommen am Ende als finales Objekt
- Coach Mode ist der Standard: Beratung, Einschätzung, Varianten und Empfehlungen ohne Planänderung
- Planning Mode entsteht nur bei ausdrücklichem Wunsch nach einem konkreten Plan
- Change Mode entsteht erst durch Bestätigung per Button oder klare Übernahme-Nachricht
- Vorschläge können bewusst in Training oder Fueling übernommen werden, werden aber nie automatisch gespeichert
- unterstützte Änderungen: Tageskontext, Zusatzinfos, Training und grobe Mahlzeiten
- Fueling- und Rezeptvorschläge sind Teil der Coach-Antwort
- Laufen unterscheidet Laufart und Fokus
- Coach-Kontext wird serverseitig gebaut und enthält importierte externe Aktivitäten nur als strukturierte Zusammenfassung
- Trainings- und Wochenberatung bewertet erledigte Aktivitäten aus Supabase/Strava vor geplanten Einheiten: Wochenumfang = erledigte Aktivitäten dieser Woche plus zukünftige geplante Workouts
- Coach-Aufrufe können einen Bereichskontext wie `today`, `fueling`, `training`, `planning`, `insights` oder `settings` senden
- Hauptseiten bieten sichtbare Coach-/KI-Empfehlungen, die beraten, aber keine Daten automatisch ändern
- Page Context wird im serverseitigen Context Builder gewichtet, damit Today, Fueling, Training, Planning und Insights unterschiedlich beraten
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
- automatischer Sync: `/api/cron/strava-sync`, ausgelöst durch Vercel Cron
- Tokens werden ausschließlich serverseitig in `external_source_tokens` gespeichert
- Aktivitäten werden in ein providerneutrales Domain-Modell unter `activities`, `activity_streams`, `equipment` und `sync_jobs` importiert
- persönliche Trainingszonen aus Strava landen in `training_zones`; Aktivitäts-Zonenverteilungen landen in `activity_zones`
- der Coach nutzt Zonen nur aus Supabase: erledigte Aktivitäten werden über tatsächliche Zonenverteilung bewertet, geplante Einheiten über persönliche HF-/Power-Zonen eingeordnet
- Strava ist nur der erste Adapter; das interne Modell ist für Garmin, Apple Health, Polar, Coros, Oura und ähnliche Quellen vorbereitet
- Migrationen: `supabase/002_external_activity_sources.sql` und `supabase/005_training_zones.sql`

Benötigte Env Vars:

```text
STRAVA_CLIENT_ID=...
STRAVA_CLIENT_SECRET=...
STRAVA_REDIRECT_URI=https://deine-domain.de/api/integrations/strava/callback
STRAVA_OAUTH_STATE_SECRET=...
SUPABASE_SERVICE_ROLE_KEY=...
CRON_SECRET=...
```

Optionale Sync-Limits:

```text
STRAVA_SYNC_MAX_PAGES=50
STRAVA_STREAM_SYNC_LIMIT=50
STRAVA_ACTIVITY_ZONE_SYNC_LIMIT=50
STRAVA_CRON_MAX_CONNECTIONS=10
```

Vercel Hobby erlaubt nur einen Cron-Lauf pro Tag. Deshalb triggert `vercel.json` `/api/cron/strava-sync` täglich um `23:00 UTC`, aktuell also 01:00 Uhr Berlin in der Sommerzeit. `CRON_SECRET` schützt den öffentlichen Cron-Endpoint; Vercel sendet den Wert als Bearer Token.

Wichtig: `SUPABASE_SERVICE_ROLE_KEY`, `STRAVA_CLIENT_SECRET`, `CRON_SECRET`, OAuth-State-Secret und Tokens dürfen nie im Client oder Repository landen.

## Garmin Connect Integration

Garmin ist als experimentelle, inoffizielle Integration vorbereitet. Details stehen in `docs/integrations/garmin.md`.

- Feature Flag: `GARMIN_INTEGRATION_ENABLED=true`
- Python-Bridge: `scripts/garmin_bridge.py`
- Dependency: `requirements-garmin.txt`
- Migration: `supabase/006_garmin_connect.sql`
- API: `/api/integrations/garmin/*`
- Cron-Endpoint: `/api/cron/garmin-sync`

Garmin-Sessiondaten werden serverseitig mit `GARMIN_TOKEN_ENCRYPTION_KEY` verschlüsselt. Auf Vercel Hobby kann der stündliche Sync nicht über `vercel.json` aktiviert werden; nutze dafür Vercel Pro oder einen externen Scheduler mit `CRON_SECRET`.

## Nutrition & Fueling

- Geloggte Mahlzeiten werden für eingeloggte Nutzer in `meal_logs` gespeichert
- Geloggte Mahlzeiten können im Fueling-Bereich bearbeitet und gelöscht werden
- Meal Logs speichern Kategorie und Hauptmahlzeit in `metadata`; ältere Logs bekommen serverseitige Fallbacks aus Uhrzeit und Name
- Quick-Fueling und Coach-Übernahmen speichern Kategorie und Hauptmahlzeit konsistent mit
- Chat-Entwürfe im Quick-Fueling können direkt als Standardmahlzeit gespeichert werden
- Standardmahlzeiten, Rezepte, Zutaten und KI-Schätzungen sind mit `standard_meals`, `recipes`, `recipe_ingredients` und `nutrition_estimates` vorbereitet
- Migration: `supabase/003_nutrition.sql`
- API-Routen:
  - `GET/POST/PATCH/DELETE /api/nutrition/logs`
  - `POST /api/nutrition/estimate`
- AI-Schätzungen laufen ausschließlich serverseitig über `AI_PROVIDER`, `AI_MODEL` und `AI_API_KEY`
- Die UI kennzeichnet Werte als Standard, Rezept, Freitext, KI-Schätzung oder manuell bestätigt

## Today Experience

- Die Heute-Seite ist der tägliche Coach-Einstieg mit Briefing, Tageszielen, Tagesfortschritt, Aktivitäten, Ernährung, Coach-Empfehlungen, Morgenblick und Quick Actions
- Fueling Quick Add ist direkt auf Heute sichtbar
- Tagesbilanz zeigt kcal Input, Tagesverbrauch, Zielbereich, Protein-/Carb-/Fett-Fortschritt und was noch fehlt
- Jede Coach-Empfehlung kann direkt mit dem Coach besprochen werden; Änderungen werden erst nach Bestätigung übernommen
- Heute, Training und Fueling zeigen oben einen zeitabhängigen Coach-Impuls für 06:00, 14:00 und 21:00 Uhr als schnelle Zusammenfassung plus Empfehlung

## Reviews

- Produktreview: `docs/PRODUCT_REVIEW.md`
- UX Review: `docs/UX_REVIEW.md`
- Architekturreview: `docs/ARCHITECTURE_REVIEW.md`

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

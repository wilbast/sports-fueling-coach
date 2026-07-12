# Garmin Connect Integration

Status: experimentell, Feature Flag `GARMIN_INTEGRATION_ENABLED=false` by default.

Diese Integration verwendet keine offiziell von Garmin bereitgestellte Programmierschnittstelle. Sie nutzt serverseitig `garminconnect` 0.3.x mit nativem DI-OAuth-Login aus `requirements-garmin.txt`. Änderungen an Garmin Connect oder an der Bibliothek können die Synchronisation vorübergehend beeinträchtigen.

## Architektur

- UI: `src/features/integrations/garmin-integration-panel.tsx`
- API-Routen:
  - `POST /api/integrations/garmin/connect`
  - `POST /api/integrations/garmin/mfa`
  - `GET /api/integrations/garmin/status`
  - `POST /api/integrations/garmin/sync`
  - `POST /api/integrations/garmin/reauthenticate`
  - `DELETE /api/integrations/garmin`
  - `POST /api/internal/garmin/scheduler` (QStash-signiert)
  - `POST /api/internal/garmin/jobs/sync` (QStash-signiert)
  - `GET /api/cron/garmin-sync` (Legacy-/Notfall-Dispatcher)
- Provider: `src/lib/integrations/garmin/provider.ts`
- Verschlüsselung: `src/lib/integrations/garmin/crypto.ts`
- Read-Allowlist: `src/lib/integrations/garmin/registry.ts`
- Python-Isolation: `scripts/garmin_bridge.py`
- Vercel-Python-Function: `api/garmin_bridge.py`; Node ruft sie ausschließlich serverseitig mit `GARMIN_BRIDGE_SHARED_SECRET` auf

Die App greift nicht direkt auf Garmin-JSON zu. Garmin-Rohdaten werden in Supabase archiviert und relevante Daten zusätzlich in providerneutrale beziehungsweise interne Tabellen normalisiert.

## Datenmodell

Migration: `supabase/006_garmin_connect.sql`

Wichtige Tabellen:

- `garmin_connections`: Verbindungsstatus, verschlüsselte Garmin-Session, verschlüsselte Accountkennung
- `garmin_auth_attempts`: kurzlebige MFA-Loginvorgänge
- `garmin_sync_runs`: persistentes Sync-Protokoll
- `garmin_sync_checkpoints`: wiederaufnehmbare Backfill-Checkpoints
- `garmin_sync_jobs`: persistente, idempotente QStash-Jobs und Backfill-Fenster
- `garmin_raw_records`: verlustfreie Raw-JSON-Antworten mit Payload-Hash
- `garmin_activity_files`: Metadaten für FIT/GPX/TCX/CSV/ZIP-Dateien, sobald Object Storage angebunden wird
- `daily_health_summaries`, `sleep_summaries`, `hrv_summaries`, `recovery_training_states`: normalisierte Kernmetriken
- `activities`: Garmin-Aktivitäten werden mit `source_provider='garmin'` ins bestehende Aktivitätsmodell importiert

## Sicherheit

- Garmin-Passwort wird nur für Login/MFA verwendet.
- Nach erfolgreichem Login wird nur die Garmin-Session verschlüsselt gespeichert.
- MFA-Codes werden nicht persistiert.
- Kurzlebige MFA-Vorgänge laufen standardmäßig nach 10 Minuten ab.
- Tokens und Raw Payloads werden nicht an den Client geliefert.
- Verschlüsselung: AES-256-GCM mit `GARMIN_TOKEN_ENCRYPTION_KEY` oder `INTEGRATION_ENCRYPTION_KEY`.
- Read-only-Allowlist blockiert Methoden mit Präfixen wie `create`, `add`, `set`, `update`, `delete`, `upload`, `schedule`.

## Sync-Strategie mit QStash

1. Ein QStash-Schedule ruft stündlich `POST /api/internal/garmin/scheduler` auf.
2. Der Scheduler liest nur fällige Verbindungen und erzeugt pro Verbindung einen persistenten `garmin_sync_jobs`-Datensatz.
3. Für jeden Datensatz publiziert er einen separat signierten QStash-Job an `POST /api/internal/garmin/jobs/sync`.
4. Der Worker verarbeitet genau ein kurzes Datumsfenster. QStash Flow Control begrenzt jede Verbindung auf einen parallelen Job.
5. Ein erfolgreicher Backfill-Job erzeugt das unmittelbar vorherige Fenster, bis `GARMIN_INITIAL_BACKFILL_DAYS` erreicht ist.

Job-Payloads enthalten nur `jobId` und `connectionId`. Tokens, E-Mail-Adressen und Garmin-Rohdaten bleiben in Supabase. QStash-Signaturen werden mit Current- und Next-Key geprüft. Eindeutige Deduplication Keys machen wiederholte Zustellungen sicher. Abgebrochene `RUNNING`-Jobs können nach Ablauf eines kurzen Leases erneut verarbeitet werden.

## Priorität und Coach-Nutzung

Garmin ist die primäre Aktivitätsquelle. Wenn eine Einheit zusätzlich von Strava importiert wurde, erkennt der serverseitige Activity Resolver die Dublette über Sportart, Startzeit, Dauer und Distanz. Der Garmin-Datensatz bleibt kanonisch; Strava darf nur fehlende Felder und Zonen ergänzen. Damit werden Kilometer, Kalorien, Trainingsanzahl und Belastung nicht doppelt gezählt.

Bei gleicher normalisierter Sportart und einem Startzeitpunkt innerhalb von zwei Minuten wird unabhängig von abweichender Dauer oder Distanz direkt dedupliziert. Garmin-kcal werden nicht durch Strava-kcal ergänzt. `daily_health_summaries.total_calories` ist außerdem die führende Quelle für den Tagesverbrauch und schlägt einen manuellen Forecast, solange der Garmin-Wert vorhanden ist.

Der Context Builder lädt bis zu 14 Tage normalisierte Gesundheitsdaten und erzeugt einen aktuellen Recovery Snapshot plus Sieben-Tage-Trends. Enthalten sind je nach Geräteverfügbarkeit Schlaf und Schlafphasen, HRV/Baseline, Herzfrequenz, Stress, Body Battery, Atmung, SpO2, Intensitätsminuten, Training Readiness, Recovery Time, Trainingsstatus, akute Last, Load Ratio/Focus, VO2max, Laktatschwelle, FTP, Endurance-/Hill-Score und Akklimatisierung. Fehlende Messungen werden als `unknown` und nie als `0` behandelt.

Readiness und Trainingsstatus werden pro Kalendertag in einem gemeinsamen Datensatz aktualisiert. Persönliche Trainingszonen werden providerneutral aus `training_zones` angezeigt. Die eingesetzte Garmin-Bridge liefert derzeit Zeit-in-Zonen je Aktivität, aber keine stabilen persönlichen Garmin-Zonengrenzen; vorhandene Strava-Zonengrenzen bleiben deshalb als Quelle gekennzeichnet.

## QStash einmalig einrichten

Migration `supabase/007_garmin_qstash_jobs.sql` ausführen und in Vercel `APP_URL`, `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY` sowie `QSTASH_NEXT_SIGNING_KEY` setzen. Danach:

```bash
APP_URL=https://deine-produktions-domain.example QSTASH_TOKEN=... pnpm garmin:qstash:configure
```

Der feste Schedule-Identifier `sports-fueling-coach-garmin-hourly` macht den Befehl wiederholbar. `0 * * * *` läuft stündlich in UTC. `vercel.json` bleibt Hobby-kompatibel.

## Environment

```text
GARMIN_INTEGRATION_ENABLED=true
GARMIN_TOKEN_ENCRYPTION_KEY=base64:<32-byte-key>
GARMIN_PYTHON_BIN=python3
GARMIN_BRIDGE_SHARED_SECRET=ein-langes-zufälliges-secret
# Optional für einen externen Python-Worker; auf Vercel leer lassen:
GARMIN_BRIDGE_URL=
GARMIN_SYNC_INTERVAL_MINUTES=60
GARMIN_SYNC_LOOKBACK_DAYS=1
GARMIN_INITIAL_BACKFILL_CHUNK_DAYS=1
GARMIN_INITIAL_BACKFILL_DAYS=90
GARMIN_MAX_CONCURRENT_ACCOUNTS=2
GARMIN_REQUEST_TIMEOUT_SECONDS=120
SUPABASE_SERVICE_ROLE_KEY=...
CRON_SECRET=...
APP_URL=https://deine-produktions-domain.example
QSTASH_TOKEN=...
QSTASH_CURRENT_SIGNING_KEY=...
QSTASH_NEXT_SIGNING_KEY=...
```

Python-Dependency:

```bash
python3 -m pip install -r requirements-garmin.txt
```

Auf Vercel wird `requirements.txt` automatisch für `api/garmin_bridge.py` installiert. Die Next.js-Function startet dort keinen lokalen Python-Prozess. Lokal bleibt der Spawn-Pfad für Entwicklung und Registry-Tests aktiv.

## Registry-Drift

Vor Updates der Python-Bibliothek:

```bash
node tests/garmin/registry-drift.mjs
```

Ein Update von `garminconnect` darf erst übernommen werden, nachdem der Registry-Drift-Test geprüft, alle Methodensignaturen validiert und die Garmin-Mock-Tests erfolgreich ausgeführt wurden.

## Grenzen dieses Sprints

- Echte Garmin-Login-/MFA-Flows wurden lokal nicht mit einem echten Account getestet.
- FIT/GPX/TCX/CSV-Dateien sind als Metadatenmodell vorbereitet, aber Object-Storage-Download ist noch nicht produktiv verdrahtet.
- Der historische Backfill läuft standardmäßig 90 Tage zurück und wird in wiederaufnehmbare Tagesjobs zerlegt; der Zeitraum ist konfigurierbar.
- Automatisierte Mock-Integrationstests sind vorbereitet durch den Bridge-/Registry-Schnitt, aber noch nicht vollständig ausgeschrieben.

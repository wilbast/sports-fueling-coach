# Garmin Connect Integration

Status: experimentell, Feature Flag `GARMIN_INTEGRATION_ENABLED=false` by default.

Diese Integration verwendet keine offiziell von Garmin bereitgestellte Programmierschnittstelle. Sie nutzt serverseitig die Python-Bibliothek `garminconnect` aus `requirements-garmin.txt`. Änderungen an Garmin Connect oder an der Bibliothek können die Synchronisation vorübergehend beeinträchtigen.

## Architektur

- UI: `src/features/integrations/garmin-integration-panel.tsx`
- API-Routen:
  - `POST /api/integrations/garmin/connect`
  - `POST /api/integrations/garmin/mfa`
  - `GET /api/integrations/garmin/status`
  - `POST /api/integrations/garmin/sync`
  - `POST /api/integrations/garmin/reauthenticate`
  - `DELETE /api/integrations/garmin`
  - `GET /api/cron/garmin-sync`
- Provider: `src/lib/integrations/garmin/provider.ts`
- Verschlüsselung: `src/lib/integrations/garmin/crypto.ts`
- Read-Allowlist: `src/lib/integrations/garmin/registry.ts`
- Python-Isolation: `scripts/garmin_bridge.py`

Die App greift nicht direkt auf Garmin-JSON zu. Garmin-Rohdaten werden in Supabase archiviert und relevante Daten zusätzlich in providerneutrale beziehungsweise interne Tabellen normalisiert.

## Datenmodell

Migration: `supabase/006_garmin_connect.sql`

Wichtige Tabellen:

- `garmin_connections`: Verbindungsstatus, verschlüsselte Garmin-Session, verschlüsselte Accountkennung
- `garmin_auth_attempts`: kurzlebige MFA-Loginvorgänge
- `garmin_sync_runs`: persistentes Sync-Protokoll
- `garmin_sync_checkpoints`: wiederaufnehmbare Backfill-Checkpoints
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

## Sync-Strategie

- Initialer Sync startet nach erfolgreicher Verbindung im Hintergrund.
- Manueller Sync nutzt denselben inkrementellen Pfad.
- Cron-Endpoint `/api/cron/garmin-sync` synchronisiert fällige Accounts.
- Standard-Lookback: letzte 3 Tage, weil Garmin Werte nachträglich ergänzt.
- Pro Account wird über laufende `garmin_sync_runs` ein paralleler Sync verhindert.
- Nicht verfügbare Endpunkte werden als Teilfehler protokolliert und stoppen nicht den kompletten Lauf.

## Scheduler-Hinweis

Der Code stellt einen stündlich nutzbaren Cron-Endpoint bereit. Auf Vercel Hobby kann `vercel.json` aber nur einmal täglich ausgeführt werden. Für echten stündlichen Betrieb gibt es drei Optionen:

1. Vercel Pro mit hourly cron.
2. Externer Scheduler, der `GET /api/cron/garmin-sync` mit `Authorization: Bearer <CRON_SECRET>` stündlich aufruft.
3. Separater Worker/Queue-Dienst.

`vercel.json` bleibt Hobby-kompatibel, damit Deployments nicht an der Cron-Grenze scheitern.

## Environment

```text
GARMIN_INTEGRATION_ENABLED=true
GARMIN_TOKEN_ENCRYPTION_KEY=base64:<32-byte-key>
GARMIN_PYTHON_BIN=python3
GARMIN_SYNC_INTERVAL_MINUTES=60
GARMIN_SYNC_LOOKBACK_DAYS=3
GARMIN_INITIAL_BACKFILL_CHUNK_DAYS=7
GARMIN_MAX_CONCURRENT_ACCOUNTS=2
GARMIN_REQUEST_TIMEOUT_SECONDS=30
SUPABASE_SERVICE_ROLE_KEY=...
CRON_SECRET=...
```

Python-Dependency:

```bash
python3 -m pip install -r requirements-garmin.txt
```

## Registry-Drift

Vor Updates der Python-Bibliothek:

```bash
node tests/garmin/registry-drift.mjs
```

Ein Update von `garminconnect` darf erst übernommen werden, nachdem der Registry-Drift-Test geprüft, alle Methodensignaturen validiert und die Garmin-Mock-Tests erfolgreich ausgeführt wurden.

## Grenzen dieses Sprints

- Echte Garmin-Login-/MFA-Flows wurden lokal nicht mit einem echten Account getestet.
- FIT/GPX/TCX/CSV-Dateien sind als Metadatenmodell vorbereitet, aber Object-Storage-Download ist noch nicht produktiv verdrahtet.
- Der vollständige historische Backfill ist checkpointfähig modelliert, wird im aktuellen Handler aber chunkweise über den Initial-Sync angestoßen.
- Automatisierte Mock-Integrationstests sind vorbereitet durch den Bridge-/Registry-Schnitt, aber noch nicht vollständig ausgeschrieben.

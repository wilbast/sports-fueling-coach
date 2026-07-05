# Deployment mit Supabase Auth und RLS

## Zielbild

- Next.js App wird auf Vercel oder einem vergleichbaren Next.js-Host veröffentlicht.
- Supabase Auth schützt die App per E-Mail und Passwort.
- Die App nutzt keine öffentliche Registrierung.
- Der gesamte App-Zustand liegt pro Benutzer in `public.app_states.state`.
- Row Level Security stellt sicher, dass jeder User nur seine eigene Zeile lesen und schreiben kann.

## Supabase einrichten

1. Neues Supabase-Projekt erstellen.
2. In Supabase SQL Editor den Inhalt von `supabase/001_app_state_rls.sql` ausführen.
3. Unter Authentication einen Benutzer für dich anlegen.
4. In Authentication > URL Configuration die spätere Produktions-URL eintragen.
5. Aus Project Settings > API die Project URL und den Publishable Key kopieren.

## Lokale Environment

`.env.local` anlegen:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Danach neu starten:

```bash
pnpm dev
```

## Vercel

1. Repository mit Vercel verbinden.
2. Environment Variables für Preview und Production setzen:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Deploy ausführen.
4. Nach dem ersten Production-Deploy die finale Domain in Supabase Auth URL Configuration ergänzen.

## Sicherheitsnotizen

- Keinen `service_role` oder Secret Key in `NEXT_PUBLIC_*` Variablen speichern.
- Öffentliche Registrierung bleibt aus, solange die App nur privat genutzt werden soll.
- RLS muss auf jeder späteren Tabelle aktiv sein.
- Die aktuelle JSONB-Persistenz ist ein sicherer Startpunkt, aber nicht das finale normalisierte Datenmodell.

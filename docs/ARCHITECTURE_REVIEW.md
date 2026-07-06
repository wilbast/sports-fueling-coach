# Architecture Review

Datum: 2026-07-06

## Architektururteil

Die aktuelle Architektur ist für eine private Beta tragfähig, aber noch nicht für eine große ambitionierte Nutzergruppe. Die wichtigsten Fundamente sind richtig gesetzt:

- Next.js App Router mit serverseitigen API-Routen.
- Supabase Auth/RLS.
- Server-only AI Calls.
- Context Builder statt direkter Datenbankzugriff durch OpenAI.
- Providerneutrale externe Aktivitäten.
- Normalisierte Meal Logs.

Der größte verbleibende Architekturkonflikt ist die Mischform aus JSONB-App-State und normalisierten Tabellen.

## Gute Entscheidungen

- AI Provider und Modell sind konfigurierbar.
- OpenAI erhält nur strukturierten Coach-Kontext.
- Strava ist Adapter, nicht Domain-Modell.
- Coach-Antworten trennen Beratung, Vorschlag und Änderung.
- Meal Logs sind persistente Supabase-Daten und nicht nur React State.
- Page Context gewichtet Coach-Kontext je nach Produktbereich.

## Technische Schulden

- `app_states` enthält weiterhin Planung, Standards und Teile der Produktdomäne als JSONB.
- Standardmahlzeiten, Rezepte und Templates sind noch nicht vollständig normalisiert angebunden.
- Gewicht, Schlaf, Krankheit, Alkohol, Wasser und Regeneration fehlen als echte Zeitreihen.
- Es gibt kaum automatisierte Tests für fachliche Regeln.
- Coach-Change-Typen sind noch zu grob für Rezepte, Standards und komplexe Trainingspläne.
- Kein Undo/Audit Trail für übernommene Änderungen.

## Zielarchitektur

- `app_states` bleibt nur noch UI-/Migrationsfallback.
- Fachliche Daten wandern in normalisierte Tabellen:
  - `profiles`
  - `goals`
  - `daily_plans`
  - `planned_workouts`
  - `workout_templates`
  - `meal_logs`
  - `standard_meals`
  - `recipes`
  - `recipe_ingredients`
  - `weight_logs`
  - `recovery_logs`
  - `coach_actions`
- Der Context Builder liest serverseitig aus diesen Tabellen und erstellt page-context-gewichtete Zusammenfassungen.
- Coach-Actions werden als Entwürfe gespeichert, angezeigt und erst nach Bestätigung angewendet.

## AI-Architektur

Der Coach braucht vier Schichten:

1. Intent-Erkennung: Beratung, Planungsvorschlag oder Änderungsbestätigung.
2. Context Builder: relevante Daten serverseitig zusammenfassen.
3. Response Schema: Empfehlungen, Rückfragen, Vorschläge, Actions.
4. Action Executor: bestätigte Änderungen validieren, speichern und auditieren.

Aktuell existieren 1-3 in guter Grundform. Schicht 4 braucht mehr Robustheit.

## Prioritäten vor Skalierung

1. Tests für Coach-Intent, Planänderungen, Nutrition-Logs und Context Builder.
2. Normalisierung von Standards und Rezepten.
3. Audit Trail für Coach-Übernahmen.
4. Monitoring für AI-Fehler, Strava-Sync und Supabase-Persistenz.
5. Datenexport und Account-Löschung.

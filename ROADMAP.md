# Roadmap

## Sprint 1: Produktgrundgerüst

Status: umgesetzt

- Next.js App
- Navigation
- sechs Hauptbereiche
- ruhiges Mobile-first UI
- statische Mock-Inhalte

## Sprint 2: Architekturfundament

Status: umgesetzt und verifiziert

- `src`-Struktur
- Domain-Typen
- getrennte Mock-Daten
- regelbasierte Daily-Briefing-Engine
- Heute-Seite aus generiertem Briefing
- Projektdokumentation

## Sprint 3: Planungslogik

Status: umgesetzt und verifiziert

Ziel:

Die Wochenplanung soll fachlich relevant werden und das Daily Briefing beeinflussen.

Umgesetzt:

- `WeekPlan`
- `DayPlan`
- Tagesbausteine als `DayBlock`
- Demo-Wochenvorlage
- Auswahl eines Tages
- Ableitung des Briefings aus dem ausgewählten Tag
- Link von Planung zu Heute über `?date=`
- passive Prioritäten statt Abhak-Checkliste

## Sprint 4: Lokale Bearbeitung

Status: umgesetzt und verifiziert

Ziel:

Der Nutzer kann Standards und Tagesdaten lokal ändern.

Umgesetzt:

- lokale Persistenz
- Training bearbeiten
- Profil- und Wettkampfziel anpassen
- ausgewählten Demo-Tag speichern
- Home-Office, Büroarbeit und Reisetag pro Tag setzen

## Sprint 5: Training und Fueling als Funktionen

Status: umgesetzt und verifiziert

Ziel:

Training und Fueling werden aus dem lokalen Wochenplan bedienbar.

Umgesetzt:

- Training-Seite mit Wochenübersicht
- Trainingseinheiten hinzufügen, status ändern, entfernen
- Fueling-Seite mit Standardmahlzeiten
- neue Standardmahlzeiten lokal speichern
- Tages-Fueling bearbeiten, aber nicht als Wochen-Essensplan in Planung

## Sprint 6: Insights und Einstellungen verbinden

Status: umgesetzt und verifiziert

Ziel:

Insights und Einstellungen arbeiten mit denselben lokalen Daten.

Umgesetzt:

- Insights aus Wochenplan, Training und Zielen ableiten
- Profil bearbeiten
- Ziele bearbeiten
- Wettkampfziel bearbeiten
- Demo-Daten zurücksetzen

## Sprint 7: Coach-Chat und Beta-Fundament

Status: umgesetzt

Ziel:

Die App wird vom Demo-Mockup zur privaten Beta mit Login, persistentem App-State und einem beratenden Coach.

Umgesetzt:

- Supabase Auth und RLS
- privater Online-Betrieb
- leerer Beta-Zustand statt Demo-Daten
- providerunabhängige AI-Schicht
- Coach-Bereich mit Empfehlungen und übernehmbaren Vorschlägen
- Trainingsarten und Laufdetails geschärft
- serverseitiger Coach Context Builder

## Sprint 8: Strava als erste externe Datenquelle

Status: umgesetzt

Ziel:

Externe Trainingsdaten fließen dauerhaft in Supabase und werden Teil der persönlichen Wissensbasis.

Umgesetzt:

- Strava OAuth mit serverseitiger Token-Speicherung
- automatischer Token-Refresh
- initiale Synchronisation nach Connect
- manuelle Synchronisation in den Einstellungen
- de-duplizierende Upserts nach Provider und Activity-ID
- providerneutrales Aktivitätsmodell
- optionale Streams für spätere Tiefenanalysen
- Sync-Jobs mit Status, Zählern und Fehlermeldungen
- Coach-Kontext lädt relevante externe Aktivitäten aus Supabase
- Architektur für Garmin, Apple Health, Health Connect, Polar, Coros, Oura und Withings vorbereitet

## Sprint 9: Today Nutrition Status und AI Fueling Evaluation

Status: umgesetzt

Ziel:

Die Heute-Seite zeigt echte gegessene Mahlzeiten, Tagesbilanz und Makro-Fortschritt. Fueling kann grob per Chat erfasst und serverseitig geschätzt werden.

Umgesetzt:

- persistente `meal_logs` mit Supabase RLS
- Tabellen für `standard_meals`, `recipes`, `recipe_ingredients` und `nutrition_estimates` vorbereitet
- Today-Bereich „Heute gegessen“
- Tagesbilanz mit kcal Input, kcal Ziel, Tagesverbrauch, Protein und Kohlenhydraten
- Bereich „Was fehlt noch?“ mit konkreter Protein-/Carb-Lücke
- serverseitige AI-/Fallback-Schätzung für Mahlzeiten
- Coach-Kontext enthält heutige Nutrition Logs

## Sprint 10: Persistenter Coach-Chat

Status: umgesetzt

Ziel:

Der Coach fühlt sich mehr wie ChatGPT an: freie Unterhaltung, gespeicherter Kontext, serverseitiger App-Kontext und keine Datenänderung ohne Bestätigung.

Umgesetzt:

- OpenAI serverseitig über `OPENAI_API_KEY` oder generischen `AI_API_KEY`
- Chat-Historie in Supabase mit RLS
- Verlauf wird beim Öffnen geladen und an die Coach-API gegeben
- Fallback-Hinweis, wenn OpenAI fehlt oder nicht antwortet
- lokale Bestätigungen werden ebenfalls im Verlauf protokolliert

## Sprint 11: Today Experience, Context-Aware Coach und Fueling Consistency

Status: umgesetzt

Ziel:

Die Heute-Seite wird zum täglichen Coach-Startpunkt. Fueling wird konsistenter loggbar, und Coach-Empfehlungen berücksichtigen den App-Bereich.

Umgesetzt:

- Heute-Seite neu priorisiert: Briefing, Tagesfortschritt, gegessene Mahlzeiten, Tagesbilanz, Coach-Empfehlungen, Morgenblick und Quick Actions
- Fueling Quick Add direkt auf Heute
- Meal Logs im Fueling-Bereich bearbeitbar und löschbar
- Meal Logs mit Kategorie und Hauptmahlzeit-Metadaten
- Coach-API mit `pageContext`
- sichtbare Coach-/KI-Empfehlungen auf Today, Planning, Training, Fueling, Insights und Settings
- Planning-Chat nutzt Planning-Kontext

## Sprint 12: Product Experience 2.0

Status: umgesetzt

Ziel:

Das Produkt wird konsequenter als persönlicher Coach ausgerichtet. Seiten liefern Kontext und Aktionen, der Coach bleibt der Entscheidungsanker.

Umgesetzt:

- Product Review für Today, Planning, Training, Fueling, Insights, Settings und Coach
- `docs/PRODUCT_REVIEW.md`, `docs/UX_REVIEW.md`, `docs/ARCHITECTURE_REVIEW.md`
- Today-Reihenfolge geschärft: Briefing, Tagesziele, Fortschritt, Aktivitäten, Ernährung, Empfehlungen, Morgen, Quick Actions
- alte doppelte Today-Hinweise entfernt
- Coach-Empfehlungen auf Today mit „Mit Coach besprechen“ und Mini-Chat
- CoachChatPanel unterstützt getrennte Threads und initiale Gesprächsimpulse
- Context Builder gewichtet Kontext nach Page Context
- Quick-Fueling und Coach-Übernahmen speichern Kategorie und Hauptmahlzeit
- Quick-Fueling-Entwürfe können direkt als Standardmahlzeit gespeichert werden

## Sprint 13: Regelqualität und Tests

Ziel:

Empfehlungen werden über mehrere Tage konsistenter und erklärbarer.

Möglicher Umfang:

- Unit-Tests für Briefing-Engine
- Planvalidierung für harte Wochen und Ruhetage
- bessere Meal-Timing-Regeln
- Coach-Chat als Ausnahme- und Anpassungsfluss konzipieren
- bessere Coaching-Hinweise für Restaurant, Reise, Krankheit und lange Läufe
- erste kleine UI-Regression-Smokes

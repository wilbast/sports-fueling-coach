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

## Sprint 9: Regelqualität und Tests

Ziel:

Empfehlungen werden über mehrere Tage konsistenter und erklärbarer.

Möglicher Umfang:

- Unit-Tests für Briefing-Engine
- Planvalidierung für harte Wochen und Ruhetage
- bessere Meal-Timing-Regeln
- Coach-Chat als Ausnahme- und Anpassungsfluss konzipieren
- bessere Coaching-Hinweise für Restaurant, Reise, Krankheit und lange Läufe
- erste kleine UI-Regression-Smokes

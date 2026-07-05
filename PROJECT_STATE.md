# Project State

**Datum:** 2026-07-05  
**Status:** Beta-Übergang umgesetzt

## Produktstand

Sports & Fueling Coach ist eine private Next.js-App mit Supabase Auth/RLS für den Online-Betrieb und einem lokalen Demo-Fallback ohne Backend.

Sprint 1 hat das klickbare Produktgefühl geliefert: Navigation, sechs Hauptbereiche und eine starke Heute-Seite.

Sprint 2 baut das Architekturfundament: strukturierte Domain-Typen, getrennte Mock-Daten und eine regelbasierte Daily-Briefing-Engine.

Sprint 3 verbindet die Wochenplanung mit dem Daily Briefing. Die Planung-Seite arbeitet jetzt mit einer strukturierten Demo-Woche, auswählbaren Tagen, Tagesbausteinen und einer Briefing-Vorschau. Die Heute-Seite kann Demo-Tage per Datum anzeigen.

Sprint 4-6 machen die Oberfläche im lokalen Demo-Modus funktional. Planung, Training, Fueling, Insights und Einstellungen greifen auf denselben lokalen App-State zu und speichern Änderungen im Browser.

Nach Product-Owner-Feedback wurde die Planung geschärft: Sie enthält keinen Tagesfokus und keine Essens-Wochenplanung mehr, sondern nur noch Home-Office, Büroarbeit, Reisetag und Training.

Der aktuelle Stand ergänzt wiederverwendbare Standards: Planungsstandards, Trainingsstandards, Fuelingstandards und komplette Standardwochen. Standardwochen enthalten Rahmenbedingungen, Training und grobe Fueling-Slots, bleiben aber Startpunkte für Tagesbriefings und spätere Coach-Anpassungen, nicht starre Essens-Wochenpläne.

Zusätzlich ist die App für privaten Online-Betrieb vorbereitet: Supabase Auth per E-Mail/Passwort, geschützte App-Routen und eine RLS-abgesicherte `app_states`-Tabelle für den vollständigen App-State.

Der aktuelle Sprint trennt Demo und Beta klarer: Online-Nutzer starten mit einem leeren Beta-Zustand, Basis-Standards für Alltag und einfache Mahlzeiten, aber ohne vorgefüllte Trainingswoche. Bestehende Demo-Zustände in Supabase können in den Einstellungen über `Beta-Zustand neu starten` aufgeräumt werden.

Der neueste Sprint erweitert den Coach von einer Planungseingabe zu einer eigenen Beratungsfläche unter `/coach`. Nachrichten werden über `/api/coach` verarbeitet, bei gesetztem `AI_PROVIDER` serverseitig über den konfigurierten Provider und sonst über einen lokalen Fallback-Parser. Der Coach nutzt Profil, Ziele, Training, Fueling, Standards und Wochenplanung, gibt konkrete Vorschläge und kann übernehmbare Änderungen für Training oder Fueling liefern.

Die Trainingsplanung unterscheidet jetzt Laufen, Padel Tennis, Schwimmen, Squash, HIIT, Krafttraining und Radfahren. Laufen hat zusätzlich Laufart und Fokus: Lockerer Lauf, Tempodauerlauf, Fahrtspiel, Intervalltraining sowie Basis, Regeneration, Schwellentraining und VO2Max.

## Verifikation

- `pnpm typecheck` erfolgreich
- `pnpm lint` erfolgreich
- `pnpm build` erfolgreich
- lokaler Fallback-Modus erfolgreich: `/today` und `/login`
- lokaler HTTP-Smoke-Test erfolgreich: `/today`, `/planning`, `/training`, `/fueling`, `/insights`, `/settings`
- Browser-Smoke-Test erfolgreich: Training in Planung hinzufügen, Training-Seite prüfen, Profilname ändern, Heute-Seite übernimmt Änderung

## Aktueller Nutzen

Der Nutzer kann morgens die Heute-Seite öffnen und sieht:

- geplante Sporteinheiten
- Kalorienbereich
- Proteinbereich
- Kohlenhydratbereich
- Mahlzeitenvorschlag
- aktiven Coach-Hinweis
- Wettkampfkontext mit Datum, Distanz und Zielzeit

In der Planung kann der Nutzer:

- eine Demo-Woche sehen
- Tage auswählen
- Home-Office, Büroarbeit oder Reisetag setzen
- sofort sehen, wie der Tag das Briefing verändert
- den ausgewählten Tag als Heute-Seite öffnen
- Trainingseinheiten hinzufügen, status ändern oder entfernen
- Zusatzinfos wie Biergarten, Restaurantbesuch oder Treffen mit Freunden ergänzen
- Planungsstandards anwenden oder aus dem aktuellen Tag speichern
- Trainingsstandards einfügen oder neue Einheiten als Standard speichern
- komplette Standardwochen anwenden oder aus der aktuellen Woche speichern

Weitere Bereiche:

- Training zeigt die Woche aus dem lokalen Plan, erlaubt Statusänderungen und verwaltet Trainingsstandards.
- Fueling erlaubt Fuelingstandards, einmalige Tagesmahlzeiten und Tageszuordnung, aber nicht als starre Wochenplanung in Planung.
- Insights leitet Wochenwerte aus Training und Zielen ab.
- Einstellungen erlauben Profil-, Ziel- und Wettkampfänderungen.
- Demo-Daten können zurückgesetzt werden.

## Technischer Stand

- Framework: Next.js App Router
- Sprache: TypeScript
- Styling: Tailwind CSS
- Daten: lokale Mock-Daten
- Lokale Persistenz: LocalStorage
- Kernlogik: pure TypeScript-Domain-Funktionen
- Planung: `WeekPlan`, `DayPlan`, Arbeits-/Reisekontext und Training
- Standards: `PlanningStandard`, `WorkoutTemplate`, `StandardWeekTemplate`
- App-State: React Context in `src/features/app-state`
- Auth: Supabase SSR Clients, Middleware und Login-Seite
- Persistenz online: JSONB-State in Supabase mit RLS pro `auth.uid()`
- KI: providerunabhängige serverseitige AI-Schicht, aktueller Startprovider OpenAI, Fallback regelbasiert
- Externe Sportintegrationen: keine

## Bekannte Grenzen

- Empfehlungen sind regelbasiert und grob.
- LocalStorage ist Demo-Persistenz, keine robuste Datenbank.
- Bestehende Supabase-Zustände werden nicht automatisch überschrieben, sondern müssen bewusst zurückgesetzt werden.
- JSONB-State ist bewusst ein Übergangsmodell und noch kein normalisiertes Datenmodell.
- Es gibt noch keine Validierung auf fachlich unmögliche Pläne.
- Insights sind abgeleitet, aber noch nicht tief analysiert.
- Es gibt noch keine automatisierten Unit-Tests.
- Der Coach bietet übernehmbare Vorschläge, hat aber noch keine Undo-Historie.
- Es gibt noch keine Importfunktionen.

## Nächster sinnvoller Sprint

Der nächste Sprint sollte Testabdeckung und Regelqualität erhöhen: Briefing-Engine testen, Planvalidierung ergänzen und bessere Coaching-Regeln für harte Wochen, Ruhetage, Restauranttage und lange Läufe bauen.

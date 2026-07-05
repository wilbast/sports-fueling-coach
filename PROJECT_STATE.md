# Project State

**Datum:** 2026-07-05  
**Status:** Sprint 4-6 umgesetzt und verifiziert  

## Produktstand

Sports & Fueling Coach ist aktuell eine lokale Next.js-Demo-App ohne Backend, Auth, KI oder externe Integrationen.

Sprint 1 hat das klickbare Produktgefühl geliefert: Navigation, sechs Hauptbereiche und eine starke Heute-Seite.

Sprint 2 baut das Architekturfundament: strukturierte Domain-Typen, getrennte Mock-Daten und eine regelbasierte Daily-Briefing-Engine.

Sprint 3 verbindet die Wochenplanung mit dem Daily Briefing. Die Planung-Seite arbeitet jetzt mit einer strukturierten Demo-Woche, auswählbaren Tagen, Tagesbausteinen und einer Briefing-Vorschau. Die Heute-Seite kann Demo-Tage per Datum anzeigen.

Sprint 4-6 machen die Oberfläche im lokalen Demo-Modus funktional. Planung, Training, Fueling, Insights und Einstellungen greifen auf denselben lokalen App-State zu und speichern Änderungen im Browser.

Nach Product-Owner-Feedback wurde die Planung geschärft: Sie enthält keinen Tagesfokus und keine Essens-Wochenplanung mehr, sondern nur noch Home-Office, Büroarbeit, Reisetag und Training.

Der aktuelle Stand ergänzt wiederverwendbare Standards: Planungsstandards, Trainingsstandards, Fuelingstandards und komplette Standardwochen. Standardwochen enthalten Rahmenbedingungen, Training und grobe Fueling-Slots, bleiben aber Startpunkte für Tagesbriefings und spätere Coach-Anpassungen, nicht starre Essens-Wochenpläne.

Zusätzlich ist die App für privaten Online-Betrieb vorbereitet: Supabase Auth per E-Mail/Passwort, geschützte App-Routen und eine RLS-abgesicherte `app_states`-Tabelle für den vollständigen lokalen App-State.

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
- KI: keine
- Integrationen: keine

## Bekannte Grenzen

- Empfehlungen sind regelbasiert und grob.
- LocalStorage ist Demo-Persistenz, keine robuste Datenbank.
- Supabase wurde lokal ohne echte Projekt-Credentials nicht gegen eine echte Instanz getestet.
- JSONB-State ist bewusst ein Übergangsmodell und noch kein normalisiertes Datenmodell.
- Es gibt noch keine Validierung auf fachlich unmögliche Pläne.
- Insights sind abgeleitet, aber noch nicht tief analysiert.
- Es gibt noch keine automatisierten Unit-Tests.
- Es gibt noch keine Import- oder KI-Funktionen.
- Coach-Chat ist fachlich vorgesehen, aber noch nicht implementiert.

## Nächster sinnvoller Sprint

Der nächste Sprint sollte Testabdeckung und Regelqualität erhöhen: Briefing-Engine testen, Planvalidierung ergänzen und bessere Coaching-Regeln für harte Wochen, Ruhetage, Restauranttage und lange Läufe bauen.

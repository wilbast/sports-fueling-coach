# Project State

**Datum:** 2026-07-06
**Status:** Today Experience mit kontextbewusstem Coach und konsistenterem Fueling

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

Der aktuelle Coach-Sprint schärft die Benutzererfahrung grundlegend: Coach Mode ist der Standard und dient reiner Beratung. Planning Mode erzeugt nur Vorschläge. Change Mode entsteht erst durch ausdrückliche Bestätigung, z. B. per Button oder kurzer Übernahme-Nachricht. Damit kann der Nutzer frei mit dem Coach diskutieren, ohne Angst vor automatischen Planänderungen zu haben.

Der neueste Coach-Sprint macht den Chat näher an eine echte Session-UX: Für eingeloggte Nutzer wird die Unterhaltung in `coach_chat_messages` gespeichert, aber ein neu geöffnetes Chatfenster startet leer. Beim Seiten- oder Datumswechsel entsteht eine neue Session. Frühere Chats zum aktiven Tag sind im Coach-Panel unter „Frühere Chats am aktiven Tag“ abrufbar und können fortgesetzt werden. OpenAI läuft ausschließlich serverseitig über `OPENAI_API_KEY` oder den generischen `AI_API_KEY`; fehlt die Konfiguration, bleibt die App nutzbar und zeigt den regelbasierten Fallback transparent an.

Der aktuelle Experience-Sprint macht die Heute-Seite stärker zum täglichen Coach: Sie zeigt Briefing, Tagesfortschritt, gegessene Mahlzeiten, Tagesbilanz, Lücken bei Protein/Kohlenhydraten, Coach-Empfehlungen, Morgenblick und Quick Actions in einer klareren Reihenfolge. Fueling ist direkt von Heute erreichbar, weil Essen und Trinken mehrfach am Tag geloggt werden.

Meal Logs können im Fueling-Bereich bearbeitet und gelöscht werden. Jede geloggte Mahlzeit hat eine Kategorie wie Frühstück, Mittagessen, Abendessen, Snack oder Getränk und kann als Hauptmahlzeit markiert werden. Diese Metadaten werden persistent in Supabase gespeichert und für ältere Einträge aus Uhrzeit und Name abgeleitet.

Coach-Anfragen können jetzt pro Bereich einen `pageContext` senden. Heute, Fueling, Training, Planung, Insights und Einstellungen erhalten damit sichtbare Coach-/KI-Empfehlungen, ohne das Grundprinzip zu brechen: Beratung zuerst, keine automatische Planänderung.

Product Experience Sprint 2.0 schärft diese Richtung: Today ist nicht mehr als Statistik-Dashboard gedacht, sondern als persönlicher Tagescoach. Coach-Empfehlungen auf Today können direkt in einem eigenen Mini-Chat besprochen werden. Der Context Builder gewichtet den Kontext nun explizit nach Seite, und Quick-Fueling sowie Coach-Übernahmen speichern Kategorie und Hauptmahlzeit konsistent.

Die Trainingsplanung unterscheidet jetzt Laufen, Padel Tennis, Schwimmen, Squash, HIIT, Krafttraining und Radfahren. Laufen hat zusätzlich Laufart und Fokus: Lockerer Lauf, Tempodauerlauf, Fahrtspiel, Intervalltraining sowie Basis, Regeneration, Schwellentraining und VO2Max.

Der aktuelle Sprint macht Strava zur ersten externen Datenquelle. Nutzer können Strava per OAuth verbinden, Aktivitäten initial und manuell synchronisieren und den Verbindungsstatus in den Einstellungen sehen. Intern werden die Aktivitäten nicht als isolierte Strava-Daten behandelt, sondern in ein providerneutrales Aktivitätsmodell gemappt. Damit ist die App auf weitere Quellen wie Garmin, Apple Health, Health Connect, Polar, Coros, Oura oder Withings vorbereitet.

Der neueste Coach-Kontext-Sprint verbessert die Trainingsbewertung: Der Coach zählt vergangene oder ausgewählte Tage nicht mehr aus dem Plan, sondern aus tatsächlich importierten Aktivitäten. Für die laufende Woche kombiniert er erledigte Strava-Aktivitäten mit zukünftigen geplanten Workouts. Dadurch werden spontane Einheiten direkt im projizierten Wochenumfang, in der Wettkampfbereitschaft und in Trainingsempfehlungen berücksichtigt.

Der Coach-Chat unterstützt jetzt Streaming: Die UI zeigt den Antworttext live während der Provider-Antwort an. Die finalen Outcomes, Suggestions und Übernahme-Aktionen werden erst nach Abschluss der strukturierten Antwort gesetzt.

Heute, Training und Fueling zeigen nun oben einen zeitabhängigen Coach-Impuls für 06:00, 14:00 und 21:00 Uhr. Der Block ist bewusst leichtgewichtig und regelbasiert, damit die Seiten sofort laden und keine automatischen AI-Kosten beim Öffnen entstehen.

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
- Coach-Modi: `coach`, `planning`, `change`; Planänderungen werden erst nach Bestätigung angewendet
- Coach-Historie: `coach_chat_messages` speichert User-/Coach-Nachrichten RLS-geschützt pro Nutzer und Thread
- Coach-Streaming: `/api/coach?stream=1` liefert `delta`-Events für Live-Text und ein finales `CoachPlanResponse`-Objekt
- Zeitabhängige Coach-Impulse: Today, Training und Fueling zeigen 06:00-/14:00-/21:00-Zusammenfassungen aus aktuellem Seitenkontext
- Externe Sportintegrationen: Strava OAuth, Token-Refresh, initiale, manuelle und tägliche Vercel-Hobby-Cron-Synchronisation um `23:00 UTC`, providerneutrale Aktivitätstabellen
- Integrationsdaten: `external_connections`, `external_source_tokens`, `activities`, `activity_streams`, `activity_zones`, `training_zones`, `equipment`, `sync_jobs`
- Coach-Kontext: externe Aktivitäten und Trainingszonen werden serverseitig aus Supabase geladen, mit erweiterten Strava-Kriterien strukturiert zusammengefasst und als Ist-plus-Zukunft-Bewertung in den Wochenumfang einbezogen; der AI-Provider greift weder auf Strava noch direkt auf Supabase zu
- Nutrition: geloggte Mahlzeiten liegen für eingeloggte Nutzer in `meal_logs`; die Heute-Seite zeigt Tagesbilanz, Input-vs.-Output, Protein-/Carb-Fortschritt und fehlende Makros
- Meal-Log-Metadaten: Kategorie und Hauptmahlzeit werden in `metadata` gespeichert und in Coach-Kontext, Today und Fueling-UI genutzt
- Coach Page Context: `/api/coach` akzeptiert `pageContext` und schärft die Empfehlung je nach App-Bereich
- Context Builder: Page Context wird serverseitig in die Kontextstrategie aufgenommen und beeinflusst Domain-Fokus, Morgenblick und Deep Context
- AI-Fueling: `/api/nutrition/estimate` schätzt Nährwerte serverseitig mit AI oder transparentem Fallback; Werte werden als KI-Schätzung oder manuell bestätigt gekennzeichnet
- Reviews: `docs/PRODUCT_REVIEW.md`, `docs/UX_REVIEW.md`, `docs/ARCHITECTURE_REVIEW.md`

## Bekannte Grenzen

- Empfehlungen sind teilweise regelbasiert und fachlich noch grob.
- LocalStorage ist Demo-Persistenz, keine robuste Datenbank.
- Bestehende Supabase-Zustände werden nicht automatisch überschrieben, sondern müssen bewusst zurückgesetzt werden.
- JSONB-State ist für Planung/Fueling/Standards noch ein Übergangsmodell; externe Aktivitäten sind bereits normalisiert.
- Standardmahlzeiten werden UI-seitig noch aus dem App-State angezeigt; die normalisierte `standard_meals`-Tabelle ist vorbereitet, aber noch nicht vollständig als Verwaltungsquelle angebunden.
- Es gibt noch keine Validierung auf fachlich unmögliche Pläne.
- Insights sind abgeleitet, aber noch nicht tief analysiert.
- Es gibt noch keine automatisierten Unit-Tests.
- Der Coach bietet übernehmbare Vorschläge, hat aber noch keine Undo-Historie.
- Schlaf, Krankheit, Alkohol und Regeneration sind noch keine echten Zeitreihen. Wasser wird bewusst nicht getrackt.
- Trainingstage und Wochenumfang werden nur so gut bewertet wie die importierten Ist-Aktivitäten; ohne Sync bleibt die Planung Referenz.
- Alte Coach-Antworten werden als Textverlauf wiederhergestellt; frühere Vorschlagsbuttons werden nach Reload nicht rekonstruiert.
- Strava-Synchronisation ist implementiert, aber ohne echte Strava-Credentials und produktive Supabase-Migration nicht live verifiziert.

## Nächster sinnvoller Sprint

Der nächste Sprint sollte Standardmahlzeiten und Rezepte vollständig auf die normalisierten Supabase-Tabellen migrieren und Bearbeiten/Korrigieren inklusive manueller Nährwertbestätigung ausbauen.

# Product Review

Datum: 2026-07-05

## Positives

- Die Produktvision ist klar erkennbar: Heute-Seite, Coach, Planung, Training, Fueling und Insights zahlen auf eine persönliche Trainings- und Ernährungssteuerung ein.
- Die Heute-Seite ist weiterhin der stärkste Produktanker. Sie verbindet Training, Verbrauch, Nutrition Status, Coach-Hinweis und schnelle Fueling-Erfassung.
- Supabase Auth/RLS, normalisierte Aktivitätsdaten und Meal Logs sind gute Schritte weg vom Demo-State.
- Der Coach verhält sich inzwischen vorsichtiger: Beratung und Vorschläge sind von echten Änderungen getrennt.
- Strava ist architektonisch richtig als externe Datenquelle modelliert, nicht als isoliertes UI-Feature.

## Schwächen

- Fueling war vor diesem Sprint auf mehrere Bedienmodelle verteilt: Quick Chat, Standards, Tagesplan und Today Logs waren nicht ausreichend verbunden.
- Die Standardverwaltung war zu technisch und konnte Mahlzeiten nicht bearbeiten, sortieren oder per KI schätzen.
- Insights waren eher Wocheninterpretation als echte Erkenntnis. Plan vs. Ist war nicht sichtbar.
- Es gibt weiterhin zwei Datenwelten: JSONB-App-State für Planung/Standards und normalisierte Tabellen für Aktivitäten/Meal Logs.
- Rezepte sind im Datenmodell vorbereitet, aber noch nicht als vollwertige Bedienoberfläche umgesetzt.

## Inkonsistenzen

- Navigation: `Konfig` klang technisch und wurde zu `Standards` umbenannt.
- Coach-Fueling: Fueling-Vorschläge wirkten wie Planänderungen. Sie werden jetzt als Tages-Fueling oder Standard übernommen.
- Fueling-Seite: Geloggte Mahlzeiten waren nicht dort sichtbar, wo der Nutzer Fueling erwartet. Die Seite zeigt jetzt Standards, Tageslogs, Wochenhistorie und Rezeptstatus.
- Standardmahlzeiten: Erstellen war möglich, aber Bearbeiten, Löschen, Reihenfolge und Makros für Carbs/Fett fehlten.
- Insights: Training, Ernährung, Kalorien, Protein und Carbs wurden nicht konsistent gegenübergestellt.

## Direkt Behobene UX-Probleme

- Coach-Fueling-Vorschläge haben jetzt spezifische Aktionen:
  - Zum Tag hinzufügen
  - Zum Tag + Standard
  - Nur als Standard
- Standardmahlzeiten können in der Standards-Seite hinzugefügt, bearbeitet, gelöscht, ausgeblendet und sortiert werden.
- Beim Hinzufügen/Bearbeiten von Standardmahlzeiten kann eine KI-Schätzung für kcal, Protein, Kohlenhydrate und Fett geladen und anschließend bestätigt werden.
- Fueling zeigt geloggte Mahlzeiten des aktiven Tages und eine Wochenhistorie.
- Insights zeigt eine tägliche Plan-vs.-Ist-Tabelle für Training, Mahlzeiten, Kalorien, Protein und Carbs.
- PWA-Basis mit Manifest, Theme Color und App Icons wurde vorbereitet.

## Architekturprobleme

- `AppState` als JSONB ist für Planung und Standards noch sinnvoll für Geschwindigkeit, wird aber langfristig zum Engpass für Analysen, Historie, Undo und mehrbenutzerfähige Datenqualität.
- Standardmahlzeiten existieren aktuell im App-State, während echte Mahlzeiten in `meal_logs` liegen. Eine Migration auf `standard_meals` als Quelle ist weiterhin notwendig.
- Rezepte, Zutaten und Nutrition Estimates sind vorbereitet, aber nicht vollständig als UI-Workflow angebunden.
- Coach-Änderungen sind typisiert, aber noch nicht vollständig domain-spezifisch. Fueling ist jetzt besser getrennt, Rezepte und Standardänderungen sollten eigene Change-Typen bekommen.
- Insights nutzt aktuell verfügbare Plan-, Activity- und Meal-Log-Daten, aber Gewichtstrend fehlt als normalisierte Zeitreihe.

## Verbesserungsvorschläge

- Standards normalisieren: `standard_meals`, `workout_templates`, `planning_templates` und `standard_weeks` sollten mittelfristig eigene Supabase-Tabellen werden.
- Coach-Commands erweitern:
  - `create_standard_meal`
  - `update_standard_meal`
  - `create_recipe`
  - `plan_day`
- Rezeptverwaltung als separaten Sprint bauen: Zutaten, Portionen, KI-Schätzung, manuelle Bestätigung, Log aus Rezept.
- Meal Logs bearbeitbar machen, damit falsche KI-Schätzungen direkt korrigiert werden können.
- Gewicht als Zeitreihe speichern und in Insights als 7-/14-/30-Tage-Trend anzeigen.
- Mobile Navigation mittelfristig auf häufigste Workflows reduzieren und seltenere Bereiche in ein Mehr-Menü legen.

## Offene Entscheidungen

- Sollen Standardmahlzeiten sofort vollständig aus `standard_meals` kommen oder bleibt der App-State noch ein Übergangsmodell?
- Soll Fueling primär gegessene Mahlzeiten loggen oder auch geplante Mahlzeiten als eigene Planobjekte führen?
- Soll der Coach Standards direkt ändern dürfen, oder immer erst einen Änderungsentwurf mit expliziter Bestätigung anzeigen?
- Wie exakt sollen Rezepte werden: grobe Portionen oder Zutaten mit Grammangaben?
- Welche PWA-Assets sollen final verwendet werden: einfache Systemicons oder ein gestaltetes Brand-Icon?

# Sports & Fueling Coach
## PROJECT.md
**Version:** 1.3  
**Status:** Draft  

---

# 1. Vision

Sports & Fueling Coach ist ein persönlicher KI-Coach für Training, Ernährung, Fueling und sportliche Zielerreichung.

Der Fokus liegt darauf, dem Nutzer jeden Tag konkrete Empfehlungen zu geben:

> Was sollte ich heute trainieren, was sollte ich essen, wann sollte ich es essen und wie passt das zu meinem Ziel?

Die App ist kein klassischer Tracker. Sie ist ein Entscheidungsassistent.

---

# 2. Kernprinzipien

## 2.1 Ernährung und Training gehören zusammen

Ernährung ist ein Hauptfokus der App, aber sie wird immer im Kontext von Training, Alltag, Erholung und Zielen geplant.

## 2.2 Proaktiv statt reaktiv

Die App soll morgens automatisch ein Daily Briefing erstellen. Der Nutzer soll nicht erst fragen müssen.

## 2.3 Chat nur für Ausnahmen

Der Standard ist nicht der Chat. Der Standard ist das proaktive Daily Briefing.

Der Chat wird genutzt, wenn sich etwas ändert:

- spontanes Restaurant
- Krankheit
- Training fällt aus
- zusätzliche Sporteinheit
- Speisekarte oder Foto
- Frage während des Tages

## 2.4 Wenig manuelle Eingabe

Wiederkehrende Mahlzeiten, Rezepte, Sporteinheiten und Wochenabläufe werden als Standards gespeichert.

## 2.5 Planung vor Dokumentation

Die App schaut nach vorne. Vergangene Daten werden genutzt, um bessere Entscheidungen für heute, morgen und die Woche zu treffen.

## 2.6 Daten mit Einordnung

Statistiken sind vorhanden, aber nicht im Vordergrund. Daten werden mit Interpretation angezeigt.

---

# 3. App-Bereiche / Informationsarchitektur

Die App besteht aus sechs Hauptbereichen.

## 3.1 Heute

Zentrale Startseite der App.

Ziel: Innerhalb von 30 Sekunden wissen, was heute wichtig ist.

Inhalte:

- Daily Briefing
- heutige Sporteinheiten
- heutige Ernährungsempfehlung
- grobe Zielwerte für Kalorien, Protein, Kohlenhydrate
- Mahlzeitentiming
- To-dos zum Abhaken
- Warnungen oder Hinweise
- Coach fragen Button

Beispiel:

- Heute: 10 km locker + Freeletics optional
- Energiebedarf: mittel
- Protein: hoch
- Kohlenhydrate: moderat
- Empfehlung: Standardfrühstück, Chicken Bowl, Banane vor Sport, Shake danach

---

## 3.2 Planung

Zentrale Wochenplanung.

Ziel: Sonntag/Montag eine Woche schnell vorbereiten.

Funktionen:

- neue Woche erstellen
- letzte Woche kopieren
- Wochenvorlage auswählen
- leere Woche erstellen
- Tageskarten bearbeiten
- Tagesbausteine hinzufügen
- geplante Sporteinheiten hinzufügen
- geplante Mahlzeiten oder Rezepte eintragen
- Restaurant, Reise, Familienzeit, Büro, Homeoffice erfassen

Wichtig:

Der Nutzer soll generische Wochenvorlagen selbst anlegen können.

Beispiele für Vorlagen:

- Standardwoche
- Kinderwoche
- Arbeitswoche
- Urlaub
- Wettkampfwoche
- Regenerationswoche

Beispiele für Tagesbausteine:

- Homeoffice
- Bürotag
- Intervalltraining
- Langer Lauf
- Krafttraining
- Padel
- Restaurant
- Reisetag
- Ruhetag
- Krankheit

---

## 3.3 Training

Bereich für geplante und absolvierte Sporteinheiten.

Ziel: Training als Kontext für Ernährung und Ziele erfassen.

Unterstützte Sportarten:

- Laufen
- Krafttraining
- Freeletics
- Padel
- Radfahren
- Schwimmen
- Wandern
- sonstige Sportarten

Funktionen:

- geplante Einheiten erfassen
- Standardsportarten speichern
- Trainingseinheiten aus Strava importieren
- manuelle Einheiten erfassen
- geplantes vs. tatsächliches Training vergleichen
- Trainingsempfehlung für den Tag anzeigen
- Hinweise zur Intensität geben

Beispiele:

- 10 km GA1
- Intervalltraining
- 30 Minuten Freeletics Oberkörper
- 2 Stunden Padel locker
- Langer Lauf 17–18 km

---

## 3.4 Ernährung / Fueling

Zentraler Ernährungsbereich.

Ziel: Mahlzeiten und Fueling einfach planen, vorschlagen und erfassen.

Funktionen:

- Standardmahlzeiten speichern
- Mahlzeiten mit einem Klick loggen
- Rezepte speichern
- Rezeptvorschläge erhalten
- Rezept ins Tageslog übernehmen
- grobe Mahlzeiten erfassen
- Freitext erfassen
- Restaurantbesuche grob erfassen
- später Fotos/Speisekarten analysieren
- Timing-Empfehlungen rund um Sport

Wichtig:

Die App soll keine grammgenaue Erfassung erzwingen.

Die Erfassung soll flexibel sein:

- Standardfrühstück
- Rezept
- grobe Mahlzeit
- Freitext
- Restaurant

---

## 3.5 Insights

Analysebereich.

Ziel: Daten nachvollziehen, aber immer mit Einordnung.

Inhalte:

- verbrauchte Tageskalorien
- aufgenommene Kalorien
- Kalorienbilanz
- Protein
- Kohlenhydrate
- Fett
- Gewichtstrend
- Wochenbilanz
- Trainingsbelastung
- Fortschritt Richtung Ziel

Wichtig:

Insights sind nicht die Startseite. Sie sind eine Zusatzfunktion.

Die App soll nicht nur Diagramme zeigen, sondern erklären:

- Warum stagniert mein Gewicht?
- Warum empfiehlt die App heute mehr Kohlenhydrate?
- Warum sollte ich heute weniger intensiv trainieren?
- Warum war die Woche gut oder nicht gut?

---

## 3.6 Einstellungen

Bereich für Stammdaten und Integrationen.

Inhalte:

- Profil
- Körperdaten
- Ziele
- Wettkämpfe
- Standardmahlzeiten
- Standardtrainingseinheiten
- Wochenvorlagen
- Strava-Verbindung
- OpenAI-Konfiguration
- Datenschutz

---

# 4. Navigation

Für Version 1 wird folgende Navigation vorgeschlagen:

1. Heute
2. Planung
3. Training
4. Fueling
5. Insights
6. Einstellungen

Der Chat ist kein eigener Hauptbereich.

Er erscheint als Button:

> Coach fragen

---

# 5. MVP-Scope

Version 1 soll bewusst klein starten.

## Must Have

- Next.js Web-App / PWA-Grundlage
- Login
- Heute-Seite mit statischem Daily-Briefing-Layout
- Planung-Seite mit Wochenansicht
- Training-Seite mit geplanten Einheiten
- Fueling-Seite mit Standardmahlzeiten und Rezept-Platzhalter
- Insights-Seite mit einfachen Beispielwerten
- Einstellungen-Seite
- saubere Navigation
- responsives Layout für iPhone und Desktop

## Noch nicht in Sprint 1

- echte Strava-Integration
- echte OpenAI-Integration
- vollständige Datenbanklogik
- Rezeptberechnung
- Einkaufsliste
- Fotoanalyse
- Apple Health
- Garmin

---

# 6. Sprint 1 Ziel

Sprint 1 baut nur das Grundgerüst.

Ziel:

Eine klickbare Web-App mit allen Hauptbereichen, Navigation und Beispielinhalten.

Noch keine echten Berechnungen.
Noch keine externen Integrationen.
Noch kein perfektes Design.

Der Zweck von Sprint 1 ist:

- Grundstruktur steht
- App fühlt sich richtig an
- Seitenlogik ist sichtbar
- spätere Funktionen haben einen Platz

---

# 7. Sprint 1 Codex-Auftrag

Codex soll eine Next.js-App mit TypeScript, Tailwind und App Router erstellen.

Anforderungen:

- Projektname: sports-fueling-coach
- Navigation mit sechs Bereichen
- responsive Mobile-first UI
- Startseite: Heute
- einfache Cards
- Beispielinhalte aus diesem Dokument
- keine Backend-Integration in Sprint 1
- keine OpenAI API in Sprint 1
- keine Strava API in Sprint 1

Seiten:

- /today
- /planning
- /training
- /fueling
- /insights
- /settings

Optional:

- / kann automatisch auf /today weiterleiten


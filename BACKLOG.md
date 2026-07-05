# Backlog

## P0

- Erste Tests für die Briefing-Engine ergänzen.
- Planvalidierung ergänzen: zu viele harte Einheiten, Reisetag plus harte Einheit, fehlende Erholung.
- Coaching-Regeln für lange Läufe, Ruhetage, Restauranttage und harte Wochen verbessern.
- Coach-Dialog für fortlaufende Essensanpassungen fachlich konzipieren.
- UI-Smoke-Test als reproduzierbaren Script-Check ergänzen.

## P1

- Standardmahlzeiten und Standardtrainingseinheiten als eigene Domain-Konzepte schärfen.
- Wochenvorlagen kopieren und anwenden.
- Trainingseinheiten stärker typisieren: Standard, Qualität, Long Run, Kraft, Spielsport.
- Insights textlich besser erklären und nach Risiko priorisieren.
- Lokale Datenexport-/Import-Option prüfen.

## Erledigt

- Wochenplanung fachlich modelliert: `WeekPlan`, `DayPlan`, Tagesbausteine, Demo-Vorlage.
- Planung-Seite an Mock-Domain-Daten angeschlossen.
- Daily Briefing aus ausgewähltem Datum abgeleitet.
- Heute-Seite unterstützt Demo-Datum über `?date=`.
- Abhak-Checkliste aus der Heute-Seite entfernt; Hinweise sind passive Prioritäten.
- LocalStorage-App-State eingeführt.
- Planung auf Home-Office, Büroarbeit, Reisetag und Training geschärft.
- Trainingseinheiten im Tagesplan hinzugefügt, geändert und entfernt.
- Essensplanung aus der Wochenplanung entfernt.
- Standardmahlzeiten lokal ergänzt.
- Profil, Ziele und Wettkampfziel lokal bearbeitbar gemacht.
- Insights aus Trainings- und Zieldaten abgeleitet.
- Browser-Smoke-Test für seitenübergreifende Persistenz durchgeführt.

## P2

- Supabase Auth und Datenbank.
- Strava-Import.
- OpenAI-Erklärungen für Coach-Hinweise.
- Rezeptberechnung.
- Foto- und Speisekartenanalyse.
- Apple Health und Garmin.

## bewusst nicht jetzt

- Vollständiger Kalorientracker.
- Chat als Hauptnavigation.
- Grammgenaue Lebensmittel-Erfassung.
- Abhak-Checklisten als zentrales Produktmuster.
- Komplexe Trainingssteuerung vor sauberer Planungslogik.

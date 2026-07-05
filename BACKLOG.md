# Backlog

## P0

- Erste Tests für die Briefing-Engine ergänzen.
- Planvalidierung ergänzen: zu viele harte Einheiten, Reisetag plus harte Einheit, fehlende Erholung.
- Coaching-Regeln für lange Läufe, Ruhetage, Restauranttage und harte Wochen verbessern.
- UI-Smoke-Test als reproduzierbaren Script-Check ergänzen.
- Strava-Import live mit echten Credentials und produktiver Supabase-Migration verifizieren.
- Automatischen Sync-Job für externe Quellen entwerfen.

## P1

- Standardmahlzeiten und Standardtrainingseinheiten als eigene Domain-Konzepte schärfen.
- Wochenvorlagen kopieren und anwenden.
- Trainingseinheiten stärker typisieren: Standard, Qualität, Long Run, Kraft, Spielsport.
- Insights textlich besser erklären und nach Risiko priorisieren.
- Lokale Datenexport-/Import-Option prüfen.
- Aktivitätsanalysen aus realen Strava-Daten ableiten: Belastung, Umfang, Pace- und HF-Trends.
- Equipment-Ansicht für Schuhe und Geräte ergänzen.
- Weitere Provideradapter vorbereiten: Garmin, Apple Health, Health Connect.

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
- Supabase Auth und RLS umgesetzt.
- Coach-Chat mit serverseitiger AI-Schicht und Fallback umgesetzt.
- Context Builder für strukturierte Coach-Kontexte umgesetzt.
- Strava OAuth, Synchronisation und providerneutrales Aktivitätsmodell umgesetzt.

## P2

- OpenAI-Erklärungen für Coach-Hinweise.
- Rezeptberechnung.
- Foto- und Speisekartenanalyse.
- Apple Health, Garmin, Polar, Coros, Oura und Withings anbinden.

## bewusst nicht jetzt

- Vollständiger Kalorientracker.
- Chat als Hauptnavigation.
- Grammgenaue Lebensmittel-Erfassung.
- Abhak-Checklisten als zentrales Produktmuster.
- Komplexe Trainingssteuerung vor sauberer Planungslogik.

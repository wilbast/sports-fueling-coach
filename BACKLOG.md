# Backlog

## P0

- Erste Tests für die Briefing-Engine ergänzen.
- Planvalidierung ergänzen: zu viele harte Einheiten, Reisetag plus harte Einheit, fehlende Erholung.
- Coaching-Regeln für lange Läufe, Ruhetage, Restauranttage und harte Wochen verbessern.
- UI-Smoke-Test als reproduzierbaren Script-Check ergänzen.
- Strava-Import live mit echten Credentials und produktiver Supabase-Migration verifizieren.
- Automatischen Sync-Job für externe Quellen entwerfen.
- Standardmahlzeiten und Rezepte vollständig aus `standard_meals`/`recipes` statt App-State verwalten.
- Coach-Verlauf um Thread-Auswahl und Löschen/Archivieren erweitern.
- Coach-Empfehlungen aus Header-Aktionen optional als eigene Seitenpanels anzeigen, falls sie im engen Header zu dominant werden.
- Normalisierte Zeitreihen für Gewicht, Wasser, Schlaf, Krankheit, Alkohol und Regeneration ergänzen.
- Coach-Audit-Trail und Undo für übernommene Änderungen bauen.
- Tagesbewertung erst nach belastbarer Datenbasis aktivieren.

## P1

- Standardmahlzeiten und Standardtrainingseinheiten als eigene Domain-Konzepte schärfen.
- Wochenvorlagen kopieren und anwenden.
- Trainingseinheiten stärker typisieren: Standard, Qualität, Long Run, Kraft, Spielsport.
- Insights textlich besser erklären und nach Risiko priorisieren.
- Lokale Datenexport-/Import-Option prüfen.
- Aktivitätsanalysen aus realen Strava-Daten und Zonen ableiten: Belastung, Umfang, Pace-, HF- und Power-Trends.
- Equipment-Ansicht für Schuhe und Geräte ergänzen.
- Weitere Provideradapter vorbereiten: Garmin, Apple Health, Health Connect.
- Garmin mit echtem Testaccount verifizieren: Login, MFA, Token-Reuse, Initial-Sync, Cron-Sync und nicht verfügbare Endpunkte.
- Garmin-Dateidownloads für FIT/GPX/TCX/CSV an Object Storage anbinden.

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
- Persistente Coach-Chat-Historie mit Supabase RLS umgesetzt.
- Strava OAuth, Synchronisation und providerneutrales Aktivitätsmodell umgesetzt.
- Strava-Zonenimport für persönliche Trainingszonen und Aktivitäts-Zonenverteilungen umgesetzt.
- Experimentelles Garmin-Fundament mit verschlüsselten Sessions, MFA-Flow, Raw Records, Normalisierung und UI umgesetzt.
- Today Nutrition Status mit geloggten Mahlzeiten, Tagesbilanz und Protein-/Carb-Fortschritt umgesetzt.
- Serverroute für AI-/Fallback-Nährwertschätzung und persistente Meal Logs umgesetzt.
- Meal Logs im Fueling-Bereich bearbeitbar und löschbar gemacht.
- Meal-Log-Kategorien und Hauptmahlzeit-Metadaten eingeführt.
- Today Experience mit Tagesfortschritt, Coach-Empfehlungen, Morgenblick und Quick Actions geschärft.
- Bereichskontext für Coach-Aufrufe und sichtbare Empfehlungen auf Hauptseiten ergänzt.
- Today-Empfehlungen dialogfähig mit eigenem Mini-Chat gemacht.
- Context Builder um Page-Context-Gewichtung erweitert.
- Quick-Fueling- und Coach-Übernahmen speichern Kategorie/Hauptmahlzeit konsistent.
- Product-, UX- und Architekturreview dokumentiert.

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

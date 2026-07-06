# Product Review

Datum: 2026-07-06

## Produkturteil

Sports & Fueling Coach hat einen klaren Kern: Der Nutzer soll nicht Daten verwalten, sondern bessere Tagesentscheidungen treffen. Die stärkste Seite ist Today, weil dort Training, Fueling, Energieverbrauch, gegessene Mahlzeiten und Coach-Empfehlungen zusammenkommen.

Die App ist noch keine voll belastbare Beta für eine große Nutzergruppe. Sie ist aber inzwischen deutlich mehr als ein Mockup: Auth, RLS, Strava-Import, Meal Logs, Coach-Historie und serverseitiger AI-Kontext sind echte Produktfundamente.

## Review nach Bereich

### Today

Zweck: tägliche Entscheidungshilfe.

Bewertung: passt am stärksten zur Vision. Today wurde in diesem Sprint vom Dashboard stärker zum Tagescoach geschoben: Briefing, Tagesfortschritt, Aktivitäten, Ernährung, Empfehlungen, Morgenblick und Quick Actions sind klarer sortiert. Die alten doppelten Hinweisbereiche wurden entfernt.

Verbessert:

- Aktivitäten stehen vor Ernährung, weil Training den Tagesbedarf beeinflusst.
- Coach-Empfehlungen sind dialogfähig über „Mit Coach besprechen“.
- Fortschritt zeigt nun kcal, Protein, Carbs, Fett und Wasser transparent.
- Ernährung hat direkte Aktionen für Mahlzeit, Foto und Standard.

Offen:

- Wetter, Schlaf, Krankheit, Alkohol und Regeneration sind noch nicht als echte Datenquellen modelliert.
- Tagesbewertung ist noch nicht live, sollte erst kommen, wenn Ist-Daten verlässlich sind.

### Planning

Zweck: Woche so strukturieren, dass Training, Alltag und Regeneration zusammenpassen.

Bewertung: fachlich sinnvoll, aber noch zu stark formulargetrieben. Der Coach sollte künftig der primäre Planungsdialog sein; die Seite bleibt die Kontroll- und Bearbeitungsfläche.

Offen:

- Planvalidierung für harte Wochen, Reisetage und fehlende Regeneration.
- Vorschlagsmodus für mehrere Varianten mit klarer Empfehlung.

### Training

Zweck: geplante und tatsächliche Belastung verstehen.

Bewertung: gute Basis durch Sportarten, Laufart/Fokus und Strava-Ist-Daten. Noch fehlt die echte Coach-Logik zur Trainingsphase.

Offen:

- Trainingsphase und Wettkampfnähe ableiten.
- Strava-Trends für Pace, Herzfrequenz, Belastung und Umfang auswerten.
- Verletzungen/Krankheit als Kontext erfassen.

### Fueling

Zweck: mehrfach täglich einfach Essen und Trinken erfassen und in Entscheidungen übersetzen.

Bewertung: deutlich besser nach diesem Sprint. Meal Logs sind editierbar, kategorisiert und können als Hauptmahlzeit markiert werden. Quick-Fueling speichert Kategorie/Hauptmahlzeit und kann Chat-Entwürfe direkt als Standard speichern.

Offen:

- Standardmahlzeiten und Rezepte müssen vollständig aus normalisierten Supabase-Tabellen kommen.
- Rezeptverwaltung mit Zutaten, Portionen, KI-Schätzung und manueller Bestätigung fehlt noch.
- Fotoanalyse ist bewusst nur vorbereitet.

### Insights

Zweck: Erkenntnisse statt Statistik.

Bewertung: Plan-vs.-Ist existiert, aber noch nicht genug „Aha“. Insights müssen Muster erkennen und priorisieren.

Offen:

- Wiederkehrende Protein-/Carb-Lücken.
- Fueling vor harten Einheiten.
- Regenerationsqualität nach langen Läufen.
- Gewichtstrend als Zeitreihe.

### Settings

Zweck: Datenbasis für bessere Coach-Empfehlungen.

Bewertung: sinnvoll, aber langfristig zu breit. Settings sollten weniger wie Formularverwaltung wirken und stärker zeigen, welche Angaben den Coach konkret verbessern.

Offen:

- Datenqualitäts-Score.
- Geführte Profilverbesserung.
- Gesundheits-/Familien-/Jobkontext granularer und datenschutzbewusst.

### Coach

Zweck: zentrales Produktinterface.

Bewertung: der richtige strategische Schwerpunkt. Der Coach ist nicht mehr nur Planänderungsassistent, sondern berät, diskutiert und speichert erst nach Bestätigung. Page Context verbessert die Relevanz.

Offen:

- Thread-Auswahl, Archiv, Suche.
- Bessere Memory-Strategie jenseits der letzten Nachrichten.
- Tool-/Action-Schema für Rezepte, Standards, Training und Planung weiter normalisieren.

## Vergleich mit bestehenden Produkten

Garmin Connect ist stärker bei Gerätedaten und Trainingshistorie, aber schwächer bei alltagstauglichem Ernährungscoaching.

Strava ist sozial und aktivitätszentriert, aber kein persönlicher Entscheidungscoach.

TrainingPeaks ist stark für strukturierte Trainingsplanung, aber weniger niedrigschwellig für Alltag, Familie und Fueling.

MyFitnessPal ist stark beim Food-Logging, aber zu trackerlastig und nicht coachig genug.

Athlytic ist stark bei Readiness, aber abhängig von Wearable-Daten und weniger planungsorientiert.

HumanGo ist näher am adaptiven Trainingscoach, aber Fueling und Alltag sind nicht der zentrale Produktanker.

## Vor Beta mit 10.000 ambitionierten Sportlern nötig

- Normalisierte Supabase-Modelle für Standards, Rezepte, Gewicht, Profilevents und Trainingstemplates.
- Automatisierte Tests für Briefing, Coach-Intent, Nutrition-Schätzung und Planänderungen.
- Echte Datenqualität: Strava-Live-Verifikation, Sync-Retry, Fehlerdiagnose und Monitoring.
- Coach-Sicherheit: klare Action-Schemas, Undo, Audit Trail und keine stillen Änderungen.
- Insights mit echten Mustern statt nur Tabellen.
- Mobile UX mit weniger Formularlast und schnelleren täglichen Eingaben.
- Datenschutz-/Export-/Löschkonzept.
- Onboarding, das Profil, Ziel, Wettkampf, Familie, Job und Standards schnell erfasst.

## Produktentscheidung dieses Sprints

Die KI bleibt das Produktzentrum. Today und die anderen Seiten liefern Kontext, Kontrollflächen und schnelle Aktionen. Neue Features werden nur priorisiert, wenn sie Zeit sparen, bessere Entscheidungen ermöglichen oder Motivation steigern.

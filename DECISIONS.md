# Decisions

## ADR-001: V1 bleibt lokaler Demo-Modus

Entscheidung:

V1 nutzt Mock-Daten und keine Auth-/Backend-Integration.

Begründung:

Der kritische Produktnutzen ist das tägliche Briefing. Auth und Datenbank würden zu früh Struktur betonieren, bevor die Domain stabil ist.

## ADR-002: Domain-Logik bleibt React-frei

Entscheidung:

Empfehlungslogik liegt in `src/domain` als pure TypeScript-Funktion.

Begründung:

So bleibt die Logik testbar, wiederverwendbar und später unabhängig von Next.js, Supabase oder OpenAI nutzbar.

## ADR-003: Daily Briefing wird zuerst regelbasiert

Entscheidung:

Sprint 2 nutzt keine KI für Empfehlungen.

Begründung:

Die App braucht zuerst nachvollziehbare Produktregeln. KI kann später Sprache und Erklärung verbessern, soll aber nicht fehlende Fachlogik ersetzen.

## ADR-004: Empfehlungen nutzen Bereiche statt Einzelwerte

Entscheidung:

Kalorien, Protein und Kohlenhydrate werden als Bereiche angezeigt.

Begründung:

Das passt zur Produktvision: kein grammgenauer Tracker, sondern ein coachiger Entscheidungsrahmen.

## ADR-005: Wettkampfziele gehören ins Profil

Entscheidung:

Wettkampfziele werden mit Datum, Distanz, Zielzeit und Priorität modelliert.

Begründung:

Training und Fueling hängen stark davon ab, worauf der Nutzer hinarbeitet.

## ADR-006: `src`-Struktur als Projektstandard

Entscheidung:

Die App nutzt `src/app`, `src/domain`, `src/data`, `src/features`, `src/components` und `src/config`.

Begründung:

Die Trennung verhindert, dass Framework-Routing, UI, Mock-Daten und Domain-Regeln ineinander wachsen.

## ADR-007: Heute zeigt Prioritäten, keine Abhak-Checkliste

Entscheidung:

Die Heute-Seite nutzt passive Coach-Prioritäten statt Checkboxen.

Begründung:

Der Product Owner will keinen weiteren Tracker und keine Aufgabenliste. Die App soll morgens Orientierung geben, nicht Mikro-Verhalten abfragen.

## ADR-008: Planung steuert das Briefing über Tagespläne

Entscheidung:

Die Planung modelliert eine Woche als `WeekPlan` mit `DayPlan` und `DayBlock`. Das Daily Briefing wird aus dem ausgewählten Tagesplan abgeleitet.

Begründung:

So bleibt die Planungslogik fachlich nutzbar und kann später lokal gespeichert oder in Supabase persistiert werden, ohne die Briefing-Regeln neu zu schreiben.

## ADR-009: Lokaler App-State vor Backend

Entscheidung:

Die funktionsfähige Oberfläche nutzt einen React Context mit LocalStorage-Persistenz.

Begründung:

Für die nächste Produktphase ist wichtiger, die Interaktionen und fachlichen Datenflüsse zu testen, als früh Auth, Datenbanktabellen oder Netzwerkverträge festzulegen. Der lokale State bleibt bewusst austauschbar.

## ADR-010: Insights werden aus dem Plan abgeleitet

Entscheidung:

Insights zeigen keine statischen Beispielwerte mehr, sondern leiten Wochenwerte aus Training, Mahlzeiten, Profil und Zielen ab.

Begründung:

Das unterstützt die Produktvision: Daten sollen eingeordnet werden. Auch grobe Werte sind wertvoller, wenn sie aus dem aktuellen Plan stammen.

## ADR-011: Planung ist kein Essens-Wochenplan

Entscheidung:

Die Planung kennt nur Home-Office, Büroarbeit, Reisetag und Training. Mahlzeiten werden dort nicht mehr geplant.

Begründung:

Der Nutzer plant Ernährung nicht sinnvoll für eine ganze Woche vor. Fueling soll fortlaufend aus Coach-Dialog, Tagesbriefing, Training und Alltag angepasst werden. Ein Wochen-Essensplan würde falsche Genauigkeit erzeugen.

## ADR-012: Standards sind lokale Bausteine, keine Backend-Modelle

Entscheidung:

Planungsstandards, Trainingsstandards, Fuelingstandards und Standardwochen werden zunächst im lokalen App-State modelliert.

Begründung:

Der Nutzer braucht wiederverwendbare Muster, bevor Persistenz und Accounts sinnvoll designt werden können. Die Typen sind bewusst domainnah gehalten, damit sie später in Supabase oder eine andere Persistenzschicht verschoben werden können.

## ADR-013: Standardwochen enthalten Fueling nur als Vorschlag

Entscheidung:

Standardwochen dürfen Fueling-Slots enthalten, definieren aber keinen harten Essens-Wochenplan.

Begründung:

Das erfüllt den Wunsch nach kompletten Wochenmustern mit Planung, Training und Fueling, ohne die Product-Owner-Entscheidung gegen starre Wochen-Ernährungsplanung zu verletzen. Der spätere Coach-Chat kann diese Vorschläge fortlaufend anpassen.

## ADR-014: Private Online-V1 nutzt Supabase Auth und RLS

Entscheidung:

Sobald Supabase-Environment-Variablen gesetzt sind, schützt Middleware die App-Routen. Login erfolgt per E-Mail und Passwort. Öffentliche Registrierung wird nicht angeboten.

Begründung:

Die App soll privat erreichbar sein. Ein Login ohne öffentliche Registrierung reduziert unnötige Angriffsfläche und passt zum aktuellen Ein-Nutzer-Ziel.

## ADR-015: Online-Persistenz startet als RLS-geschützter JSONB-State

Entscheidung:

Der komplette `AppState` wird zunächst pro User in `public.app_states.state` gespeichert.

Begründung:

Das bringt die App schnell sicher online, ohne jetzt alle Trainings-, Fueling-, Standard- und Planungsdaten vorschnell in Tabellen zu normalisieren. RLS schützt die Daten pro `auth.uid()`. Später kann das JSONB-Modell schrittweise in fachliche Tabellen migriert werden.

## ADR-016: Online-Nutzer starten im Beta-Zustand statt mit Demo-Daten

Entscheidung:

Sobald Supabase aktiv ist, erzeugt die App für neue Benutzer einen leeren Beta-Zustand mit Basisprofil, aktueller Woche, Planungsstandards und einfachen Fueling-Bausteinen. Die volle Demo-Woche bleibt nur lokaler Fallback ohne Supabase.

Begründung:

Für echte Beta-Tests müssen die sichtbaren Daten vom Nutzer kommen. Demo-Daten sind gut für Produktgefühl und lokale Entwicklung, verfälschen aber Training, Fueling und Coach-Hinweise im privaten Online-Betrieb.

## ADR-017: Coach berät zuerst und schreibt nur strukturierte Änderungen

Entscheidung:

Der Coach nutzt eine serverseitige API-Route und gibt beratende Antworten mit übernehmbaren Vorschlägen zurück. Der Client übernimmt nur erlaubte Change-Typen in den App-State: Tageskontext, Zusatzinfos, Training und grobe Mahlzeiten.

Begründung:

Ein freier Chat ohne kontrollierte Change-Schnittstelle wäre schwer nachvollziehbar und riskant für die Planung. Strukturierte Vorschläge erlauben Beratung wie in einem Coach-Gespräch, aber Änderungen bleiben validierbar, bewusst übernehmbar und später sauber in normalisierte Supabase-Tabellen migrierbar.

## ADR-018: Trainingsarten werden domainnah modelliert

Entscheidung:

Die Trainingsdomäne unterscheidet explizit Laufen, Padel Tennis, Schwimmen, Squash, HIIT, Krafttraining und Radfahren. Laufeinheiten haben zusätzlich Laufart und Fokus.

Begründung:

Fueling, Belastungssteuerung und Coach-Fragen hängen stark davon ab, ob eine Einheit locker, schwellenorientiert, VO2Max-lastig oder spiel-/kraftbasiert ist. Ein einzelnes Feld `sport` reicht dafür nicht mehr.

## ADR-019: AI-Provider werden serverseitig abstrahiert

Entscheidung:

KI-Aufrufe laufen ausschließlich über `src/lib/ai` und werden per `AI_PROVIDER`, `AI_MODEL` und `AI_API_KEY` konfiguriert. OpenAI ist der aktuelle aktive Provider. Groq und OpenRouter sind als providerkompatible Slots vorbereitet. Fehlt die AI-Konfiguration vollständig, nutzt die App den regelbasierten Fallback.

Begründung:

Die App soll fachlich nicht an einen einzelnen KI-Anbieter gekoppelt sein. Eine serverseitige Provider-Schicht hält API-Keys aus dem Client heraus, macht Vercel-Konfiguration explizit und erlaubt später Providerwechsel ohne Änderungen an Planning- oder Coach-UI. Der Key-Name bleibt bewusst generisch, damit ein Providerwechsel keine neue Secret-Nomenklatur im Produkt erzwingt.

## ADR-020: KI-Coach erhält nur gebauten Coach-Kontext

Entscheidung:

Die Coach-API sendet keine Rohdatenbank und keinen vollständigen App-State an den AI-Provider. Stattdessen erstellt `src/domain/coach/context-builder.ts` serverseitig einen strukturierten, relevanten Coach-Kontext. Falls Supabase aktiv ist, lädt die API den gespeicherten App-State serverseitig und nutzt den Client-State nur als Fallback. OpenAI erhält ausschließlich das Ergebnis des Context Builders und keinen Supabase-Zugriff.

Begründung:

Der Coach braucht ausreichend Kontext, aber nicht maximale Rohdaten. Der Builder bündelt Standardkontext wie Profil, Ziele, heutigen Plan, aktuelle Woche, geplante Sporteinheiten, Tages-Fueling, grobe Makro-/Kalorienbilanz, 7-14 Tage Training und Ernährung, Gewichtstrend-Status, Strava-Status und bei Fueling/Alkohol auch den morgigen Plan. Deep Context wie frühere Wochen, Wettkampftrend oder wiederkehrende Muster wird nur bei passenden Anfragen ergänzt. So bleibt die KI hilfreicher, ohne unnötig viele private oder irrelevante Daten an den Provider zu senden.

## ADR-021: Externe Gesundheitsdaten werden providerneutral importiert

Entscheidung:

Strava wird als erster Adapter implementiert, aber nicht als isoliertes Produktmodell. OAuth-Verbindungen liegen in `external_connections`, Secrets und Refresh Tokens in `external_source_tokens`, Aktivitäten in `activities`, optionale Zeitreihen in `activity_streams`, persönliche Zonen in `training_zones`, Aktivitäts-Zonenverteilungen in `activity_zones`, Ausrüstung in `equipment` und Synchronisationsläufe in `sync_jobs`. Die App mappt Strava-Daten beim Import auf ein gemeinsames Aktivitätsmodell mit `source_provider` und `source_activity_id`.

Begründung:

Sports & Fueling Coach soll langfristig eine persönliche Gesundheitsplattform werden. Dafür darf die Fachlogik nicht wissen müssen, ob eine Aktivität von Strava, Garmin, Apple Health, Health Connect, Polar, Coros, Oura oder Withings kommt. Provideradapter sind nur Ingestion-Schichten. Coach, Insights und spätere Trainingsanalysen lesen ausschließlich aus Supabase und arbeiten mit normalisierten Aktivitätsdaten. Trainingszonen sind Teil dieser persönlichen Wissensbasis: erledigte Aktivitäten können über tatsächliche Zeit in HF-/Power-Zonen bewertet werden, geplante Einheiten über persönliche Zielbereiche. Tokens bleiben serverseitig, RLS schützt nutzerbezogene Daten, und die Token-Tabelle ist nicht für normale authentifizierte Clients freigegeben.

## ADR-022: Strava-Synchronisation läuft automatisch nachts

Entscheidung:

Nach dem OAuth-Callback startet die App eine initiale Synchronisation. Weitere Synchronisationen können in den Einstellungen manuell ausgelöst werden. Zusätzlich triggert Vercel Cron auf Hobby `/api/cron/strava-sync` einmal täglich nachts. Die statische Cron-Zeit liegt bei `23:00 UTC`, was in der Sommerzeit 01:00 Uhr Berlin entspricht. Inkrementelle Läufe verwenden die zuletzt gespeicherte Aktivität als Zeitanker und speichern über eindeutige Provider-/Activity-IDs ohne Duplikate. Sync-Läufe schreiben Status, Zähler und Fehlermeldungen nach `sync_jobs`.

Begründung:

Der Coach braucht Strava-Daten zeitnah nach Aktivitäten, aber Vercel Hobby erlaubt keine mehrmals täglichen Cronjobs. Für die Beta ist ein täglicher automatischer Nacht-Sync plus manueller Sofort-Sync deployment-sicher. Häufigere Synchronisationen sollten später über Vercel Pro, einen externen Scheduler oder Strava-Webhooks ergänzt werden.

## ADR-023: Coach Mode ist der Standard

Entscheidung:

Der Coach unterscheidet drei Modi: `coach`, `planning` und `change`. `coach` ist der Default für Beratung, Einschätzung, Varianten, Motivation und Erklärung. `planning` entsteht nur, wenn der Nutzer ausdrücklich einen konkreten Plan oder konkrete Einheiten erstellen will. `change` entsteht erst durch Bestätigung, z. B. per Übernahme-Button oder klare Bestätigungsnachricht.

Begründung:

Der Nutzer soll mit dem Coach frei diskutieren können, ohne Angst vor automatischen Datenänderungen zu haben. Ein persönlicher Trainer berät zuerst, macht dann einen Vorschlag und ändert erst nach Zustimmung den Plan. Deshalb werden Draft-Änderungen nur in Planning-Vorschlägen angezeigt und nicht gespeichert. Die tatsächliche Anwendung passiert ausschließlich clientseitig nach expliziter Bestätigung.

## ADR-024: Geloggtes Fueling wird normalisiert gespeichert

Entscheidung:

Tages-Fueling wird für eingeloggte Nutzer nicht mehr nur aus dem JSONB-App-State abgeleitet. Persistente Meal Logs liegen in `meal_logs`; Standardmahlzeiten, Rezepte, Zutaten und KI-Schätzungen sind als eigene Tabellen `standard_meals`, `recipes`, `recipe_ingredients` und `nutrition_estimates` vorbereitet. Die Heute-Seite liest geloggte Mahlzeiten über `/api/nutrition/logs` und berechnet daraus Tagesbilanz, Protein-/Carb-Rest und Input-vs.-Output.

Begründung:

Fueling ist ein mehrfach täglicher Workflow und braucht andere Datenqualität als grobe Wochenplanung. Geplante Mahlzeiten bleiben als Planungs-/Demo-Konzept erhalten, aber echte gegessene Mahlzeiten müssen redeploy-sicher, RLS-geschützt und später analysierbar sein. KI darf Nährwerte alltagstauglich schätzen, aber die UI kennzeichnet Quelle und Confidence; manuell bestätigte Werte haben Vorrang.

## ADR-025: Coach-Chat speichert Verlauf, aber keine ungefragten Änderungen

Entscheidung:

Coach-Unterhaltungen werden für eingeloggte Nutzer in `coach_chat_messages` gespeichert, aber neue sichtbare Chatfenster starten bewusst leer. Jede geöffnete Unterhaltung bekommt eine eigene Session-ID; beim Seiten- oder Datumswechsel beginnt die UI eine neue Session. Frühere Tagesgespräche bleiben über eine Verlaufsliste am aktiven Tag abrufbar und können dort fortgesetzt werden. Die Coach-API erhält neben dem strukturierten Coach-Kontext nur den Verlauf der aktiv fortgesetzten Session. OpenAI wird ausschließlich serverseitig über `OPENAI_API_KEY` oder `AI_API_KEY` genutzt. Wenn keine AI-Konfiguration vorhanden ist oder der Provider fehlschlägt, antwortet ein transparenter regelbasierter Fallback.

Begründung:

Der Coach soll sich wie ein persönlicher Gesprächspartner anfühlen, aber nicht jedes neue Öffnen mit altem Chatballast starten. Die gespeicherte Historie verbessert Anschlussfähigkeit und Rückfragen, während RLS den Verlauf pro Nutzer schützt. Der Nutzer entscheidet aktiv, ob er eine frühere Anfrage zu einem Tag wieder öffnet und fortsetzt. Planänderungen bleiben trotzdem getrennt: Beratung und Vorschläge dürfen jederzeit entstehen, echte Änderungen passieren erst nach ausdrücklicher Bestätigung im Client.

## ADR-026: Today ist der tägliche Coach, nicht nur ein Dashboard

Entscheidung:

Die Heute-Seite priorisiert Daily Briefing, Tagesziele, Tagesfortschritt, Aktivitäten, gegessene Mahlzeiten, Coach-Empfehlungen, Morgenblick und Quick Actions. Fueling bekommt dort einen direkten Quick-Add-Einstieg.

Begründung:

Der wichtigste Produktmoment ist morgens und im Tagesverlauf die schnelle Orientierung: Was ist geplant, was wurde gegessen, was fehlt noch und was empfiehlt der Coach als nächstes? Die Seite soll Handlungssicherheit geben, ohne zur Checkliste zu werden.

## ADR-027: Meal Logs bekommen Kategorie und Hauptmahlzeit als Metadaten

Entscheidung:

`meal_logs` bleiben die persistente Quelle für gegessene Mahlzeiten. Kategorie (`Frühstück`, `Mittagessen`, `Abendessen`, `Snack`, `Getränk`) und `isMainMeal` werden als Metadaten gespeichert und bei älteren Logs serverseitig aus Uhrzeit und Name abgeleitet.

Begründung:

Diese Informationen verbessern Tagesbilanz, Coach-Kontext und spätere Plan-vs.-Ist-Auswertungen, ohne sofort eine zusätzliche Normalisierungsschicht erzwingen zu müssen.

## ADR-028: Coach-Anfragen erhalten Page Context

Entscheidung:

Coach-Aufrufe können einen `pageContext` wie `today`, `fueling`, `training`, `planning`, `insights`, `settings` oder `coach` senden. Die API nutzt diesen Kontext ausschließlich zur Schwerpunktsetzung der Beratung, nicht als Berechtigung für automatische Änderungen.

Begründung:

Der Coach soll sich in jedem Bereich passend anfühlen: Fueling fragt anders als Training oder Insights. Gleichzeitig bleibt das Grundprinzip erhalten: Im Zweifel Beratung, keine automatische Planänderung.

## ADR-029: KI ist Produktkern, Seiten sind Kontextflächen

Entscheidung:

Die Hauptseiten werden nicht als gleichwertige Feature-Silos weiterentwickelt. Today und Coach sind die primären Erlebnisflächen. Planning, Training, Fueling, Insights und Settings liefern Kontext, Kontrollmöglichkeiten und schnelle Aktionen für bessere Coach-Empfehlungen.

Begründung:

Sports & Fueling Coach soll keine weitere Fitness-App, kein Kalorientracker und kein Trainingsplan-Tool werden. Der zentrale Nutzen ist die tägliche Antwort auf: „Was sollte ich heute tun, um meinem Ziel näherzukommen?“ Features werden daher nur priorisiert, wenn sie Zeit sparen, bessere Entscheidungen ermöglichen oder Motivation steigern.

## ADR-030: Today-Empfehlungen sind dialogfähig

Entscheidung:

Coach-Empfehlungen auf Today sind keine statischen Karten mehr. Jede Empfehlung kann über „Mit Coach besprechen“ in einen eigenen Mini-Chat überführt werden. Der Chat nutzt denselben serverseitigen Coach-Flow, getrennte Thread-IDs und weiterhin explizite Bestätigung vor Änderungen.

Begründung:

Eine Empfehlung ist nur wertvoll, wenn der Nutzer sie an seinen Alltag anpassen kann: vegetarische Alternative, Grillabend, Bier, Rezeptwunsch oder konkretes Protein-Ziel. Der Dialog ist deshalb Teil der Empfehlung, nicht ein separates Feature.

## ADR-031: Coach bewertet Training als Ist plus Zukunft

Entscheidung:

Der Coach-Kontext unterscheidet bei Training strikt zwischen erledigten externen Aktivitäten und geplanten Workouts. Für vergangene und ausgewählte Tage zählen Aktivitäten aus `activities` als Bewertungsbasis. Geplante Workouts dieser Tage bleiben nur Referenz. Für den projizierten Wochenumfang werden erledigte Aktivitäten dieser Woche mit zukünftigen geplanten Workouts kombiniert.

Begründung:

Ein Coach darf nicht so tun, als seien geplante Einheiten automatisch erledigt. Spontane Strava-Aktivitäten müssen dagegen den Wochenumfang, die Belastungsbewertung und die Wettkampfvorbereitung sofort beeinflussen. Das providerneutrale Modell erlaubt dieselbe Logik später auch für Garmin, Apple Health oder andere Quellen.

## ADR-032: Coach-Antworten streamen Text, finalisieren aber strukturiert

Entscheidung:

Die Coach-API unterstützt zusätzlich zu normalen JSON-Antworten einen Streaming-Modus über `/api/coach?stream=1`. Während der OpenAI-kompatible Provider das strukturierte JSON erzeugt, extrahiert der Server nur `assistantMessage` und sendet diesen Text als `delta`-Events an die UI. Am Ende sendet die API das normalisierte finale `CoachPlanResponse`-Objekt.

Begründung:

Der Coach soll sich im Chat schnell und lebendig anfühlen, ohne das Sicherheitsmodell aufzugeben. Live-Text ist reine Darstellung. Outcomes, Suggestions, Changes und Übernahme-Buttons erscheinen erst nach der finalen Validierung und werden weiterhin nicht automatisch gespeichert.

## ADR-033: Garmin Connect ist ein experimenteller inoffizieller Provider

Entscheidung:

Garmin Connect wird hinter `GARMIN_INTEGRATION_ENABLED` als experimenteller Provider angebunden. Die App nutzt eine isolierte Python-Bridge in `scripts/garmin_bridge.py`; nur diese Datei importiert `garminconnect`. Next.js spricht ausschließlich mit dem internen Garmin-Provider. Garmin-Sessiondaten und temporäre MFA-Loginvorgänge werden serverseitig mit AES-256-GCM verschlüsselt gespeichert.

Begründung:

Garmin Connect stellt für diesen Anwendungsfall keine offizielle öffentliche API bereit. Deshalb braucht die Integration eine harte Sicherheitsgrenze: Read-only-Allowlist, Blocklist für schreibende Methoden, keine Credentials im Client, keine Raw Payloads in Logs und keine direkte Coach-Nutzung von Garmin-JSON. Rohdaten werden in `garmin_raw_records` archiviert, Kernsignale normalisiert und der Coach erhält nur serverseitig gebaute Zusammenfassungen. Für stündliche Synchronisation stellt die App `/api/cron/garmin-sync` bereit; auf Vercel Hobby muss dieser Endpoint extern oder mit Vercel Pro stündlich getriggert werden.

### ADR-034: QStash als Garmin-Scheduler und Job-Dispatcher

Der stündliche Garmin-Takt wird von Upstash QStash ausgelöst. Der Scheduler führt keine Provider-Abfragen aus, sondern persistiert und publiziert pro fälliger Verbindung einen signierten Einzeljob. Historische Importe werden in kleine, rückwärts verkettete Datumsfenster zerlegt. Datenbank- und QStash-Deduplication, ein Job-Lease sowie per-Connection Flow Control ermöglichen idempotente Wiederaufnahme ohne lange Vercel Functions. QStash erhält ausschließlich technische IDs; Secrets und Gesundheitsdaten bleiben in Supabase.

### ADR-035: Garmin-Python als separate Vercel Function

Eine Vercel-Node-Function besitzt keinen garantierten `python3`-Prozess. Deshalb ruft der TypeScript-Provider in Vercel die Python-Function `api/garmin_bridge.py` über HTTPS auf. Die Function ist mit einem serverseitigen Shared Secret geschützt, deaktiviert Request-Logging und nutzt `requirements.txt` für `garminconnect`. Lokal bleibt der Prozess-Spawn erhalten. Garmin-Credentials und Sessiondaten verlassen weder den Serververbund noch QStash.

### ADR-036: Garmin ist primäre Aktivitäts- und Gesundheitsquelle

Wenn Garmin und Strava dieselbe reale Aktivität enthalten, wird sie nur einmal gezählt. Startzeit, Sportart, Dauer und Distanz dienen zur Dublettenerkennung. Garmin bleibt der kanonische Datensatz; Strava ergänzt ausschließlich fehlende Felder und gegebenenfalls Zoneninformationen. Diese Regel gilt in UI, Tagesbilanz, Wochenumfang, akuter Belastung und Coach-Kontext. Der Coach erhält zusätzlich normalisierte Garmin-Signale für Schlaf, HRV, Herzfrequenz, Stress, Body Battery, Atmung, SpO2, Intensitätsminuten, Training Readiness, Recovery, Trainingslast/-status und Leistungsmetriken. Fehlende Werte bleiben unbekannt; Entscheidungen berücksichtigen Trends und mehrere übereinstimmende Signale.

### ADR-037: Insights wird zum fokussierten Performance Cockpit

Die Route `/insights` bündelt Recovery, Training, Fueling, Garmin-Marker, Ziele und Coach-Einordnung in einem eigenständigen dunklen Cockpit. `Today` bleibt die operative Tagesseite und wird nicht durch ein Analyse-Dashboard ersetzt. Dashboard-Komponenten lesen ausschließlich einen typisierten `DashboardData`-Vertrag; aktuell liefert `/api/dashboard` klar gekennzeichnete Mockdaten. Später kann die Route serverseitig aggregierte Supabase-Daten liefern, ohne die Visualisierung neu zu strukturieren.

Körper-, Gewichts- und Flüssigkeitsmodule werden trotz ursprünglichem Designbrief nicht aufgenommen, weil diese Bereiche bewusst nicht getrackt werden. Drag-and-drop-Personalisierung und Chart-Export werden erst nach der Echtdatenanbindung bewertet. Framer Motion respektiert reduzierte Bewegung, Recharts übernimmt die zweidimensionalen Visualisierungen und alle Kernaktionen bleiben per Tastatur erreichbar.

### ADR-038: Garmin führt Aktivität und Tagesenergie

Providerübergreifende Aktivitäten mit gleicher normalisierter Sportart und einem Startzeitpunkt innerhalb von zwei Minuten werden als dieselbe reale Einheit behandelt. Garmin bleibt kanonisch, Strava ergänzt fehlende Leistungs- und Zonendaten, aber niemals Garmin-kcal. Dadurch werden Aktivitätsanzahl, Wochenumfang und Belastung nur einmal gezählt.

Für den Tagesverbrauch hat ein normalisierter Garmin-Wert aus `daily_health_summaries.total_calories` Vorrang vor manuellem Forecast, Standardverbrauch und geplantem Aktivitätsverbrauch. Fehlt dieser Wert, gilt weiter die Kette manueller Gesamtforecast, tatsächliche Aktivitäts-kcal, geplante Aktivität, Basisverbrauch. Garmin-Aktivitäten leiten Pace notfalls aus Distanz und Bewegungszeit ab; Trainingslast berücksichtigt insbesondere `activityTrainingLoad`.

### ADR-039: Garmin-Aktivitäten werden mit Einzelzusammenfassungen angereichert

Die Aktivitätsliste bleibt der Einstiegspunkt für Datumsfenster. Pro gefundener Aktivität lädt die isolierte Python-Bridge zusätzlich die Garmin-Aktivitätszusammenfassung über `get_activity`. Detailfehler bleiben auf die einzelne Aktivität begrenzt. `summaryDTO`, verschachtelte Aktivitätsdaten und Listenwerte werden für die providerneutrale Normalisierung zusammengeführt.

Damit stehen insbesondere `activityTrainingLoad`, Durchschnittsgeschwindigkeit, Bewegungsdauer und daraus abgeleitete Durchschnittspace zuverlässiger zur Verfügung. In der UI wird Tagesgesamtverbrauch als führender kcal-Wert angezeigt; Aktivitäts-kcal bleiben separat gekennzeichnet und werden nicht als Tagesverbrauch ausgegeben.

### ADR-040: Produktwirkung hat Vorrang vor wörtlicher Umsetzung

Anforderungen werden als Ausdruck eines Nutzerproblems verstanden und vor der Umsetzung fachlich, gestalterisch und technisch bewertet. Eine wörtliche Umsetzung darf begründet verändert werden, wenn eine andere Lösung verständlicher, fachlich korrekter, ergonomischer oder langfristig wartbarer ist. Der verbindliche Prüfrahmen steht in `PRODUCT_PRINCIPLES.md`.

Das erhöht den Analyseaufwand und kann dazu führen, dass eine gewünschte Lösung nicht exakt in der beschriebenen Form entsteht. Im Gegenzug werden irreführende Kennzahlen, doppelte Informationen, lokale Sonderlösungen und unnötig komplexe Workflows vermieden. Wesentliche Abweichungen werden transparent mit Nutzen und Kompromiss dokumentiert.

### ADR-041: Gemeinsamer Performance-Snapshot für Today, Training und Fueling

Today, Training und Fueling lesen Gesundheits-, Recovery- und Energiedaten über einen gemeinsamen typisierten `DailyPerformanceSnapshot`. Garmin Training Readiness wird als Primärwert genutzt. Fehlt er, entsteht nur dann eine heuristische Einordnung, wenn mindestens zwei unabhängige Signale wie Schlaf, Body Battery, Stress oder HRV vorliegen; andernfalls zeigt die UI ausdrücklich eine unzureichende Datenlage.

Die drei Seiten beantworten unterschiedliche Entscheidungen, teilen aber dieselben Quellen: Today priorisiert Tageszustand und nächste Aktion, Training trennt tatsächliche Leistung von offener Planung und Fueling nutzt dieselbe Tagesverbrauchs- und Makroberechnung wie Today. Wetter, Flüssigkeit, Ballaststoffe, Ernährungsqualität, Verletzungsrisiko und Race-Prognosen werden nicht aus fehlenden Daten erfunden. Sie werden erst prominent, wenn normalisierte Quellen und fachlich belastbare Berechnungen existieren. Das reduziert vorerst den Funktionsumfang, verhindert aber widersprüchliche oder scheinpräzise Empfehlungen.

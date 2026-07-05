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

# UX Review

Datum: 2026-07-06

## UX-Leitlinie

Die App soll sich wie ein persönlicher Coach anfühlen, nicht wie ein Fitness-Dashboard. Der Nutzer soll auf jeder Seite schnell verstehen:

- Was ist die wichtigste Entscheidung?
- Was empfiehlt der Coach?
- Was kann ich mit einem Klick tun?
- Was wird erst nach Bestätigung gespeichert?

## Konsistenzentscheidungen

- Coach-Empfehlungen öffnen ein kleines scrollbares Dialogfenster statt den Seitenkopf aufzublähen.
- Coach Mode bleibt Standard. Empfehlungen sind Beratung; Änderungen passieren erst über explizite Übernahme.
- Fueling-Erfassung nutzt auf Today und Fueling denselben Quick-Fueling-Workflow.
- Meal Logs zeigen Quelle, Kategorie und Hauptmahlzeit konsistent.
- Today vermeidet doppelte Coach-Hinweise. Die Empfehlungsliste ersetzt ältere statische Hinweisbereiche.

## Seitenbewertung

### Today

Stärken:

- Klarster Produktanker.
- Daily Briefing und Quick-Fueling sind sinnvoll kombiniert.
- Empfehlungen sind jetzt dialogfähig.

UX-Risiken:

- Viele Informationen konkurrieren um Aufmerksamkeit.
- Wasser wird transparent als noch nicht geloggter Bereich gezeigt; dafür braucht es später echte Eingabe.
- Fotoanalyse ist sichtbar, aber deaktiviert. Das ist okay als Roadmap-Signal, sollte aber nicht lange so bleiben.

### Fueling

Stärken:

- Standards, Chat-Erfassung, heutige Logs und Historie liegen an einer sinnvollen Stelle.
- Bearbeiten/Löschen reduziert Angst vor schlechten KI-Schätzungen.

UX-Risiken:

- Tagesplan und echte Logs können mental vermischt werden.
- Rezepte sind vorbereitet, aber noch nicht bedienbar.

### Planning und Training

Stärken:

- Kalenderorientierung ist richtig.
- Standards und Plan-vs.-Ist machen wiederkehrende Wochen realistischer.

UX-Risiken:

- Noch zu viele Formulare.
- Coach-Vorschläge sollten stärker als Varianten angezeigt werden.

### Insights

Stärken:

- Plan-vs.-Ist ist ein guter Start.

UX-Risiken:

- Erkenntnisse müssen priorisiert werden, sonst wirkt die Seite wie Statistik.

### Settings

Stärken:

- Profil, Familie, Job und Ziele verbessern Empfehlungen.

UX-Risiken:

- Settings darf nicht zur Datensammelstelle ohne Nutzen werden. Jede Angabe sollte erklären, welche Coach-Empfehlung dadurch besser wird.

## Nächste UX-Prioritäten

1. Tagesbewertung erst einführen, wenn genügend Ist-Daten vorhanden sind.
2. Coach-Vorschläge als Variantenkarten mit Pro/Contra und klarer Empfehlung darstellen.
3. Mobile Quick Actions auf die häufigsten Tagesaktionen reduzieren.
4. Rezept- und Standardverwaltung visuell vereinheitlichen.
5. Profilqualität als Coach-Verbesserung zeigen, nicht als Pflichtformular.

# Produktprinzipien

Sports & Fueling Coach wird als persönlicher Performance-Coach entwickelt, nicht als Sammlung isolierter Tracker und Formulare.

## Ergebnis vor Wortlaut

Anforderungen beschreiben zunächst ein Nutzerproblem oder einen gewünschten Effekt. Sie sind keine unveränderliche technische Spezifikation. Vor einer Umsetzung werden Nutzerwert, fachliche Richtigkeit, Verständlichkeit, Datenqualität, mobile Bedienbarkeit, Wartbarkeit und Auswirkungen auf die gesamte App geprüft.

Wenn eine wörtliche Umsetzung das Produkt verschlechtert, wird sie begründet verändert. Der Kompromiss wird transparent benannt.

## Coach vor Datenmenge

Die App soll Entscheidungen erleichtern. Eine zusätzliche Kennzahl ist nur sinnvoll, wenn der Nutzer versteht:

- was sie bedeutet,
- wie verlässlich sie ist,
- auf welchen Zeitraum sie sich bezieht,
- und welche Handlung daraus folgt.

Rohdaten bleiben verfügbar, aber die primäre Oberfläche priorisiert Einordnung, Trends und konkrete nächste Schritte.

## Fachliche Klarheit

Ähnliche Kennzahlen werden nicht vermischt. Beispiele:

- Tagesgesamtverbrauch und Aktivitäts-kcal sind getrennte Größen.
- Geplantes Training und tatsächlich erledigte Aktivität werden getrennt bewertet.
- Aktueller Tagesstand und Prognose werden eindeutig gekennzeichnet.
- Garmin und Strava werden zu einer realen Aktivität zusammengeführt, ohne Quellenherkunft zu verschleiern.

Schätzungen werden als Schätzungen bezeichnet. Fehlende Daten bleiben unbekannt und werden nicht mit scheinbar exakten Werten kaschiert.

## Ganzheitliche Produktprüfung

Jede Änderung wird mindestens gegen folgende Fragen geprüft:

1. Verbessert sie eine echte Entscheidung oder einen häufigen Workflow?
2. Ist die gewählte Kennzahl fachlich und zeitlich passend?
3. Kann Information reduziert, kombiniert oder besser priorisiert werden?
4. Bleiben Sprache, Navigation, Zeiträume, Zustände und Interaktionen appweit konsistent?
5. Funktioniert die Lösung zuerst auf mobilen Geräten und anschließend auf größeren Viewports?
6. Ist der technische Aufwand im Verhältnis zum Nutzen und zur langfristigen Architektur angemessen?
7. Sind Herkunft, Unsicherheit und Aktualität der Daten nachvollziehbar?

## Premium-Anspruch

Die Oberfläche bleibt ruhig, modern, sportlich und coachig. Dichte Datenansichten werden scanbar strukturiert; operative Seiten priorisieren den aktiven Tag. Wiederverwendbare Komponenten und gemeinsame Domain-Modelle haben Vorrang vor seitenbezogenen Sonderlösungen.

Der Coach berät zuerst. Planung entsteht als Vorschlag. Persistente Änderungen erfolgen erst nach eindeutiger Bestätigung.

## Entscheidungsdokumentation

Wesentliche Abweichungen von bestehenden Anforderungen oder bisherigen Lösungen werden in `DECISIONS.md` festgehalten. Die Notiz nennt:

- die geänderte Entscheidung,
- das Problem der bisherigen Lösung,
- den erwarteten Vorteil,
- und relevante Nachteile oder Kompromisse.

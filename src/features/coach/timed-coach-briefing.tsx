"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, Sparkles } from "lucide-react";
import { Panel, Pill } from "@/components/ui";

type TimedCoachPage = "today" | "training" | "fueling";

type TimedCoachBriefingProps = {
  page: TimedCoachPage;
  selectedDate: string;
  focus?: string;
  plannedWorkoutCount?: number;
  plannedRunningKm?: number;
  actualActivityCount?: number;
  actualRunningKm?: number;
  hardSessionCount?: number;
  mealCount?: number;
  caloriesIntake?: number;
  caloriesTargetMax?: number;
  proteinRemaining?: number;
  carbsRemaining?: number;
};

type CoachSlot = "morning" | "afternoon" | "evening";

export function TimedCoachBriefing(props: TimedCoachBriefingProps) {
  const [now, setNow] = useState(() => new Date());
  const slot = getCoachSlot(now);
  const briefing = useMemo(() => createTimedBriefing(slot, props), [slot, props]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <Panel className="mb-6 border-coach-100 bg-coach-50">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Pill tone="blue">{briefing.label}</Pill>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-coach-700">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              {formatLocalTime(now)}
            </span>
          </div>
          <div className="flex items-start gap-3">
            <Sparkles className="mt-1 h-5 w-5 shrink-0 text-coach-700" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold text-ink">{briefing.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{briefing.summary}</p>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-coach-800">{briefing.recommendation}</p>
            </div>
          </div>
        </div>
        <div className="grid gap-2 text-xs leading-5 text-muted sm:min-w-64">
          {briefing.facts.map((fact) => (
            <div key={fact} className="rounded-xl bg-white px-3 py-2">{fact}</div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function getCoachSlot(now: Date): CoachSlot {
  const hour = Number(new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    hour12: false
  }).format(now));

  if (hour >= 21) return "evening";
  if (hour >= 14) return "afternoon";
  return "morning";
}

function createTimedBriefing(slot: CoachSlot, props: TimedCoachBriefingProps) {
  const labels: Record<CoachSlot, string> = {
    morning: "06:00 Check-in",
    afternoon: "14:00 Kurskorrektur",
    evening: "21:00 Tagesabschluss"
  };
  const baseFacts = [
    `Aktiver Tag: ${formatDate(props.selectedDate)}`,
    props.focus ? `Fokus: ${props.focus}` : null
  ].filter(Boolean) as string[];

  if (props.page === "training") {
    const plannedKm = roundOne(props.plannedRunningKm ?? 0);
    const actualKm = roundOne(props.actualRunningKm ?? 0);
    const facts = [
      ...baseFacts,
      `${props.plannedWorkoutCount ?? 0} geplante Einheiten`,
      `${props.actualActivityCount ?? 0} erledigte Aktivitäten`,
      `${actualKm} km Ist / ${plannedKm} km geplant`
    ];

    if (slot === "morning") {
      return {
        label: labels[slot],
        title: "Trainingsfokus für den Tag",
        summary: `Heute zählt zuerst die Qualität der geplanten Einheit. Der aktuelle Plan enthält ${props.plannedWorkoutCount ?? 0} Einheiten für den aktiven Tag und ${plannedKm} Lauf-km in der Woche.`,
        recommendation: props.plannedWorkoutCount
          ? "Plane die Einheit realistisch um Alltag, Energie und Regeneration herum. Bei harten Läufen lieber sauber vorbereitet starten als halbherzig nachschieben."
          : "Wenn heute kein Training geplant ist, ist Regeneration ein echter Trainingsreiz. Spontane Einheiten nur locker halten.",
        facts
      };
    }

    if (slot === "afternoon") {
      return {
        label: labels[slot],
        title: "Ist vor Plan bewerten",
        summary: `Für die Bewertung zählen erledigte Aktivitäten stärker als der Plan. Bisher sind ${props.actualActivityCount ?? 0} Aktivitäten im aktiven Zeitraum sichtbar.`,
        recommendation: actualKm > 0
          ? "Berücksichtige diese Ist-Belastung für den Rest der Woche. Zusätzliche Qualität nur, wenn Beine und Energie wirklich stabil sind."
          : "Falls du heute noch trainierst: kurz prüfen, ob Schlaf, Essen und Tagesstress zur geplanten Intensität passen.",
        facts
      };
    }

    return {
      label: labels[slot],
      title: "Training sauber abschließen",
      summary: `Der Abend ist für Einordnung wichtiger als neue Härte. Diese Woche stehen ${props.hardSessionCount ?? 0} harte Einheiten im Plan.`,
      recommendation: "Wenn etwas spontan dazugekommen ist, zählt es in den Wochenumfang. Morgen lieber aus der echten Belastung heraus planen, nicht aus dem ursprünglichen Wunschplan.",
      facts
    };
  }

  if (props.page === "fueling") {
    const facts = [
      ...baseFacts,
      `${props.mealCount ?? 0} geloggte Mahlzeiten`,
      `${formatNumber(props.caloriesIntake ?? 0)} kcal aufgenommen`,
      `${formatNumber(props.proteinRemaining ?? 0)} g Protein offen`,
      `${formatNumber(props.carbsRemaining ?? 0)} g Carbs offen`
    ];

    if (slot === "morning") {
      return {
        label: labels[slot],
        title: "Fueling früh ausrichten",
        summary: "Der Morgen setzt den Rahmen: Proteinanker legen, Kohlenhydrate abhängig vom Training dosieren und nicht erst abends alles retten müssen.",
        recommendation: "Starte mit einer einfachen Mahlzeit aus Protein plus gut verträglichen Carbs. Wenn Training ansteht, Carbs nicht zu aggressiv kürzen.",
        facts
      };
    }

    if (slot === "afternoon") {
      return {
        label: labels[slot],
        title: "Tagesbilanz nachjustieren",
        summary: `Bisher sind ${formatNumber(props.caloriesIntake ?? 0)} kcal geloggt. Jetzt ist der beste Zeitpunkt, Protein- und Carb-Lücken noch entspannt zu schließen.`,
        recommendation: (props.proteinRemaining ?? 0) > 25
          ? "Setze als Nächstes auf eine klare Proteinquelle. Danach erst entscheiden, ob noch ein carb-lastiger Snack sinnvoll ist."
          : "Protein sieht halbwegs stabil aus. Halte Carbs passend zur Belastung und iss abends nicht unnötig hektisch.",
        facts
      };
    }

    return {
      label: labels[slot],
      title: "Abendessen mit Zielbezug",
      summary: `Für den Abschluss fehlen grob ${formatNumber(props.proteinRemaining ?? 0)} g Protein und ${formatNumber(props.carbsRemaining ?? 0)} g Kohlenhydrate.`,
      recommendation: "Wähle jetzt alltagstauglich: Protein sichern, Carbs nach Training/Restday dosieren und nicht mehr auf perfekte Zahlen jagen.",
      facts
    };
  }

  const facts = [
    ...baseFacts,
    `${props.plannedWorkoutCount ?? 0} geplante Einheiten`,
    `${formatNumber(props.caloriesIntake ?? 0)} kcal aufgenommen`,
    `${formatNumber(props.proteinRemaining ?? 0)} g Protein offen`,
    `${formatNumber(props.carbsRemaining ?? 0)} g Carbs offen`
  ];

  if (slot === "morning") {
    return {
      label: labels[slot],
      title: "Tagesstrategie setzen",
      summary: "Morgens zählt Orientierung: Was ist geplant, was braucht Energie und wo darf der Tag einfach ruhig bleiben?",
      recommendation: props.plannedWorkoutCount
        ? "Fueling heute nicht zu spät angehen. Protein früh sichern und Carbs rund ums Training bewusst einplanen."
        : "Nutze den ruhigeren Tag für Protein, Gemüse und stabile Energie. Kalorien nicht unnötig hart drücken.",
      facts
    };
  }

  if (slot === "afternoon") {
    return {
      label: labels[slot],
      title: "Mittags realistisch nachsteuern",
      summary: `Der aktuelle Stand: ${formatNumber(props.caloriesIntake ?? 0)} kcal geloggt, ${formatNumber(props.proteinRemaining ?? 0)} g Protein offen.`,
      recommendation: "Jetzt lieber eine kleine, klare Entscheidung treffen als abends improvisieren. Protein und Flüssigkeit zuerst, Carbs nach Belastung.",
      facts
    };
  }

  return {
    label: labels[slot],
    title: "Tag einordnen, nicht optimieren",
    summary: "Abends geht es um einen guten Abschluss und die Vorbereitung auf morgen, nicht um perfekte Makro-Zahlen.",
    recommendation: "Schließe die größte Lücke pragmatisch. Wenn Training erledigt wurde, Regeneration und Schlaf höher gewichten als zusätzliche Kontrolle.",
    facts
  };
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit"
  }).format(new Date(`${value}T12:00:00`));
}

function formatLocalTime(value: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("de-DE");
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

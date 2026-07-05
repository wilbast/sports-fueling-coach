import type { DayBlock, DayPlan, WeekPlan } from "@/domain/planning/types";
import type { IsoDate } from "@/domain/shared";
import type { PlanningContext } from "@/domain/standards/types";

export function createEmptyWeekPlan(referenceDate: IsoDate, options: { label?: string; templateName?: string } = {}): WeekPlan {
  const start = startOfWeek(referenceDate);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    return createEmptyDayPlan(date);
  });

  return {
    id: `week-${start}`,
    label: options.label ?? formatWeekLabel(start),
    startsOn: start,
    templateName: options.templateName ?? "Eigene Woche",
    days
  };
}

export function createEmptyDayPlan(date: IsoDate): DayPlan {
  return {
    date,
    context: ["homeoffice"],
    focus: "Eigener Tag",
    workouts: [],
    mealPlan: [],
    blocks: [createPlanningContextBlock("homeoffice")]
  };
}

export function createPlanningContextBlock(context: PlanningContext): DayBlock {
  const blocks: Record<PlanningContext, Omit<DayBlock, "id">> = {
    homeoffice: {
      type: "work",
      label: "Home-Office",
      impact: "flexibler Tagesrhythmus, Training gut steuerbar"
    },
    office: {
      type: "work",
      label: "Büroarbeit",
      impact: "Training und Verpflegung brauchen mehr Vorplanung"
    },
    free: {
      type: "free",
      label: "Frei",
      impact: "mehr Spielraum, aber Alltag und Erholung bewusst strukturieren"
    },
    vacation: {
      type: "free",
      label: "Urlaub",
      impact: "Training flexibel halten und Fueling pragmatisch an Tagesrhythmus anpassen"
    },
    travel: {
      type: "travel",
      label: "Reisetag",
      impact: "Training und Fueling müssen bewusst einfach bleiben"
    }
  };

  return {
    id: createId(context),
    ...blocks[context]
  };
}

export function startOfWeek(date: IsoDate): IsoDate {
  const current = createDate(date);
  const day = current.getDay();
  const distanceToMonday = day === 0 ? -6 : 1 - day;

  return addDays(current, distanceToMonday);
}

export function addWeeks(date: IsoDate, weeks: number): IsoDate {
  return addDays(date, weeks * 7);
}

export function addDays(date: Date | IsoDate, days: number): IsoDate {
  const nextDate = typeof date === "string" ? createDate(date) : new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return toIsoDate(nextDate);
}

export function toIsoDate(date: Date): IsoDate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}` as IsoDate;
}

export function formatWeekLabel(startsOn: IsoDate): string {
  const endsOn = addDays(startsOn, 6);
  const formatter = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" });

  return `${formatter.format(createDate(startsOn))} - ${formatter.format(createDate(endsOn))}`;
}

function createDate(date: IsoDate): Date {
  return new Date(`${date}T12:00:00`);
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { addWeeks } from "@/domain/planning/calendar";
import type { DayPlan } from "@/domain/planning/types";
import { useAppState } from "@/features/app-state/app-state-provider";

type WeekCalendarProps = {
  className?: string;
  variant?: "full" | "compact";
};

export function WeekCalendar({ className, variant = "full" }: WeekCalendarProps) {
  const { state, setSelectedDate, goToPreviousWeek, goToNextWeek } = useAppState();
  const weekStart = state.weekPlan.startsOn;
  const previousWeekStart = addWeeks(weekStart, -1);
  const nextWeekStart = addWeeks(weekStart, 1);
  const isCompact = variant === "compact";

  return (
    <section className={clsx(
      "mb-6 rounded-2xl border border-line bg-white shadow-soft",
      isCompact ? "p-3" : "p-3 sm:p-4",
      className
    )}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className={clsx(
            "flex shrink-0 items-center justify-center rounded-full bg-coach-50 text-coach-700",
            isCompact ? "h-9 w-9" : "h-10 w-10"
          )}>
            <CalendarDays className={isCompact ? "h-4 w-4" : "h-5 w-5"} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{isCompact ? "Tag auswählen" : state.weekPlan.label}</p>
            <p className="truncate text-xs text-muted">
              {isCompact ? formatSelectedDate(state.selectedDate) : state.weekPlan.templateName}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={goToPreviousWeek}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-muted transition hover:border-coach-200 hover:text-coach-700"
            aria-label={`Zur Woche ab ${formatCompactDate(previousWeekStart)}`}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <input
            type="date"
            value={state.selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="min-h-10 w-[8.75rem] rounded-full border border-line bg-white px-3 text-xs font-semibold text-ink outline-none transition focus:border-coach-400"
            aria-label="Datum auswählen"
          />
          <button
            type="button"
            onClick={() => setSelectedDate(todayIsoDate())}
            className="hidden min-h-10 items-center justify-center rounded-full border border-line bg-white px-3 text-xs font-semibold text-ink transition hover:border-coach-200 hover:text-coach-700 sm:inline-flex"
          >
            Heute
          </button>
          <button
            type="button"
            onClick={goToNextWeek}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-muted transition hover:border-coach-200 hover:text-coach-700"
            aria-label={`Zur Woche ab ${formatCompactDate(nextWeekStart)}`}
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {state.weekPlan.days.map((day) => (
          <DayButton
            key={day.date}
            day={day}
            isSelected={day.date === state.selectedDate}
            isToday={day.date === todayIsoDate()}
            compact={isCompact}
            onSelect={() => setSelectedDate(day.date)}
          />
        ))}
      </div>
    </section>
  );
}

type DayButtonProps = {
  day: DayPlan;
  isSelected: boolean;
  isToday: boolean;
  compact: boolean;
  onSelect: () => void;
};

function DayButton({ day, isSelected, isToday, compact, onSelect }: DayButtonProps) {
  const hasWorkouts = day.workouts.length > 0;
  const hasMeals = day.mealPlan.length > 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        "rounded-xl border px-1.5 py-2 text-left transition sm:px-2",
        compact ? "min-h-[58px] sm:min-h-[64px]" : "min-h-[88px] sm:min-h-[96px]",
        isSelected
          ? "border-coach-300 bg-coach-50 text-coach-800"
          : "border-line bg-canvas text-ink hover:border-coach-200 hover:bg-white"
      )}
    >
      <span className="block text-center text-[11px] font-semibold uppercase text-muted sm:text-xs">
        {formatWeekday(day.date)}
      </span>
      <span className="mt-1 block text-center text-lg font-semibold leading-none">
        {formatDayNumber(day.date)}
      </span>
      {compact ? null : (
        <span className="mt-2 flex justify-center gap-1">
          <span className={clsx("h-1.5 w-1.5 rounded-full", hasWorkouts ? "bg-coach-600" : "bg-line")} />
          <span className={clsx("h-1.5 w-1.5 rounded-full", hasMeals ? "bg-amber-500" : "bg-line")} />
        </span>
      )}
      {isToday && !compact ? (
        <span className="mt-2 block truncate text-center text-[10px] font-semibold text-coach-700">
          heute
        </span>
      ) : null}
    </button>
  );
}

function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatWeekday(date: string): string {
  return new Intl.DateTimeFormat("de-DE", { weekday: "short" })
    .format(new Date(`${date}T12:00:00`))
    .replace(".", "");
}

function formatDayNumber(date: string): string {
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit" }).format(new Date(`${date}T12:00:00`));
}

function formatSelectedDate(date: string): string {
  return new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "2-digit", month: "2-digit" })
    .format(new Date(`${date}T12:00:00`));
}

function formatCompactDate(date: string): string {
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" }).format(new Date(`${date}T12:00:00`));
}

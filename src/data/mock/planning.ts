import type { MealPlanSlot } from "@/domain/nutrition/types";
import type { DayBlock, DayPlan, WeekPlan } from "@/domain/planning/types";
import type { WorkoutPlan } from "@/domain/training/types";

const standardBreakfast: MealPlanSlot = {
  time: "07:30",
  mealTemplateId: "standard-breakfast",
  role: "breakfast"
};

const chickenLunch: MealPlanSlot = {
  time: "12:30",
  mealTemplateId: "chicken-bowl",
  role: "lunch"
};

const preRunSnack: MealPlanSlot = {
  time: "17:10",
  mealTemplateId: "pre-run-snack",
  role: "pre_workout"
};

const recoveryDinner: MealPlanSlot = {
  time: "19:30",
  mealTemplateId: "recovery-dinner",
  role: "dinner"
};

function block(id: string, type: DayBlock["type"], label: string, impact: string): DayBlock {
  return { id, type, label, impact };
}

const mondayWorkouts: WorkoutPlan[] = [
  {
    id: "run-2026-07-06",
    date: "2026-07-06",
    sport: "running",
    title: "10 km locker",
    startTime: "18:00",
    durationMinutes: 60,
    distanceKm: 10,
    status: "planned",
    intensity: "easy",
    runningType: "easy_run",
    runningFocus: "base",
    description: "GA1, 55-65 Minuten, Puls ruhig halten"
  },
  {
    id: "hiit-optional-2026-07-06",
    date: "2026-07-06",
    sport: "hiit",
    title: "HIIT optional",
    durationMinutes: 30,
    status: "optional",
    intensity: "optional",
    description: "Oberkörper kurz, keine harte Beinbelastung"
  }
];

const weekDays: DayPlan[] = [
  {
    date: "2026-07-06",
    context: ["homeoffice"],
    focus: "Lockerer Lauf",
    workouts: mondayWorkouts,
    mealPlan: [standardBreakfast, chickenLunch, preRunSnack, recoveryDinner],
    blocks: [
      block("homeoffice-mo", "work", "Homeoffice", "ruhiger Tagesrhythmus, Mahlzeiten planbar"),
      block("run-mo", "training", "10 km locker", "Kohlenhydrate rund um den Lauf platzieren"),
      block("hiit-mo", "training", "HIIT optional", "nur bei guter Energie")
    ],
    note: "Gewicht reduzieren bleibt aktiv, aber der Lauf soll sich leicht anfühlen."
  },
  {
    date: "2026-07-07",
    context: ["office"],
    focus: "Kraft kurz halten",
    workouts: [
      {
        id: "strength-2026-07-07",
        date: "2026-07-07",
        sport: "strength",
        title: "35 Minuten Kraft",
        startTime: "19:00",
        durationMinutes: 35,
        status: "planned",
        intensity: "moderate",
        description: "Oberkörper und Core, Beine nur leicht"
      }
    ],
    mealPlan: [standardBreakfast, chickenLunch, recoveryDinner],
    blocks: [
      block("office-di", "work", "Bürotag", "Essen vorher entscheiden, weniger spontane Optionen"),
      block("strength-di", "training", "Krafttraining", "Protein bleibt Priorität")
    ],
    note: "Bürotag: einfache Standards schlagen spontane Snacks."
  },
  {
    date: "2026-07-08",
    context: ["homeoffice"],
    focus: "Qualitätseinheit",
    workouts: [
      {
        id: "intervals-2026-07-08",
        date: "2026-07-08",
        sport: "running",
        title: "6 x 800 m Intervalle",
        startTime: "18:30",
        durationMinutes: 65,
        distanceKm: 11,
        status: "planned",
        intensity: "hard",
        runningType: "intervals",
        runningFocus: "vo2max",
        description: "Einlaufen, 6 x 800 m zügig, lange Trabpause, auslaufen"
      }
    ],
    mealPlan: [standardBreakfast, chickenLunch, preRunSnack, recoveryDinner],
    blocks: [
      block("homeoffice-mi", "work", "Homeoffice", "Training gut vorbereitbar"),
      block("intervals-mi", "training", "Intervalltraining", "kein aggressives Defizit vor der Einheit"),
      block("nutrition-mi", "nutrition", "Carbs vorziehen", "Mittagessen und Snack sind entscheidend")
    ],
    note: "Das ist die wichtigste Qualitätseinheit der Woche."
  },
  {
    date: "2026-07-09",
    context: ["restaurant", "family"],
    focus: "Padel und Restaurant",
    workouts: [
      {
        id: "padel-2026-07-09",
        date: "2026-07-09",
        sport: "padel",
        title: "90 Minuten Padel",
        startTime: "19:30",
        durationMinutes: 90,
        status: "planned",
        intensity: "moderate",
        description: "Locker spielen, nicht als harte Laufeinheit werten"
      }
    ],
    mealPlan: [standardBreakfast, chickenLunch],
    blocks: [
      block("family-do", "family", "Familienzeit", "Abendessen flexibel halten"),
      block("padel-do", "training", "Padel", "zusätzlicher Energieverbrauch ohne Lauf-Fokus"),
      block("restaurant-do", "restaurant", "Restaurant", "grob steuern: Proteinquelle zuerst")
    ],
    note: "Restaurant ist kein Ausnahmefehler, sondern Teil des Plans."
  },
  {
    date: "2026-07-10",
    context: ["recovery", "office"],
    focus: "Erholung",
    workouts: [],
    mealPlan: [standardBreakfast, chickenLunch, recoveryDinner],
    blocks: [
      block("office-fr", "work", "Bürotag", "Mahlzeiten simpel halten"),
      block("recovery-fr", "recovery", "Ruhetag", "Defizit möglich, aber Protein stabil")
    ],
    note: "Heute bewusst ruhig bleiben, damit der lange Lauf am Samstag gut wird."
  },
  {
    date: "2026-07-11",
    context: ["homeoffice"],
    focus: "Langer Lauf",
    workouts: [
      {
        id: "long-run-2026-07-11",
        date: "2026-07-11",
        sport: "running",
        title: "17-18 km langer Lauf",
        startTime: "09:30",
        durationMinutes: 105,
        distanceKm: 18,
        status: "planned",
        intensity: "moderate",
        runningType: "easy_run",
        runningFocus: "base",
        description: "Ruhig laufen, Fueling testen, nicht drücken"
      }
    ],
    mealPlan: [standardBreakfast, preRunSnack, recoveryDinner],
    blocks: [
      block("long-run-sa", "training", "Langer Lauf", "höchster Fueling-Fokus der Woche"),
      block("nutrition-sa", "nutrition", "Carb-Fokus", "vorher und nachher bewusst essen")
    ],
    note: "Wettkampfvorbereitung: Fueling im langen Lauf testen."
  },
  {
    date: "2026-07-12",
    context: ["recovery"],
    focus: "Reset und Planung",
    workouts: [
      {
        id: "swim-2026-07-12",
        date: "2026-07-12",
        sport: "swimming",
        title: "30 Minuten Schwimmen locker",
        durationMinutes: 45,
        status: "planned",
        intensity: "easy",
        description: "Locker bewegen, Kopf frei, keine Trainingsambition"
      }
    ],
    mealPlan: [standardBreakfast, chickenLunch, recoveryDinner],
    blocks: [
      block("reset-so", "recovery", "Reset", "Erholung und Schlaf priorisieren"),
      block("planning-so", "planning", "Woche planen", "Standards für die nächste Woche vorbereiten")
    ],
    note: "Der Tag soll die nächste Woche leichter machen."
  }
];

export const demoWeekPlan: WeekPlan = {
  id: "week-2026-07-06",
  label: "Woche 29",
  startsOn: "2026-07-06",
  templateName: "Standardwoche mit Wettkampffokus",
  days: weekDays
};

export const demoTodayPlan = demoWeekPlan.days[0];

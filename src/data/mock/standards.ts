import type { MealPlanSlot } from "@/domain/nutrition/types";
import type {
  AppStandards,
  PlanningExtraInfo,
  PlanningStandard,
  StandardWeekTemplate,
  WorkoutTemplate
} from "@/domain/standards/types";

const breakfast: MealPlanSlot = {
  time: "07:30",
  mealTemplateId: "standard-breakfast",
  role: "breakfast"
};

const lunch: MealPlanSlot = {
  time: "12:30",
  mealTemplateId: "chicken-bowl",
  role: "lunch"
};

const preRun: MealPlanSlot = {
  time: "17:10",
  mealTemplateId: "pre-run-snack",
  role: "pre_workout"
};

const dinner: MealPlanSlot = {
  time: "19:30",
  mealTemplateId: "recovery-dinner",
  role: "dinner"
};

export const demoPlanningExtraInfos: PlanningExtraInfo[] = [
  {
    id: "extra-restaurant",
    label: "Restaurantbesuch",
    impact: "Abendessen grob steuern: Proteinquelle zuerst, Beilage bewusst wählen",
    type: "restaurant",
    context: "restaurant"
  },
  {
    id: "extra-beergarden",
    label: "Biergarten",
    impact: "Getränke und deftiges Essen einplanen, tagsüber Protein und Gemüse einfach halten",
    type: "restaurant",
    context: "restaurant"
  },
  {
    id: "extra-friends",
    label: "Treffen mit Freunden",
    impact: "Abend flexibel halten, Training und Hauptmahlzeit vorher sauber platzieren",
    type: "family",
    context: "family"
  }
];

export const demoPlanningStandards: PlanningStandard[] = [
  {
    id: "planning-homeoffice-training",
    name: "Home-Office mit Training",
    context: "homeoffice",
    extraInfos: [],
    note: "Flexibler Tag, Training gut steuerbar."
  },
  {
    id: "planning-office-prepared",
    name: "Bürotag vorbereitet",
    context: "office",
    extraInfos: [],
    note: "Essen vorher entscheiden, Training realistisch platzieren."
  },
  {
    id: "planning-office-restaurant",
    name: "Büro + Restaurant",
    context: "office",
    extraInfos: [demoPlanningExtraInfos[0]],
    note: "Tagsüber einfach und proteinreich bleiben."
  },
  {
    id: "planning-travel-simple",
    name: "Reisetag simpel",
    context: "travel",
    extraInfos: [],
    note: "Training optional halten, Fueling nicht verkomplizieren."
  }
];

export const demoWorkoutTemplates: WorkoutTemplate[] = [
  {
    id: "workout-easy-run-8",
    name: "Lockerer Lauf 8 km",
    sport: "running",
    title: "8 km locker",
    startTime: "18:00",
    durationMinutes: 50,
    distanceKm: 8,
    intensity: "easy",
    runningType: "easy_run",
    runningFocus: "base",
    description: "GA1, ruhig bleiben, danach Protein und Kohlenhydrate sichern"
  },
  {
    id: "workout-long-run",
    name: "Langer Lauf",
    sport: "running",
    title: "17-18 km langer Lauf",
    startTime: "09:30",
    durationMinutes: 105,
    distanceKm: 18,
    intensity: "moderate",
    runningType: "easy_run",
    runningFocus: "base",
    description: "Ruhig laufen, Fueling testen, nicht drücken"
  },
  {
    id: "workout-strength-short",
    name: "Kraft kurz",
    sport: "strength",
    title: "35 Minuten Kraft",
    startTime: "19:00",
    durationMinutes: 35,
    intensity: "moderate",
    description: "Oberkörper und Core, Beine nur leicht"
  },
  {
    id: "workout-padel",
    name: "Padel",
    sport: "padel",
    title: "90 Minuten Padel",
    startTime: "19:30",
    durationMinutes: 90,
    intensity: "moderate",
    description: "Spielbelastung mit Flüssigkeit und Abendessen mitdenken"
  }
];

export const demoWeekTemplates: StandardWeekTemplate[] = [
  {
    id: "week-standard-race-build",
    name: "Wettkampfaufbau ruhig",
    description: "Lauf, Kraft, Padel und grobe Fueling-Standards für eine kontrollierte Woche.",
    days: [
      {
        label: "Mo",
        context: "homeoffice",
        extraInfos: [],
        workouts: [demoWorkoutTemplates[0]],
        mealPlan: [breakfast, lunch, preRun, dinner],
        note: "Lockerer Start mit sauberem Lauf-Fueling."
      },
      {
        label: "Di",
        context: "office",
        extraInfos: [],
        workouts: [demoWorkoutTemplates[2]],
        mealPlan: [breakfast, lunch, dinner],
        note: "Bürotag, Kraft kurz halten."
      },
      {
        label: "Mi",
        context: "homeoffice",
        extraInfos: [],
        workouts: [
          {
            id: "workout-intervals-6x800",
            name: "Intervalle 6 x 800",
            sport: "running",
            title: "6 x 800 m Intervalle",
            startTime: "18:30",
            durationMinutes: 65,
            distanceKm: 11,
            intensity: "hard",
            runningType: "intervals",
            runningFocus: "vo2max",
            description: "Einlaufen, 6 x 800 m zügig, lange Trabpause, auslaufen"
          }
        ],
        mealPlan: [breakfast, lunch, preRun, dinner],
        note: "Qualitätseinheit, kein aggressives Defizit."
      },
      {
        label: "Do",
        context: "office",
        extraInfos: [demoPlanningExtraInfos[0]],
        workouts: [demoWorkoutTemplates[3]],
        mealPlan: [breakfast, lunch],
        note: "Restaurant ist eingeplant, nicht spontan eskalieren lassen."
      },
      {
        label: "Fr",
        context: "office",
        extraInfos: [],
        workouts: [],
        mealPlan: [breakfast, lunch, dinner],
        note: "Ruhetag vor dem langen Lauf."
      },
      {
        label: "Sa",
        context: "homeoffice",
        extraInfos: [],
        workouts: [demoWorkoutTemplates[1]],
        mealPlan: [breakfast, preRun, dinner],
        note: "Fueling im langen Lauf testen."
      },
      {
        label: "So",
        context: "homeoffice",
        extraInfos: [],
        workouts: [
          {
            id: "workout-swim-reset",
            name: "Schwimmen locker",
            sport: "swimming",
            title: "30 Minuten Schwimmen locker",
            durationMinutes: 30,
            intensity: "easy",
            description: "Locker bewegen, Kopf frei, keine Trainingsambition"
          }
        ],
        mealPlan: [breakfast, lunch, dinner],
        note: "Reset und nächste Woche vorbereiten."
      }
    ]
  }
];

export const demoStandards: AppStandards = {
  planning: demoPlanningStandards,
  workouts: demoWorkoutTemplates,
  weeks: demoWeekTemplates
};

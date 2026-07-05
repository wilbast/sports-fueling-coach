import type { WorkoutPlan } from "@/domain/training/types";

export const demoTodayWorkouts: WorkoutPlan[] = [
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
    description: "GA1, 55-65 Minuten, Puls ruhig halten"
  },
  {
    id: "freeletics-optional-2026-07-06",
    date: "2026-07-06",
    sport: "freeletics",
    title: "Freeletics optional",
    durationMinutes: 30,
    status: "optional",
    intensity: "optional",
    description: "Oberkörper kurz, keine harte Beinbelastung"
  }
];

export const trainingItems = [
  {
    sport: "Laufen",
    title: "10 km GA1",
    status: "Geplant",
    detail: "Montag, 18:00 · locker"
  },
  {
    sport: "Krafttraining",
    title: "Freeletics Oberkörper",
    status: "Optional",
    detail: "Dienstag oder Montag kurz"
  },
  {
    sport: "Laufen",
    title: "6 x 800 m Intervalle",
    status: "Geplant",
    detail: "Mittwoch · Qualitätseinheit"
  },
  {
    sport: "Padel",
    title: "90 Minuten Padel",
    status: "Geplant",
    detail: "Donnerstag · locker"
  },
  {
    sport: "Laufen",
    title: "17-18 km langer Lauf",
    status: "Geplant",
    detail: "Samstag · Fueling testen"
  }
];

import type { DashboardData, DashboardRange } from "@/domain/dashboard/types";

const labels = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function createMockDashboard(range: DashboardRange): DashboardData {
  const rangeFactor = range === "today" ? 0.96 : range === "7d" ? 1 : range === "30d" ? 1.03 : range === "90d" ? 1.06 : 1.08;
  const today = new Date();

  return {
    generatedAt: new Date().toISOString(),
    source: "mock",
    range,
    hero: {
      greeting: greetingForHour(today.getHours()),
      status: "Du bist gut erholt und bereit für eine kontrollierte Ausdauereinheit.",
      recoveryScore: 84,
      readiness: 78,
      calorieCurrent: 1840,
      calorieTarget: 2900,
      proteinCurrent: 102,
      proteinTarget: 145,
      recommendedTraining: "8 km GA1 · 5:20–5:35/km"
    },
    scores: [
      { id: "recovery", label: "Recovery", score: 84, change: 6, tone: "green", trend: [72, 75, 69, 78, 80, 81, 84], href: "/garmin" },
      { id: "fitness", label: "Fitness", score: 76, change: 3, tone: "blue", trend: [67, 68, 70, 72, 71, 74, 76], href: "/training" },
      { id: "fueling", label: "Fueling", score: 71, change: -4, tone: "amber", trend: [80, 77, 75, 73, 76, 74, 71], href: "/fueling" },
      { id: "consistency", label: "Konstanz", score: 88, change: 8, tone: "cyan", trend: [70, 74, 76, 78, 82, 85, 88], href: "/insights" }
    ],
    coach: {
      title: "Heute locker Qualität sammeln",
      message: "Deine akute Belastung ist leicht erhöht. HRV und Schlaf bleiben stabil, deshalb passt heute ein lockerer Lauf ohne Tempodruck.",
      reasons: ["7:42 h Schlaf bei Score 86", "HRV stabil über der 7-Tage-Basis", "39 km projizierter Wochenumfang bleibt im Zielkorridor"],
      trainingAction: "8 km GA1 · Puls überwiegend Zone 2",
      fuelingAction: "Noch etwa 43 g Protein und 120 g Kohlenhydrate"
    },
    health: labels.map((label, index) => ({
      label,
      recovery: [72, 75, 69, 78, 80, 81, 84][index],
      bodyBattery: [61, 68, 54, 72, 76, 79, 82][index],
      readiness: [70, 73, 65, 74, 77, 79, 78][index],
      sleepHours: [7.1, 7.6, 6.8, 7.9, 7.4, 8.1, 7.7][index],
      sleepScore: [79, 83, 74, 88, 82, 90, 86][index],
      hrv: [49, 51, 47, 52, 53, 54, 55][index],
      restingHr: [52, 51, 54, 51, 50, 49, 50][index]
    })),
    stressByHour: [12, 9, 8, 7, 8, 12, 21, 34, 48, 52, 46, 43, 56, 58, 47, 39, 42, 51, 44, 31, 24, 20, 16, 13],
    training: labels.map((label, index) => ({
      label,
      acuteLoad: Math.round([38, 52, 48, 61, 58, 70, 66][index] * rangeFactor),
      chronicLoad: Math.round([44, 45, 46, 47, 48, 49, 50][index] * rangeFactor),
      distanceKm: [0, 9, 0, 10, 0, 18, 2][index]
    })),
    trainingMix: [
      { name: "Easy", value: 42, color: "#22C55E" },
      { name: "Long Run", value: 25, color: "#2563EB" },
      { name: "Tempo", value: 13, color: "#F59E0B" },
      { name: "Intervalle", value: 8, color: "#EF4444" },
      { name: "Kraft", value: 12, color: "#22D3EE" }
    ],
    pace: labels.map((label, index) => ({ label, easy: [342, 339, 341, 337, 335, 334, 332][index], tenK: [281, 279, 278, 276, 274, 273, 271][index], halfMarathon: [298, 296, 295, 293, 291, 290, 288][index] })),
    nutrition: labels.map((label, index) => ({
      label,
      eatenKcal: [2480, 2760, 2310, 2890, 2620, 3040, 1840][index],
      burnedKcal: [2550, 3180, 2470, 3260, 2580, 3610, 2900][index],
      protein: [138, 151, 132, 148, 142, 158, 102][index],
      carbs: [260, 338, 225, 356, 287, 402, 211][index],
      fat: [78, 81, 72, 84, 76, 89, 61][index]
    })),
    garmin: [
      { label: "VO₂max", value: "52", change: 2, tone: "blue", trend: [49, 49, 50, 50, 51, 51, 52] },
      { label: "Body Battery", value: "82", change: 7, tone: "green", trend: [61, 68, 54, 72, 76, 79, 82] },
      { label: "Trainingsstatus", value: "Produktiv", change: 4, tone: "green", trend: [68, 70, 71, 73, 74, 76, 78] },
      { label: "Recovery Time", value: "18 h", change: -5, tone: "cyan", trend: [34, 31, 28, 26, 24, 21, 18] }
    ],
    goals: [
      { label: "Wochenkilometer", value: "29 / 39 km", progress: 74, tone: "blue", href: "/training" },
      { label: "Protein", value: "102 / 145 g", progress: 70, tone: "amber", href: "/fueling" },
      { label: "Workouts", value: "4 / 5", progress: 80, tone: "green", href: "/training" },
      { label: "Wettkampfblock", value: "Woche 6 / 10", progress: 60, tone: "cyan", href: "/planning" }
    ],
    calendar: Array.from({ length: 35 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - 34 + index);
      const load = [0, 22, 0, 46, 18, 72, 0, 28, 35, 0, 58, 0, 81, 12][index % 14];
      return { date: date.toISOString().slice(0, 10), load, intensity: load === 0 ? "rest" : load < 30 ? "easy" : load < 60 ? "moderate" : "hard" };
    })
  };
}

function greetingForHour(hour: number) {
  if (hour < 11) return "Guten Morgen";
  if (hour < 18) return "Guten Tag";
  return "Guten Abend";
}

import type { DailyPerformanceSnapshot, PerformanceTrendPoint } from "@/domain/performance/types";
import type { ExternalActivitySummary } from "@/features/activities/external-activities";
import type { WorkoutPlan } from "@/domain/training/types";

export type ReadinessAssessment = {
  score?: number;
  label: string;
  confidence: "high" | "medium" | "low";
  tone: "green" | "amber" | "red" | "neutral";
  recommendation: string;
  reasons: string[];
};

export function assessReadiness(
  snapshot: DailyPerformanceSnapshot | undefined,
  recentActivities: ExternalActivitySummary[],
  plannedWorkouts: WorkoutPlan[]
): ReadinessAssessment {
  const explicit = validScore(snapshot?.recovery.readiness);
  const sleepScore = validScore(snapshot?.sleep.score);
  const bodyBattery = validScore(snapshot?.vitals.bodyBatteryEnd ?? snapshot?.vitals.bodyBatteryStart);
  const stress = validScore(snapshot?.vitals.averageStress);
  const hrvBalanced = isBalancedHrv(snapshot);
  const anchorDate = snapshot?.date ?? new Date().toISOString().slice(0, 10);
  const loadLastThreeDays = recentActivities
    .filter((activity) => daysFromAnchor(activity.startDateLocal ?? activity.startDate, anchorDate) <= 3)
    .reduce((sum, activity) => sum + (activity.trainingLoad ?? activity.relativeEffort ?? 0), 0);

  const heuristicValues = [sleepScore, bodyBattery].filter((value): value is number => value != null);
  if (stress != null) heuristicValues.push(Math.max(0, 100 - stress));
  if (hrvBalanced != null) heuristicValues.push(hrvBalanced ? 75 : 40);
  const score = explicit ?? (heuristicValues.length >= 2
    ? clamp(Math.round(heuristicValues.reduce((sum, value) => sum + value, 0) / heuristicValues.length - loadPenalty(loadLastThreeDays)), 0, 100)
    : undefined);
  const hardPlanned = plannedWorkouts.some((workout) => workout.intensity === "hard" || workout.runningFocus === "threshold" || workout.runningFocus === "vo2max");
  const tone = score == null ? "neutral" : score >= 70 ? "green" : score >= 45 ? "amber" : "red";
  const reasons = [
    sleepScore != null ? `Schlafscore ${Math.round(sleepScore)}` : null,
    snapshot?.sleep.durationSeconds ? `${formatHours(snapshot.sleep.durationSeconds)} Schlaf` : null,
    snapshot?.vitals.hrvNightlyAverage ? `HRV ${Math.round(snapshot.vitals.hrvNightlyAverage)} ms${hrvBalanced === false ? " unter Baseline" : ""}` : null,
    snapshot?.vitals.restingHeartRate ? `Ruhepuls ${Math.round(snapshot.vitals.restingHeartRate)} bpm` : null,
    loadLastThreeDays > 0 ? `${Math.round(loadLastThreeDays)} Belastungspunkte in 3 Tagen` : null
  ].filter((value): value is string => Boolean(value));

  if (score == null) {
    return {
      label: "Noch nicht belastbar bewertet",
      confidence: "low",
      tone,
      recommendation: hardPlanned
        ? "Für die harte Einheit fehlen noch belastbare Recovery-Daten. Schlaf, Beine und Tagesstress kurz subjektiv prüfen."
        : "Die Planung kann bestehen bleiben; Intensität heute nach Körpergefühl steuern.",
      reasons: reasons.length ? reasons : ["Keine aktuellen Recovery-Daten verfügbar"]
    };
  }

  const recommendation = tone === "green"
    ? hardPlanned ? "Die Ausgangslage unterstützt die geplante Qualitätseinheit. Normal fuelen und sauber aufwärmen." : "Normal trainieren. Zusätzliche Intensität ist trotzdem nicht nötig."
    : tone === "amber"
      ? hardPlanned ? "Einheit möglich, aber Umfang oder Wiederholungen flexibel halten. Bei schwerem Gefühl auf locker umstellen." : "Locker trainieren und Regeneration heute höher gewichten."
      : "Keine harte Qualität erzwingen. Erholung oder sehr lockere Bewegung ist heute die bessere Investition.";

  return {
    score,
    label: tone === "green" ? "Gute Ausgangslage" : tone === "amber" ? "Belastung bewusst steuern" : "Regeneration priorisieren",
    confidence: explicit != null ? "high" : heuristicValues.length >= 3 ? "medium" : "low",
    tone,
    recommendation,
    reasons
  };
}

export function createTrainingTrend(activities: ExternalActivitySummary[], dates: string[]): PerformanceTrendPoint[] {
  return dates.map((date) => {
    const dayActivities = activities.filter((activity) => activityDate(activity) === date);
    const running = dayActivities.filter(isRunning);
    const paces = running.map((activity) => activity.averagePaceSecondsPerKm).filter(validPositive);
    const heartRates = running.map((activity) => activity.averageHeartrate).filter(validPositive);
    return {
      date,
      runningKm: roundOne(running.reduce((sum, activity) => sum + (activity.distanceMeters ?? 0) / 1000, 0)),
      durationMinutes: Math.round(dayActivities.reduce((sum, activity) => sum + (activity.movingTimeSeconds ?? activity.elapsedTimeSeconds ?? 0) / 60, 0)),
      trainingLoad: Math.round(dayActivities.reduce((sum, activity) => sum + (activity.trainingLoad ?? activity.relativeEffort ?? 0), 0)),
      averagePaceSecondsPerKm: average(paces),
      averageHeartRate: average(heartRates)
    };
  });
}

export function trainingConsistency(points: PerformanceTrendPoint[]): number {
  const activeDays = points.filter((point) => point.durationMinutes > 0).length;
  return points.length ? Math.round(activeDays / points.length * 100) : 0;
}

function isBalancedHrv(snapshot?: DailyPerformanceSnapshot): boolean | null {
  const current = snapshot?.vitals.hrvNightlyAverage;
  const low = snapshot?.vitals.hrvBaselineLow;
  const high = snapshot?.vitals.hrvBaselineHigh;
  if (validPositive(current) && validPositive(low) && validPositive(high)) return current >= low && current <= high;
  const status = snapshot?.vitals.hrvStatus?.toLowerCase();
  if (!status) return null;
  if (status.includes("balanced") || status.includes("ausgeglichen")) return true;
  if (status.includes("low") || status.includes("unbalanced") || status.includes("niedrig")) return false;
  return null;
}

function loadPenalty(load: number): number {
  if (load >= 350) return 20;
  if (load >= 220) return 12;
  if (load >= 120) return 6;
  return 0;
}

function activityDate(activity: ExternalActivitySummary): string {
  return (activity.startDateLocal ?? activity.startDate).slice(0, 10);
}

function daysFromAnchor(value: string, anchorDate: string): number {
  const difference = new Date(`${anchorDate}T23:59:59`).getTime() - new Date(value).getTime();
  return difference >= 0 ? Math.floor(difference / 86_400_000) : Number.POSITIVE_INFINITY;
}

function isRunning(activity: ExternalActivitySummary): boolean {
  const sport = activity.sportType.toLowerCase();
  return sport.includes("run") || sport.includes("lauf");
}

function validScore(value: number | null | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100 ? value : undefined;
}

function validPositive(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function average(values: number[]): number | null {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10 : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatHours(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}:${String(minutes).padStart(2, "0")} h`;
}

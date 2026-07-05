import type { RunningFocus, RunningWorkoutType, SportType, WorkoutIntensity } from "@/domain/training/types";

export const sportLabels: Record<SportType, string> = {
  running: "Laufen",
  padel: "Padel Tennis",
  swimming: "Schwimmen",
  squash: "Squash",
  hiit: "HIIT",
  strength: "Krafttraining",
  cycling: "Radfahren"
};

export const runningTypeLabels: Record<RunningWorkoutType, string> = {
  easy_run: "Lockerer Lauf",
  tempo_run: "Tempodauerlauf",
  fartlek: "Fahrtspiel",
  intervals: "Intervalltraining"
};

export const runningFocusLabels: Record<RunningFocus, string> = {
  base: "Basis",
  recovery: "Regeneration",
  threshold: "Schwellentraining",
  vo2max: "VO2Max"
};

export const intensityLabels: Record<WorkoutIntensity, string> = {
  easy: "locker",
  moderate: "mittel",
  hard: "hart",
  optional: "optional"
};

export const sportOptions = Object.entries(sportLabels).map(([value, label]) => ({
  value: value as SportType,
  label
}));

export const runningTypeOptions = Object.entries(runningTypeLabels).map(([value, label]) => ({
  value: value as RunningWorkoutType,
  label
}));

export const runningFocusOptions = Object.entries(runningFocusLabels).map(([value, label]) => ({
  value: value as RunningFocus,
  label
}));

export const intensityOptions = Object.entries(intensityLabels).map(([value, label]) => ({
  value: value as WorkoutIntensity,
  label
}));

export function describeWorkoutType(workout: {
  sport: SportType;
  runningType?: RunningWorkoutType;
  runningFocus?: RunningFocus;
}): string {
  if (workout.sport !== "running") return sportLabels[workout.sport] ?? "Training";

  const type = workout.runningType ? runningTypeLabels[workout.runningType] : sportLabels.running;
  const focus = workout.runningFocus ? runningFocusLabels[workout.runningFocus] : undefined;

  return focus ? `${type} · ${focus}` : type;
}

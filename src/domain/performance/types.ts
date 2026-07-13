export type DailyPerformanceSnapshot = {
  date: string;
  source: "garmin" | "fallback";
  updatedAt?: string | null;
  energy: {
    totalCalories?: number | null;
    activeCalories?: number | null;
    restingCalories?: number | null;
  };
  movement: {
    steps?: number | null;
    distanceMeters?: number | null;
    moderateIntensityMinutes?: number | null;
    vigorousIntensityMinutes?: number | null;
  };
  recovery: {
    readiness?: number | null;
    recoveryTimeSeconds?: number | null;
    trainingStatus?: string | null;
    acuteLoad?: number | null;
    loadRatio?: number | null;
    vo2maxRunning?: number | null;
    lactateThresholdHeartRate?: number | null;
    lactateThresholdPace?: string | null;
    racePredictions?: Record<string, unknown> | null;
  };
  sleep: {
    durationSeconds?: number | null;
    score?: number | null;
    averageHrv?: number | null;
    averageStress?: number | null;
  };
  vitals: {
    restingHeartRate?: number | null;
    averageStress?: number | null;
    maxStress?: number | null;
    bodyBatteryStart?: number | null;
    bodyBatteryEnd?: number | null;
    bodyBatteryHigh?: number | null;
    bodyBatteryLow?: number | null;
    hrvNightlyAverage?: number | null;
    hrvWeeklyAverage?: number | null;
    hrvBaselineLow?: number | null;
    hrvBaselineHigh?: number | null;
    hrvStatus?: string | null;
  };
};

export type PerformanceTrendPoint = {
  date: string;
  runningKm: number;
  durationMinutes: number;
  trainingLoad: number;
  averagePaceSecondsPerKm?: number | null;
  averageHeartRate?: number | null;
};

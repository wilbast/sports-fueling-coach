"use client";

import { useState } from "react";
import { BriefcaseBusiness, Flame, RotateCcw, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { PageHeader, Panel, Pill } from "@/components/ui";
import type { PerformanceStrategy, RaceGoal, WeightStrategy } from "@/domain/goals/types";
import type { FamilyProfile, JobProfile } from "@/domain/profile/types";
import { useAppState } from "@/features/app-state/app-state-provider";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { StravaIntegrationPanel } from "@/features/integrations/strava-integration-panel";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export function SettingsView() {
  const {
    state,
    setSelectedDate,
    updateProfile,
    updateGoals,
    updateRaceGoal,
    updateBaselineCaloriesWithoutActivity,
    updateManualActivityForecastCalories,
    saveStateNow,
    resetDemoState,
    resetBetaState
  } = useAppState();
  const profile = state.profile;
  const goals = state.goals;
  const energySettings = state.energySettings;
  const selectedForecastCalories = energySettings.manualActivityForecastCaloriesByDate[state.selectedDate];
  const raceGoal = profile.raceGoal ?? createFallbackRaceGoal();
  const family = profile.family ?? createFallbackFamilyProfile();
  const job = profile.job ?? createFallbackJobProfile();
  const onlineMode = isSupabaseConfigured();
  const [saveLabel, setSaveLabel] = useState("Speichern");

  async function saveSettings() {
    setSaveLabel("Speichert...");
    await saveStateNow();
    setSaveLabel("Gespeichert");
    window.setTimeout(() => setSaveLabel("Speichern"), 1800);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Einstellungen"
        title="Profil, Ziele und Daten"
        description="Stammdaten steuern die Coach-Empfehlungen."
        action={
          <button
            type="button"
            onClick={saveSettings}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-coach-600 px-4 text-sm font-semibold text-white transition hover:bg-coach-500"
          >
            {saveLabel}
          </button>
        }
      />

      <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <div className="grid gap-6">
          <Panel>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-coach-50 text-coach-700">
                <UserRound className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-ink">Profil</h2>
                <p className="mt-1 text-sm text-muted">{profile.primarySports.join(", ")}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Vorname
                <input
                  value={profile.firstName}
                  onChange={(event) => updateProfile({ ...profile, firstName: event.target.value })}
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-coach-400"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Coaching-Stil
                <select
                  value={profile.coachingStyle}
                  onChange={(event) => updateProfile({ ...profile, coachingStyle: event.target.value as "active" | "reserved" })}
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-coach-400"
                >
                  <option value="active">aktiv</option>
                  <option value="reserved">zurückhaltend</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Gewicht
                <input
                  value={profile.bodyMetrics.weightKg}
                  onChange={(event) => updateProfile({
                    ...profile,
                    bodyMetrics: {
                      ...profile.bodyMetrics,
                      weightKg: parseNumber(event.target.value, profile.bodyMetrics.weightKg)
                    }
                  })}
                  inputMode="decimal"
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-coach-400"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Zielgewicht
                <input
                  value={profile.bodyMetrics.targetWeightKg ?? ""}
                  onChange={(event) => updateProfile({
                    ...profile,
                    bodyMetrics: {
                      ...profile.bodyMetrics,
                      targetWeightKg: parseNumber(event.target.value, profile.bodyMetrics.targetWeightKg ?? profile.bodyMetrics.weightKg)
                    }
                  })}
                  inputMode="decimal"
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-coach-400"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={saveSettings}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-coach-100 hover:text-coach-700"
            >
              Profil speichern
            </button>
          </Panel>

          <Panel>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-coach-50 text-coach-700">
                <UsersRound className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-ink">Familie</h2>
                <p className="mt-1 text-sm text-muted">Wichtig für Zeitfenster, Erholung und realistische Empfehlungen.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Familiensituation
                <select
                  value={family.situation}
                  onChange={(event) => updateProfile({ ...profile, family: { ...family, situation: event.target.value as FamilyProfile["situation"] } })}
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-coach-400"
                >
                  <option value="single">allein lebend</option>
                  <option value="partner">Partnerschaft</option>
                  <option value="with_children">mit Kindern</option>
                  <option value="single_parent">alleinerziehend</option>
                  <option value="shared_parenting">Wechselmodell / geteilte Betreuung</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Kinder
                <input
                  value={family.childrenCount}
                  onChange={(event) => updateProfile({
                    ...profile,
                    family: { ...family, childrenCount: parseNumber(event.target.value, family.childrenCount) }
                  })}
                  inputMode="numeric"
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-coach-400"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Betreuungsaufwand
                <select
                  value={family.careResponsibility}
                  onChange={(event) => updateProfile({ ...profile, family: { ...family, careResponsibility: event.target.value as FamilyProfile["careResponsibility"] } })}
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-coach-400"
                >
                  <option value="low">niedrig</option>
                  <option value="medium">mittel</option>
                  <option value="high">hoch</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-ink sm:col-span-2">
                Familiennotiz
                <input
                  value={family.notes ?? ""}
                  onChange={(event) => updateProfile({ ...profile, family: { ...family, notes: event.target.value } })}
                  placeholder="z. B. Abends oft Familienzeit, Wochenende unregelmäßig"
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-coach-400"
                />
              </label>
            </div>
          </Panel>

          <Panel>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-coach-50 text-coach-700">
                <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-ink">Job & Alltag</h2>
                <p className="mt-1 text-sm text-muted">Hilft dem Coach, Büro-, Reise- und Belastungstage besser einzuordnen.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Job
                <input
                  value={job.title}
                  onChange={(event) => updateProfile({ ...profile, job: { ...job, title: event.target.value } })}
                  placeholder="z. B. Produktmanagement, Vertrieb, Schichtdienst"
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-coach-400"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Arbeitsmuster
                <select
                  value={job.workPattern}
                  onChange={(event) => updateProfile({ ...profile, job: { ...job, workPattern: event.target.value as JobProfile["workPattern"] } })}
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-coach-400"
                >
                  <option value="homeoffice">viel Home-Office</option>
                  <option value="office">viel Büro</option>
                  <option value="hybrid">hybrid</option>
                  <option value="travel_heavy">viele Reisen</option>
                  <option value="shift">Schichtdienst</option>
                  <option value="flexible">flexibel</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Belastung
                <select
                  value={job.workload}
                  onChange={(event) => updateProfile({ ...profile, job: { ...job, workload: event.target.value as JobProfile["workload"] } })}
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-coach-400"
                >
                  <option value="regular">regelmäßig</option>
                  <option value="high">hoch</option>
                  <option value="variable">wechselhaft</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Pendelzeit Minuten
                <input
                  value={job.commuteMinutes ?? ""}
                  onChange={(event) => updateProfile({
                    ...profile,
                    job: { ...job, commuteMinutes: parseNumber(event.target.value, job.commuteMinutes ?? 0) }
                  })}
                  inputMode="numeric"
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-coach-400"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-ink sm:col-span-2">
                Jobnotiz
                <input
                  value={job.notes ?? ""}
                  onChange={(event) => updateProfile({ ...profile, job: { ...job, notes: event.target.value } })}
                  placeholder="z. B. Di/Do Büro, Kundentermine, lange Calls"
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-coach-400"
                />
              </label>
            </div>
          </Panel>

          <Panel>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-ink">Ziele</h2>
              <Pill tone="green">aktiv</Pill>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Gewicht
                <select
                  value={goals.weightStrategy}
                  onChange={(event) => updateGoals({ ...goals, weightStrategy: event.target.value as WeightStrategy })}
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-coach-400"
                >
                  <option value="reduce">reduzieren</option>
                  <option value="maintain">halten</option>
                  <option value="gain">aufbauen</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Leistung
                <select
                  value={goals.performanceStrategy}
                  onChange={(event) => updateGoals({ ...goals, performanceStrategy: event.target.value as PerformanceStrategy })}
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-coach-400"
                >
                  <option value="maintain_and_improve">halten und verbessern</option>
                  <option value="prepare_race">Wettkampf vorbereiten</option>
                  <option value="recover">erholen</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-ink sm:col-span-2">
                Fueling
                <select
                  value={goals.fuelingPriority}
                  onChange={(event) => updateGoals({
                    ...goals,
                    fuelingPriority: event.target.value as typeof goals.fuelingPriority
                  })}
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-coach-400"
                >
                  <option value="support_training">Training unterstützen</option>
                  <option value="maximize_deficit">Defizit maximieren</option>
                  <option value="maintain_energy">Energie stabil halten</option>
                </select>
              </label>
            </div>
          </Panel>

          <Panel>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                <Flame className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-ink">Energieverbrauch</h2>
                <p className="mt-1 text-sm text-muted">Basis und Forecast steuern Kalorien, Makros und Fueling-Hinweise.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Standardverbrauch ohne Aktivität
                <input
                  value={energySettings.baselineCaloriesWithoutActivity}
                  onChange={(event) => updateBaselineCaloriesWithoutActivity(
                    parseNumber(event.target.value, energySettings.baselineCaloriesWithoutActivity)
                  )}
                  inputMode="numeric"
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-coach-400"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Forecast-Datum
                <input
                  value={state.selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  type="date"
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-coach-400"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Aktivitäts-Forecast
                <input
                  value={selectedForecastCalories ?? ""}
                  onChange={(event) => updateManualActivityForecastCalories(
                    state.selectedDate,
                    parseOptionalNumber(event.target.value)
                  )}
                  placeholder="z. B. 650"
                  inputMode="numeric"
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-coach-400"
                />
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => updateManualActivityForecastCalories(state.selectedDate)}
                  disabled={!selectedForecastCalories}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-coach-100 hover:text-coach-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Forecast entfernen
                </button>
              </div>
            </div>
          </Panel>
        </div>

        <div className="grid gap-6 content-start">
          <Panel>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-ink">Wettkampfziel</h2>
              <Pill tone={raceGoal.priority === "A" ? "amber" : "neutral"}>{raceGoal.priority}-Ziel</Pill>
            </div>

            <div className="grid gap-3">
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Name
                <input
                  value={raceGoal.name}
                  onChange={(event) => updateRaceGoal({ ...raceGoal, name: event.target.value })}
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-coach-400"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  Datum
                  <input
                    value={raceGoal.date}
                    onChange={(event) => updateRaceGoal({ ...raceGoal, date: event.target.value as RaceGoal["date"] })}
                    type="date"
                    className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-coach-400"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  Distanz km
                  <input
                    value={raceGoal.distanceKm}
                    onChange={(event) => updateRaceGoal({
                      ...raceGoal,
                      distanceKm: parseNumber(event.target.value, raceGoal.distanceKm)
                    })}
                    inputMode="decimal"
                    className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-coach-400"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  Zielzeit
                  <input
                    value={raceGoal.targetTime}
                    onChange={(event) => updateRaceGoal({ ...raceGoal, targetTime: event.target.value })}
                    className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-coach-400"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  Priorität
                  <select
                    value={raceGoal.priority}
                    onChange={(event) => updateRaceGoal({ ...raceGoal, priority: event.target.value as RaceGoal["priority"] })}
                    className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-coach-400"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </label>
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-5 w-5 text-coach-600" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-semibold text-ink">Integrationen</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Pill tone="green">Strava bereit</Pill>
                  <Pill tone="blue">AI serverseitig</Pill>
                  <Pill tone={onlineMode ? "green" : "neutral"}>
                    {onlineMode ? "Supabase aktiv" : "Supabase lokal aus"}
                  </Pill>
                </div>
              </div>
            </div>
          </Panel>

          <StravaIntegrationPanel />

          <Panel>
            <h2 className="text-lg font-semibold text-ink">Datenzustand</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Ohne Supabase bleiben Änderungen lokal. Mit Supabase werden sie pro Benutzer gespeichert.
            </p>
            <button
              type="button"
              onClick={onlineMode ? resetBetaState : resetDemoState}
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-coach-100 hover:text-coach-700"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {onlineMode ? "Beta-Zustand neu starten" : "Demo zurücksetzen"}
            </button>
            <SignOutButton />
          </Panel>
        </div>
      </section>
    </div>
  );
}

function createFallbackRaceGoal(): RaceGoal {
  return {
    name: "Mein Wettkampf",
    date: createFutureDate(90),
    distanceKm: 10,
    targetTime: "0:50:00",
    priority: "A"
  };
}

function createFallbackFamilyProfile(): FamilyProfile {
  return {
    situation: "with_children",
    childrenCount: 2,
    careResponsibility: "medium",
    notes: ""
  };
}

function createFallbackJobProfile(): JobProfile {
  return {
    title: "Wissensarbeit",
    workPattern: "hybrid",
    workload: "variable",
    commuteMinutes: 30,
    notes: ""
  };
}

function createFutureDate(daysFromNow: number): RaceGoal["date"] {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}` as RaceGoal["date"];
}

function parseNumber(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value.replace(",", "."));

  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmedValue = value.trim();
  if (!trimmedValue) return undefined;

  const parsed = Number.parseFloat(trimmedValue.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

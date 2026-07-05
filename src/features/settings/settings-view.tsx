"use client";

import { RotateCcw, ShieldCheck, UserRound } from "lucide-react";
import { PageHeader, Panel, Pill } from "@/components/ui";
import type { PerformanceStrategy, RaceGoal, WeightStrategy } from "@/domain/goals/types";
import { useAppState } from "@/features/app-state/app-state-provider";
import { SignOutButton } from "@/features/auth/sign-out-button";

export function SettingsView() {
  const { state, updateProfile, updateGoals, updateRaceGoal, resetDemoState } = useAppState();
  const profile = state.profile;
  const goals = state.goals;
  const raceGoal = profile.raceGoal ?? createFallbackRaceGoal();

  return (
    <div>
      <PageHeader
        eyebrow="Einstellungen"
        title="Profil, Ziele und Demo-Daten"
        description="Stammdaten steuern die lokalen Coach-Empfehlungen."
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
                  <Pill tone="neutral">Strava später</Pill>
                  <Pill tone="neutral">OpenAI später</Pill>
                  <Pill tone="neutral">Supabase später</Pill>
                </div>
              </div>
            </div>
          </Panel>

          <Panel>
            <h2 className="text-lg font-semibold text-ink">Demo-Daten</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Ohne Supabase bleiben Änderungen lokal. Mit Supabase werden sie pro Benutzer gespeichert.
            </p>
            <button
              type="button"
              onClick={resetDemoState}
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-coach-100 hover:text-coach-700"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Demo zurücksetzen
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
    name: "Halbmarathon",
    date: "2026-10-04",
    distanceKm: 21.1,
    targetTime: "1:45:00",
    priority: "A"
  };
}

function parseNumber(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value.replace(",", "."));

  return Number.isFinite(parsed) ? parsed : fallback;
}

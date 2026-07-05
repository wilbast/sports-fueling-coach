"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ShieldCheck, Unplug, Zap } from "lucide-react";
import { Panel, Pill } from "@/components/ui";

type StravaStatus = {
  configured: boolean;
  connected: boolean;
  status?: string;
  athlete?: {
    id?: string;
    name?: string;
  };
  scopes?: string[];
  lastSyncAt?: string;
  lastSyncStatus?: string;
  lastSyncError?: string;
  activityCount: number;
  latestActivityAt?: string;
  latestSyncJob?: {
    status: string;
    syncType: string;
    importedCount: number;
    updatedCount: number;
    skippedCount: number;
    errorMessage?: string;
    startedAt: string;
    completedAt?: string;
  };
};

export function StravaIntegrationPanel() {
  const [status, setStatus] = useState<StravaStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadStatus();
  }, []);

  async function loadStatus() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/integrations/strava/status");
      if (!response.ok) throw new Error("Strava-Status konnte nicht geladen werden.");

      setStatus(await response.json() as StravaStatus);
    } catch {
      setError("Strava-Status konnte gerade nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  }

  async function syncActivities() {
    setIsSyncing(true);
    setError(null);
    setSyncMessage(null);

    try {
      const response = await fetch("/api/integrations/strava/sync", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Synchronisation fehlgeschlagen.");

      setSyncMessage(`${result.importedCount} neu importiert, ${result.updatedCount} aktualisiert.`);
      await loadStatus();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Synchronisation fehlgeschlagen.");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <Panel>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-50 text-orange-700">
            <Zap className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink">Strava</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Importiert Aktivitäten in deine persönliche Wissensbasis. Tokens bleiben serverseitig.
            </p>
          </div>
        </div>
        <Pill tone={status?.connected ? "green" : "neutral"}>
          {status?.connected ? "verbunden" : "nicht verbunden"}
        </Pill>
      </div>

      {isLoading ? (
        <div className="rounded-xl bg-canvas px-3 py-3 text-sm text-muted">Status wird geladen...</div>
      ) : !status?.configured ? (
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-sm leading-6 text-amber-800">
          Strava ist noch nicht konfiguriert. Setze `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` und `SUPABASE_SERVICE_ROLE_KEY`.
        </div>
      ) : status.connected ? (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatusCard label="Athlet" value={status.athlete?.name ?? status.athlete?.id ?? "verbunden"} />
            <StatusCard label="Aktivitäten" value={String(status.activityCount)} />
            <StatusCard label="Letzter Sync" value={status.lastSyncAt ? formatDateTime(status.lastSyncAt) : "noch keiner"} />
          </div>

          <div className="rounded-xl bg-canvas px-3 py-3 text-sm leading-6 text-muted">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-coach-700" aria-hidden="true" />
              <span>
                Scopes: {status.scopes?.join(", ") || "keine Scope-Info"}.
                {status.latestActivityAt ? ` Neueste Aktivität: ${formatDateTime(status.latestActivityAt)}.` : ""}
              </span>
            </div>
          </div>

          {status.latestSyncJob ? (
            <div className="rounded-xl border border-line px-3 py-3 text-sm leading-6 text-muted">
              Letzter Job: {status.latestSyncJob.status} · {status.latestSyncJob.importedCount} neu · {status.latestSyncJob.updatedCount} aktualisiert
              {status.latestSyncJob.errorMessage ? ` · ${status.latestSyncJob.errorMessage}` : ""}
            </div>
          ) : null}

          {status.lastSyncError ? (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-3 text-sm text-rose-700">
              {status.lastSyncError}
            </div>
          ) : null}

          <button
            type="button"
            onClick={syncActivities}
            disabled={isSyncing}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coach-600 px-4 text-sm font-semibold text-white transition hover:bg-coach-500 disabled:cursor-not-allowed disabled:bg-muted"
          >
            <RefreshCw className={isSyncing ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden="true" />
            {isSyncing ? "Synchronisiere..." : "Aktivitäten synchronisieren"}
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="rounded-xl bg-canvas px-3 py-3 text-sm leading-6 text-muted">
            Verbinde Strava einmalig. Danach speichert die App Aktivitäten dauerhaft in Supabase und nutzt sie für Coach-Kontext.
          </div>
          <a
            href="/api/integrations/strava/connect"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white transition hover:bg-orange-500"
          >
            <Unplug className="h-4 w-4" aria-hidden="true" />
            Strava verbinden
          </a>
        </div>
      )}

      {syncMessage ? (
        <div className="mt-4 rounded-xl border border-coach-100 bg-coach-50 px-3 py-3 text-sm text-coach-800">
          {syncMessage}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-3 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
    </Panel>
  );
}

type StatusCardProps = {
  label: string;
  value: string;
};

function StatusCard({ label, value }: StatusCardProps) {
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 font-semibold text-ink">{value}</p>
    </div>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

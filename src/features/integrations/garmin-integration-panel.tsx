"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, ShieldCheck, Trash2, Unplug, Watch } from "lucide-react";
import { Panel, Pill } from "@/components/ui";

type GarminStatus = {
  configured: boolean;
  featureEnabled: boolean;
  connected: boolean;
  status: string;
  maskedAccount?: string;
  connectedAt?: string;
  lastSuccessfulSyncAt?: string;
  lastSyncAttemptAt?: string;
  nextSyncAfter?: string;
  earliestImportedDate?: string;
  latestSyncRun?: {
    id: string;
    status: string;
    syncType: string;
    trigger: string;
    startedAt: string;
    finishedAt?: string;
    processedDomains: string[];
    successfulRequests: number;
    failedRequests: number;
    createdRecords: number;
    updatedRecords: number;
    unchangedRecords: number;
    errorMessage?: string;
  };
  activityCount: number;
  rawRecordCount: number;
  dailyHealthCount: number;
  sleepCount: number;
  hrvCount: number;
  missingEnv?: string[];
  warning?: string;
};

export function GarminIntegrationPanel() {
  const [status, setStatus] = useState<GarminStatus | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadStatus();
  }, []);

  async function loadStatus(options: { silent?: boolean } = {}): Promise<GarminStatus | null> {
    if (!options.silent) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const response = await fetch("/api/integrations/garmin/status");
      const result = await response.json() as GarminStatus & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Garmin-Status konnte nicht geladen werden.");
      setStatus(result);
      return result;
    } catch (loadError) {
      if (!options.silent) setError(loadError instanceof Error ? loadError.message : "Garmin-Status konnte nicht geladen werden.");
      return null;
    } finally {
      if (!options.silent) setIsLoading(false);
    }
  }

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/integrations/garmin/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Garmin-Verbindung fehlgeschlagen.");
      if (result.status === "MFA_REQUIRED") {
        setAttemptId(result.attemptId);
        setMessage("Garmin verlangt einen MFA-Code.");
      } else {
        setPassword("");
        setEmail("");
        setMessage("Garmin Connect wurde verbunden. Der Erstimport startet im Hintergrund.");
        await loadStatus();
      }
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Garmin-Verbindung fehlgeschlagen.");
    } finally {
      setIsBusy(false);
    }
  }

  async function submitMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!attemptId) return;
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/integrations/garmin/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, mfaCode })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Garmin MFA fehlgeschlagen.");
      setAttemptId(null);
      setMfaCode("");
      setPassword("");
      setEmail("");
      setMessage("Garmin Connect wurde verbunden. Der Erstimport startet im Hintergrund.");
      await loadStatus();
    } catch (mfaError) {
      setError(mfaError instanceof Error ? mfaError.message : "Garmin MFA fehlgeschlagen.");
    } finally {
      setIsBusy(false);
    }
  }

  async function syncNow() {
    setIsBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/integrations/garmin/sync", { method: "POST" });
      const result = await response.json() as { queued?: boolean; jobId?: string; status?: string; deduplicated?: boolean; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Garmin-Sync fehlgeschlagen.");
      const previousRunId = status?.latestSyncRun?.id;
      setMessage(result.status === "SUCCESS"
        ? "Dieser Garmin-Zeitraum wurde bereits synchronisiert."
        : "Garmin-Synchronisation wurde gestartet. Die Ergebnisse werden im Hintergrund geladen.");
      await loadStatus({ silent: true });
      if (result.status !== "SUCCESS") void monitorQueuedSync(previousRunId);
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Garmin-Sync fehlgeschlagen.");
    } finally {
      setIsBusy(false);
    }
  }

  async function monitorQueuedSync(previousRunId?: string) {
    for (const delayMs of [3000, 7000, 15000, 30000, 45000]) {
      await wait(delayMs);
      const current = await loadStatus({ silent: true });
      const run = current?.latestSyncRun;
      if (!run || run.id === previousRunId) continue;
      if (["FAILED", "ERROR", "REAUTH_REQUIRED", "RATE_LIMITED"].includes(run.status)) {
        setError(run.errorMessage ?? `Garmin-Synchronisation ist mit Status ${run.status} fehlgeschlagen.`);
        setMessage(null);
        return;
      }
      if (run.finishedAt) {
        setMessage(`Garmin-Sync abgeschlossen: ${run.createdRecords} neu, ${run.updatedRecords} aktualisiert, ${run.unchangedRecords} unverändert.`);
        return;
      }
    }
    setMessage("Garmin-Synchronisation läuft weiter im Hintergrund. Der aktuelle Stand wird beim nächsten Öffnen angezeigt.");
  }

  async function disconnect(deleteData: boolean) {
    setIsBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/integrations/garmin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteData })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Garmin konnte nicht getrennt werden.");
      setMessage(deleteData ? "Garmin wurde getrennt und importierte Garmin-Daten wurden gelöscht." : "Garmin wurde getrennt. Importierte Daten bleiben erhalten.");
      await loadStatus();
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : "Garmin konnte nicht getrennt werden.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Panel>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-50 text-sky-700">
            <Watch className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink">Garmin Connect</h2>
            <p className="mt-1 text-sm leading-6 text-muted">Experimentelle Garmin-Integration für Aktivitäten, Schlaf, HRV und Recovery-Daten.</p>
          </div>
        </div>
        <Pill tone={status?.connected ? "green" : "neutral"}>{status?.connected ? "verbunden" : "nicht verbunden"}</Pill>
      </div>

      <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-sm leading-6 text-amber-800">
        <div className="flex gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>Diese Verbindung verwendet keine offiziell von Garmin bereitgestellte Programmierschnittstelle. Änderungen an Garmin Connect können die Synchronisation vorübergehend beeinträchtigen.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl bg-canvas px-3 py-3 text-sm text-muted">Status wird geladen...</div>
      ) : !status?.featureEnabled || !status.configured ? (
        <div className="rounded-xl border border-line bg-canvas px-3 py-3 text-sm leading-6 text-muted">
          <p className="font-semibold text-ink">Garmin ist noch nicht aktiv.</p>
          {status?.warning ? <p className="mt-1">{status.warning}</p> : null}
          {status?.missingEnv?.length ? (
            <p className="mt-1">Fehlend: {status.missingEnv.join(", ")}</p>
          ) : null}
        </div>
      ) : status.connected ? (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <StatusCard label="Account" value={status.maskedAccount ?? "verbunden"} />
            <StatusCard label="Aktivitäten" value={String(status.activityCount)} />
            <StatusCard label="Raw Records" value={String(status.rawRecordCount)} />
            <StatusCard label="Health" value={`${status.dailyHealthCount}/${status.sleepCount}/${status.hrvCount}`} />
          </div>

          <div className="rounded-xl bg-canvas px-3 py-3 text-sm leading-6 text-muted">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-coach-700" aria-hidden="true" />
              <span>
                Letzter Erfolg: {status.lastSuccessfulSyncAt ? formatDateTime(status.lastSuccessfulSyncAt) : "noch keiner"}.
                {" "}Nächster Sync: {status.nextSyncAfter ? formatDateTime(status.nextSyncAfter) : "noch nicht geplant"}.
              </span>
            </div>
          </div>

          {status.latestSyncRun ? (
            <div className="rounded-xl border border-line px-3 py-3 text-sm leading-6 text-muted">
              Letzter Lauf: {status.latestSyncRun.status} · {status.latestSyncRun.syncType} · {status.latestSyncRun.successfulRequests} erfolgreich · {status.latestSyncRun.failedRequests} Fehler
              {status.latestSyncRun.errorMessage ? ` · ${status.latestSyncRun.errorMessage}` : ""}
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-3">
            <button type="button" onClick={syncNow} disabled={isBusy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coach-600 px-4 text-sm font-semibold text-white transition hover:bg-coach-500 disabled:opacity-50">
              <RefreshCw className={isBusy ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden="true" />
              Jetzt synchronisieren
            </button>
            <button type="button" onClick={() => disconnect(false)} disabled={isBusy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-coach-100 hover:text-coach-700 disabled:opacity-50">
              <Unplug className="h-4 w-4" aria-hidden="true" />
              Trennen
            </button>
            <button type="button" onClick={() => disconnect(true)} disabled={isBusy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-100 bg-white px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Trennen + löschen
            </button>
          </div>
        </div>
      ) : attemptId ? (
        <form onSubmit={submitMfa} className="grid gap-3">
          <input value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} placeholder="MFA-Code" className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400" />
          <button type="submit" disabled={isBusy} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-coach-600 px-4 text-sm font-semibold text-white transition hover:bg-coach-500 disabled:opacity-50">
            MFA bestätigen
          </button>
        </form>
      ) : (
        <form onSubmit={connect} className="grid gap-3">
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" placeholder="Garmin-E-Mail" className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400" />
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" placeholder="Garmin-Passwort" className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400" />
          <button type="submit" disabled={isBusy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-50">
            <Unplug className="h-4 w-4" aria-hidden="true" />
            Garmin Connect verbinden
          </button>
        </form>
      )}

      {message ? <div className="mt-4 rounded-xl border border-coach-100 bg-coach-50 px-3 py-3 text-sm text-coach-800">{message}</div> : null}
      {error ? <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-3 py-3 text-sm text-rose-700">{error}</div> : null}
    </Panel>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
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

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

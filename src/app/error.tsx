"use client";

import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: AppErrorProps) {
  return (
    <section className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-xl rounded-2xl border border-line bg-white p-6 shadow-soft">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-coach-600">
          App-Fehler
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink">
          Die Ansicht konnte nicht geladen werden.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Bitte versuche es erneut. Falls der Fehler bleibt, setze den lokalen Demo-Zustand in
          den Einstellungen zurück.
        </p>
        {error.digest ? (
          <p className="mt-3 rounded-xl bg-canvas px-3 py-2 text-xs font-medium text-muted">
            Fehler-ID: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coach-600 px-4 text-sm font-semibold text-white transition hover:bg-coach-500"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Erneut laden
          </button>
          <Link
            href="/today"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-coach-100 hover:text-coach-700"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Zur Heute-Seite
          </Link>
        </div>
      </div>
    </section>
  );
}

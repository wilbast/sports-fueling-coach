"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import "./globals.css";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="de">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-canvas px-4 text-ink">
          <div className="w-full max-w-xl rounded-2xl border border-line bg-white p-6 shadow-soft">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-coach-600">
              Schwerer App-Fehler
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink">
              Die App konnte nicht gestartet werden.
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Bitte lade die App neu. Falls der Fehler danach weiter erscheint, starte den
              lokalen Dev-Server neu.
            </p>
            {error.digest ? (
              <p className="mt-3 rounded-xl bg-canvas px-3 py-2 text-xs font-medium text-muted">
                Fehler-ID: {error.digest}
              </p>
            ) : null}
            <button
              type="button"
              onClick={reset}
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coach-600 px-4 text-sm font-semibold text-white transition hover:bg-coach-500"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Erneut laden
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}

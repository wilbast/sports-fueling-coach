import Link from "next/link";
import { Home, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <section className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-xl rounded-2xl border border-line bg-white p-6 shadow-soft">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-coach-50 text-coach-700">
          <SearchX className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-coach-600">
          Nicht gefunden
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink">
          Diese Seite gibt es im Demo-Modus nicht.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Gehe zurück zur Heute-Seite und starte dort mit dem aktuellen Tagesbriefing.
        </p>
        <Link
          href="/today"
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coach-600 px-4 text-sm font-semibold text-white transition hover:bg-coach-500"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          Zur Heute-Seite
        </Link>
      </div>
    </section>
  );
}

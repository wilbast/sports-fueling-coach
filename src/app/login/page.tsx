import { Activity, LockKeyhole } from "lucide-react";
import { redirect } from "next/navigation";
import { signIn } from "@/app/login/actions";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams?: {
    error?: string;
    next?: string;
  };
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { data } = await supabase.auth.getClaims();

    if (data?.claims) {
      redirect("/today");
    }
  }

  const next = sanitizeRedirectPath(searchParams?.next ?? "/today");
  const errorMessage = getErrorMessage(searchParams?.error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10 text-ink">
      <section className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-soft">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-coach-600 text-white">
            <Activity className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Sports & Fueling</p>
            <p className="text-xs text-muted">Gesicherter Zugriff</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-coach-50 text-coach-700">
            <LockKeyhole className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coach-600">
            Login
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink">
            Willkommen zurück
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Melde dich mit deinem Supabase-Benutzer an. Öffentliche Registrierung ist bewusst deaktiviert.
          </p>
        </div>

        {errorMessage ? (
          <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-3 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <form action={signIn} className="grid gap-3">
          <input type="hidden" name="next" value={next} />
          <label className="grid gap-2 text-sm font-semibold text-ink">
            E-Mail
            <input
              name="email"
              type="email"
              autoComplete="email"
              className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-coach-400"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Passwort
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-coach-400"
              required
            />
          </label>
          <button
            type="submit"
            className="mt-2 inline-flex min-h-11 items-center justify-center rounded-xl bg-coach-600 px-4 text-sm font-semibold text-white transition hover:bg-coach-500"
          >
            Einloggen
          </button>
        </form>
      </section>
    </main>
  );
}

function sanitizeRedirectPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/today";
  if (value.startsWith("/login")) return "/today";

  return value;
}

function getErrorMessage(error?: string): string | null {
  const messages: Record<string, string> = {
    "missing-config": "Supabase ist noch nicht konfiguriert. Bitte setze die Environment-Variablen.",
    "missing-fields": "Bitte E-Mail und Passwort eintragen.",
    "invalid-login": "Login fehlgeschlagen. Bitte prüfe E-Mail und Passwort."
  };

  return error ? messages[error] ?? "Login fehlgeschlagen." : null;
}

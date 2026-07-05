"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { navItems } from "@/config/navigation";
import { AppStateProvider } from "@/features/app-state/app-state-provider";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { isSupabaseConfigured } from "@/lib/supabase/client";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const onlineMode = isSupabaseConfigured();

  if (pathname === "/login") {
    return <div className="min-h-screen bg-canvas text-ink">{children}</div>;
  }

  return (
    <AppStateProvider>
      <div className="min-h-screen bg-canvas text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-line bg-white/80 px-4 py-5 backdrop-blur lg:flex lg:flex-col">
        <Link href="/today" className="mb-8 flex items-center gap-3 rounded-xl px-2 py-1">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-coach-600 text-white">
            <Activity className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-wide text-ink">
              Sports & Fueling
            </span>
            <span className="block text-xs text-muted">{onlineMode ? "Coach Beta" : "Coach Demo"}</span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "group flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium transition",
                  active
                    ? "bg-coach-50 text-coach-900"
                    : "text-muted hover:bg-white hover:text-ink"
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {item.label}
                </span>
                {active ? <ChevronRight className="h-4 w-4" aria-hidden="true" /> : null}
              </Link>
            );
          })}
        </nav>

        <div className="rounded-2xl border border-line bg-white p-4 text-sm text-muted">
          <p className="font-medium text-ink">
            {onlineMode ? "Gesicherter Online-Modus" : "Lokaler Demo-Modus"}
          </p>
          <p className="mt-1 leading-5">
            {onlineMode
              ? "Änderungen werden pro Benutzer mit Supabase RLS gespeichert."
              : "Änderungen bleiben in diesem Browser gespeichert."}
          </p>
          <SignOutButton />
        </div>
      </aside>

      <main className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:ml-72 lg:px-8 lg:pb-10 lg:pt-8">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-soft backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-6 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[0.68rem] font-medium transition",
                  active ? "bg-coach-50 text-coach-700" : "text-muted"
                )}
                aria-label={item.label}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      </div>
    </AppStateProvider>
  );
}

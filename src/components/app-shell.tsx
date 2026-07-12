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
  const dashboardMode = pathname === "/insights";

  if (pathname === "/login") {
    return <div className="min-h-screen bg-canvas text-ink">{children}</div>;
  }

  return (
    <AppStateProvider>
      <div className={clsx("min-h-screen", dashboardMode ? "bg-[#0B1220] text-[#F9FAFB]" : "bg-canvas text-ink")}>
      <aside className={clsx("fixed inset-y-0 left-0 z-30 hidden w-72 border-r px-4 py-5 backdrop-blur lg:flex lg:flex-col", dashboardMode ? "border-[#1F2937] bg-[#0F172A]/95" : "border-line bg-white/80")}>
        <Link href="/today" className="mb-8 flex items-center gap-3 rounded-xl px-2 py-1">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-coach-600 text-white">
            <Activity className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className={clsx("block text-sm font-semibold tracking-wide", dashboardMode ? "text-white" : "text-ink")}>
              Sports & Fueling
            </span>
            <span className={clsx("block text-xs", dashboardMode ? "text-[#9CA3AF]" : "text-muted")}>{onlineMode ? "Coach Beta" : "Coach Demo"}</span>
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
                    ? dashboardMode ? "bg-[#1E3A5F] text-white" : "bg-coach-50 text-coach-900"
                    : dashboardMode ? "text-[#9CA3AF] hover:bg-[#111827] hover:text-white" : "text-muted hover:bg-white hover:text-ink"
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

        <div className={clsx("rounded-lg border p-4 text-sm", dashboardMode ? "border-[#1F2937] bg-[#111827] text-[#9CA3AF]" : "border-line bg-white text-muted")}>
          <p className={clsx("font-medium", dashboardMode ? "text-white" : "text-ink")}>
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

      <main className={clsx("mx-auto min-h-screen w-full px-4 pb-40 pt-5 sm:px-6 lg:ml-72 lg:w-[calc(100%-18rem)] lg:px-8 lg:pb-10 lg:pt-8", dashboardMode ? "lg:max-w-none" : "max-w-6xl")}>
        {children}
      </main>

      <nav className={clsx("fixed inset-x-0 bottom-0 z-40 border-t px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-soft backdrop-blur lg:hidden", dashboardMode ? "border-[#1F2937] bg-[#0F172A]/95" : "border-line bg-white/95")}>
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[0.68rem] font-medium transition",
                  active ? dashboardMode ? "bg-[#1E3A5F] text-white" : "bg-coach-50 text-coach-700" : dashboardMode ? "text-[#9CA3AF]" : "text-muted"
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

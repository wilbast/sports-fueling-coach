"use client";

import Link from "next/link";
import { Bot, Check, ChevronRight, MessageCircle } from "lucide-react";
import type { DashboardData } from "@/domain/dashboard/types";
import { DashboardCard } from "@/components/dashboard/dashboard-card";

export function CoachCard({ coach }: { coach: DashboardData["coach"] }) {
  return (
    <DashboardCard className="border-[#244873] bg-[#0D1B2E]">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2563EB] text-white"><Bot className="h-5 w-5" aria-hidden="true" /></span>
            <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#93C5FD]">Coach-Empfehlung</p><h2 className="mt-1 text-xl font-semibold text-white">{coach.title}</h2></div>
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-6 text-[#D1D5DB]">{coach.message}</p>
          <ul className="mt-5 grid gap-2 text-sm text-[#CBD5E1] sm:grid-cols-3">
            {coach.reasons.map((reason) => <li key={reason} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#22C55E]" aria-hidden="true" />{reason}</li>)}
          </ul>
        </div>
        <div className="grid content-center gap-3 rounded-lg border border-[#1E3A5F] bg-[#0B1728] p-4">
          <ActionSummary label="Training" value={coach.trainingAction} />
          <ActionSummary label="Fueling" value={coach.fuelingAction} />
          <div className="mt-1 grid grid-cols-2 gap-2">
            <Link href="/training" className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md bg-[#2563EB] px-3 text-xs font-semibold text-white transition hover:bg-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60A5FA]">Training <ChevronRight className="h-4 w-4" aria-hidden="true" /></Link>
            <Link href="/coach" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[#334155] px-3 text-xs font-semibold text-white transition hover:bg-[#1E293B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60A5FA]"><MessageCircle className="h-4 w-4" aria-hidden="true" />Nachfragen</Link>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

function ActionSummary({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#64748B]">{label}</p><p className="mt-1 text-sm font-medium text-[#E2E8F0]">{value}</p></div>;
}

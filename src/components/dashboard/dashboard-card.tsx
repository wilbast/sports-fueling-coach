"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Info } from "lucide-react";
import { clsx } from "clsx";

type DashboardCardProps = {
  children: React.ReactNode;
  className?: string;
  href?: string;
  delay?: number;
  ariaLabel?: string;
};

export function DashboardCard({ children, className, href, delay = 0, ariaLabel }: DashboardCardProps) {
  const reducedMotion = useReducedMotion();
  const card = (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reducedMotion ? undefined : { y: -2 }}
      className={clsx(
        "h-full rounded-lg border border-[#1F2937] bg-[#111827] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)] sm:p-5",
        href && "transition-colors hover:border-[#374151] focus-within:border-[#2563EB]",
        className
      )}
    >
      {children}
    </motion.article>
  );

  return href ? <Link href={href} aria-label={ariaLabel} className="block h-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]">{card}</Link> : card;
}

export function CardHeading({ title, subtitle, info }: { title: string; subtitle?: string; info: string }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-[#F9FAFB]">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">{subtitle}</p> : null}
      </div>
      <button type="button" title={info} aria-label={`Info zu ${title}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#6B7280] transition hover:bg-[#1F2937] hover:text-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]">
        <Info className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return (
    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#60A5FA]">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-semibold text-[#F9FAFB] sm:text-2xl">{title}</h2>
      </div>
      <p className="max-w-md text-sm text-[#9CA3AF]">{detail}</p>
    </div>
  );
}

import { Activity, Info } from "lucide-react";
import { clsx } from "clsx";

type Tone = "green" | "blue" | "amber" | "red" | "neutral";

const tones: Record<Tone, { accent: string; soft: string; text: string }> = {
  green: { accent: "#22C55E", soft: "bg-[#123126]", text: "text-[#86EFAC]" },
  blue: { accent: "#3B82F6", soft: "bg-[#172554]", text: "text-[#93C5FD]" },
  amber: { accent: "#F59E0B", soft: "bg-[#332711]", text: "text-[#FCD34D]" },
  red: { accent: "#EF4444", soft: "bg-[#35181E]", text: "text-[#FCA5A5]" },
  neutral: { accent: "#64748B", soft: "bg-[#1F2937]", text: "text-[#CBD5E1]" }
};

export function PerformanceHero({
  eyebrow,
  title,
  summary,
  score,
  scoreLabel,
  tone = "blue",
  confidence,
  reasons,
  action
}: {
  eyebrow: string;
  title: string;
  summary: string;
  score?: number;
  scoreLabel: string;
  tone?: Tone;
  confidence?: string;
  reasons?: string[];
  action?: React.ReactNode;
}) {
  const palette = tones[tone];
  const safeScore = Math.max(0, Math.min(100, score ?? 0));
  return (
    <section className="mb-5 overflow-hidden rounded-lg border border-[#263449] bg-[#111827] shadow-soft">
      <div className="grid lg:grid-cols-[1fr_260px]">
        <div className="p-5 sm:p-6">
          <p className={clsx("text-xs font-semibold uppercase tracking-[0.14em]", palette.text)}>{eyebrow}</p>
          <h2 className="mt-3 max-w-3xl text-2xl font-semibold text-white sm:text-3xl">{title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#CBD5E1]">{summary}</p>
          {reasons?.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {reasons.slice(0, 4).map((reason) => <span key={reason} className="rounded-md border border-[#334155] bg-[#0F172A] px-2.5 py-1.5 text-xs font-medium text-[#CBD5E1]">{reason}</span>)}
            </div>
          ) : null}
          {action ? <div className="mt-5">{action}</div> : null}
        </div>
        <div className="flex items-center gap-5 border-t border-[#1F2937] bg-[#0F172A] p-5 lg:flex-col lg:justify-center lg:border-l lg:border-t-0">
          <div className="relative h-24 w-24 shrink-0 rounded-full" style={{ background: `conic-gradient(${palette.accent} ${safeScore * 3.6}deg, #1F2937 0deg)` }}>
            <div className="absolute inset-[7px] flex items-center justify-center rounded-full bg-[#0F172A]">
              <span className="text-2xl font-semibold text-white">{score == null ? "–" : Math.round(score)}</span>
            </div>
          </div>
          <div className="min-w-0 lg:text-center">
            <p className="font-semibold text-white">{scoreLabel}</p>
            <p className="mt-1 text-xs text-[#9CA3AF]">{confidence ? `Datenlage: ${confidence}` : "Aktueller Status"}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SignalGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={clsx("mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>{children}</section>;
}

export function SignalCard({
  icon: Icon = Activity,
  label,
  value,
  unit,
  detail,
  tone = "neutral",
  progress
}: {
  icon?: typeof Activity;
  label: string;
  value: string;
  unit?: string;
  detail: string;
  tone?: Tone;
  progress?: number;
}) {
  const palette = tones[tone];
  const safeProgress = progress == null ? null : Math.max(0, Math.min(100, progress));
  return (
    <article className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <span className={clsx("flex h-9 w-9 items-center justify-center rounded-md", palette.soft, palette.text)}><Icon className="h-4 w-4" aria-hidden="true" /></span>
        {safeProgress != null ? <span className="text-xs font-semibold text-muted">{Math.round(safeProgress)}%</span> : null}
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <div className="mt-2 flex items-baseline gap-1.5"><span className="text-2xl font-semibold text-ink">{value}</span>{unit ? <span className="text-sm font-medium text-muted">{unit}</span> : null}</div>
      {safeProgress != null ? <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#1F2937]"><div className="h-full rounded-full" style={{ width: `${safeProgress}%`, backgroundColor: palette.accent }} /></div> : null}
      <p className="mt-2 text-xs leading-5 text-muted">{detail}</p>
    </article>
  );
}

export function SectionIntro({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#60A5FA]">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-semibold text-ink">{title}</h2>
      </div>
      {detail ? <p className="max-w-lg text-sm leading-5 text-muted">{detail}</p> : null}
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function RecommendationBand({ title, body, reasons, action, tone = "blue" }: { title: string; body: string; reasons?: string[]; action?: React.ReactNode; tone?: Tone }) {
  const palette = tones[tone];
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-soft sm:p-5">
      <div className="flex items-start gap-3">
        <span className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", palette.soft, palette.text)}><Info className="h-4 w-4" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-ink">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
          {reasons?.length ? <p className="mt-2 text-xs leading-5 text-[#94A3B8]">Grundlage: {reasons.join(" · ")}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </section>
  );
}

export function TrendBars({ values, labels, tone = "blue", formatValue = String }: { values: number[]; labels: string[]; tone?: Tone; formatValue?: (value: number) => string }) {
  const palette = tones[tone];
  const max = Math.max(1, ...values);
  return (
    <div className="grid h-36 grid-cols-7 items-end gap-2" role="img" aria-label={values.map((value, index) => `${labels[index]} ${formatValue(value)}`).join(", ")}>
      {values.map((value, index) => (
        <div key={`${labels[index]}-${index}`} className="flex h-full min-w-0 flex-col justify-end gap-2 text-center">
          <span className="truncate text-[10px] font-medium text-muted">{value > 0 ? formatValue(value) : ""}</span>
          <div className="mx-auto w-full max-w-8 rounded-t-sm" style={{ height: `${Math.max(value > 0 ? 8 : 2, value / max * 92)}px`, backgroundColor: value > 0 ? palette.accent : "#1F2937" }} />
          <span className="truncate text-[10px] text-muted">{labels[index]}</span>
        </div>
      ))}
    </div>
  );
}

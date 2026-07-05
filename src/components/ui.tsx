import { clsx } from "clsx";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-coach-600">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-3xl font-semibold tracking-normal text-ink sm:text-4xl">
          {title}
        </h1>
        {description ? <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

type PanelProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
};

export function Panel({ children, className, id }: PanelProps) {
  return (
    <section id={id} className={clsx("rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-5", className)}>
      {children}
    </section>
  );
}

type PillProps = {
  children: React.ReactNode;
  tone?: "green" | "blue" | "amber" | "red" | "neutral";
};

export function Pill({ children, tone = "neutral" }: PillProps) {
  const tones = {
    green: "bg-coach-50 text-coach-700 ring-coach-100",
    blue: "bg-sky-50 text-sky-700 ring-sky-100",
    amber: "bg-amber-50 text-amber-800 ring-amber-100",
    red: "bg-rose-50 text-rose-700 ring-rose-100",
    neutral: "bg-stone-100 text-stone-700 ring-stone-200"
  };

  return (
    <span className={clsx("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1", tones[tone])}>
      {children}
    </span>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  unit?: string;
  note: string;
  tone?: "green" | "blue" | "amber";
};

export function StatCard({ label, value, unit, note, tone = "green" }: StatCardProps) {
  const accents = {
    green: "border-l-coach-500",
    blue: "border-l-sky-500",
    amber: "border-l-amber-500"
  };

  return (
    <div className={clsx("rounded-xl border border-line border-l-4 bg-white p-4", accents[tone])}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-ink">{value}</span>
        {unit ? <span className="text-sm font-medium text-muted">{unit}</span> : null}
      </div>
      <p className="mt-2 text-sm leading-5 text-muted">{note}</p>
    </div>
  );
}

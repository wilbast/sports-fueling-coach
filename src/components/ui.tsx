import { clsx } from "clsx";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#60A5FA]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-normal text-ink sm:text-3xl">
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
    <section id={id} className={clsx("rounded-lg border border-line bg-white p-4 shadow-soft sm:p-5", className)}>
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
    green: "bg-[#123126] text-[#86EFAC] ring-[#1F513C]",
    blue: "bg-[#172554] text-[#93C5FD] ring-[#1E3A5F]",
    amber: "bg-[#332711] text-[#FCD34D] ring-[#5F4819]",
    red: "bg-[#35181E] text-[#FCA5A5] ring-[#6B2737]",
    neutral: "bg-[#1F2937] text-[#CBD5E1] ring-[#374151]"
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
    <div className={clsx("rounded-lg border border-line border-l-4 bg-white p-4", accents[tone])}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-ink">{value}</span>
        {unit ? <span className="text-sm font-medium text-muted">{unit}</span> : null}
      </div>
      <p className="mt-2 text-sm leading-5 text-muted">{note}</p>
    </div>
  );
}

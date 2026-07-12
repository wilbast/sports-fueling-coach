export function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-5" aria-label="Dashboard wird geladen" aria-busy="true">
      <div className="h-72 rounded-lg border border-[#1F2937] bg-[#111827]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-64 rounded-lg border border-[#1F2937] bg-[#111827]" />)}</div>
      <div className="h-64 rounded-lg border border-[#1F2937] bg-[#111827]" />
      <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-72 rounded-lg border border-[#1F2937] bg-[#111827]" />)}</div>
    </div>
  );
}

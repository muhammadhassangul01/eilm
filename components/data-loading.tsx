export function DataLoading({ label = "Loading live data" }: { label?: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-[#d9c8b2] bg-[#fffaf4] p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#1a4d3d]">{label}</p>
        <div className="mt-6 h-3 w-1/3 animate-pulse rounded bg-[#e6dccd]" />
        <div className="mt-4 h-3 w-2/3 animate-pulse rounded bg-[#e6dccd]" />
        <div className="mt-4 h-3 w-1/2 animate-pulse rounded bg-[#e6dccd]" />
      </div>
    </div>
  );
}

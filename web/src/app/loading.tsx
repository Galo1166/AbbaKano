export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-2xl bg-slate-800" />
            <div className="space-y-2">
              <div className="h-3 w-24 animate-pulse rounded-full bg-slate-800" />
              <div className="h-4 w-36 animate-pulse rounded-full bg-slate-800" />
            </div>
          </div>
          <div className="h-9 w-24 animate-pulse rounded-xl bg-slate-800" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="mb-3 h-3 w-20 animate-pulse rounded-full bg-slate-800" />
              <div className="mb-2 h-8 w-28 animate-pulse rounded-full bg-slate-800" />
              <div className="h-3 w-40 animate-pulse rounded-full bg-slate-800" />
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="mb-4 h-4 w-28 animate-pulse rounded-full bg-slate-800" />
            <div className="space-y-3">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-11 animate-pulse rounded-xl bg-slate-800" />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="mb-5 h-4 w-32 animate-pulse rounded-full bg-slate-800" />
            <div className="space-y-4">
              <div className="h-28 animate-pulse rounded-2xl bg-slate-800" />
              <div className="h-12 animate-pulse rounded-xl bg-slate-800" />
              <div className="h-12 animate-pulse rounded-xl bg-slate-800" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

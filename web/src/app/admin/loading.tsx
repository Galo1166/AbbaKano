export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-slate-800 bg-slate-900/80 p-4 lg:block">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-800" />
            <div className="space-y-2">
              <div className="h-3 w-20 animate-pulse rounded-full bg-slate-800" />
              <div className="h-3 w-24 animate-pulse rounded-full bg-slate-800" />
            </div>
          </div>

          <div className="space-y-3">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="h-11 animate-pulse rounded-xl bg-slate-800" />
            ))}
          </div>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-5 flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3 w-24 animate-pulse rounded-full bg-slate-800" />
              <div className="h-7 w-52 animate-pulse rounded-xl bg-slate-800" />
            </div>
            <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-800" />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="mb-3 h-3 w-16 animate-pulse rounded-full bg-slate-800" />
                <div className="mb-2 h-8 w-24 animate-pulse rounded-full bg-slate-800" />
                <div className="h-3 w-32 animate-pulse rounded-full bg-slate-800" />
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="mb-4 h-4 w-28 animate-pulse rounded-full bg-slate-800" />
            <div className="space-y-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-12 animate-pulse rounded-xl bg-slate-800" />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

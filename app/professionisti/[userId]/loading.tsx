export default function ProfessionalLoading() {
    return (
      <main className="min-h-screen bg-slate-50">
        <header className="border-b bg-white">
          <div className="mx-auto max-w-7xl px-6 py-5">
            <div className="h-7 w-40 animate-pulse rounded bg-slate-200" />
          </div>
        </header>
  
        <section className="border-b bg-white">
          <div className="mx-auto max-w-7xl px-6 py-14">
            <div className="animate-pulse">
              <div className="h-4 w-44 rounded bg-slate-200" />
  
              <div className="mt-8 flex flex-col gap-8 lg:flex-row">
                <div className="h-40 w-40 rounded-3xl bg-slate-200" />
  
                <div className="flex-1 space-y-4">
                  <div className="h-12 max-w-lg rounded bg-slate-200" />
                  <div className="h-7 w-64 rounded bg-slate-200" />
                  <div className="h-5 w-48 rounded bg-slate-100" />
                </div>
  
                <div className="h-52 w-full rounded-3xl bg-slate-100 lg:max-w-sm" />
              </div>
            </div>
          </div>
        </section>
  
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1.5fr_0.8fr]">
          <div className="space-y-8">
            {Array.from({ length: 3 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-64 animate-pulse rounded-3xl bg-white shadow-sm"
                />
              )
            )}
          </div>
  
          <div className="space-y-6">
            {Array.from({ length: 3 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-48 animate-pulse rounded-3xl bg-white shadow-sm"
                />
              )
            )}
          </div>
        </div>
      </main>
    );
  }
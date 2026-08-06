function CardSkeleton() {
    return (
      <div className="animate-pulse overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="p-6">
          <div className="flex gap-4">
            <div className="h-24 w-24 rounded-2xl bg-slate-200" />
  
            <div className="flex-1 space-y-3 pt-2">
              <div className="h-5 w-3/4 rounded bg-slate-200" />
              <div className="h-4 w-1/2 rounded bg-slate-200" />
              <div className="h-4 w-2/3 rounded bg-slate-200" />
            </div>
          </div>
        </div>
  
        <div className="space-y-5 p-6">
          <div className="space-y-2">
            <div className="h-4 rounded bg-slate-200" />
            <div className="h-4 w-5/6 rounded bg-slate-200" />
          </div>
  
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-20 rounded-2xl bg-slate-100"
                />
              )
            )}
          </div>
  
          <div className="h-11 rounded-xl bg-slate-200" />
        </div>
      </div>
    );
  }
  
  export default function ProfessionalsLoading() {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="border-b bg-white">
          <div className="mx-auto max-w-7xl px-6 py-5">
            <div className="h-7 w-40 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
  
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-5 w-44 rounded bg-slate-200" />
            <div className="h-12 max-w-3xl rounded bg-slate-200" />
            <div className="h-6 max-w-2xl rounded bg-slate-100" />
          </div>
  
          <div className="mt-10 h-36 animate-pulse rounded-3xl bg-white shadow-sm" />
  
          <div className="mt-10 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map(
              (_, index) => (
                <CardSkeleton key={index} />
              )
            )}
          </div>
        </div>
      </main>
    );
  }
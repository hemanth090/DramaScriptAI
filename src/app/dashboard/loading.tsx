export default function DashboardLoading() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8">
          <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-muted/50 rounded mt-2 animate-pulse" />
        </div>

        <div className="rounded-xl border border-border bg-card p-6 mb-8 animate-pulse">
          <div className="h-6 w-32 bg-muted rounded mb-2" />
          <div className="h-4 w-48 bg-muted/50 rounded" />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card/50 p-4 animate-pulse"
            >
              <div className="h-8 w-16 bg-muted rounded mx-auto mb-1" />
              <div className="h-3 w-20 bg-muted/50 rounded mx-auto" />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-4 animate-pulse"
            >
              <div className="h-4 w-3/4 bg-muted rounded mb-2" />
              <div className="h-3 w-32 bg-muted/50 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GenerateLoading() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header skeleton */}
        <div className="mb-8 space-y-2">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-72 bg-muted/60 rounded animate-pulse" />
        </div>

        {/* Input form skeleton */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 mb-8">
          <div className="h-20 bg-muted/50 rounded-lg animate-pulse" />
          <div className="flex justify-end mt-4">
            <div className="h-10 w-40 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

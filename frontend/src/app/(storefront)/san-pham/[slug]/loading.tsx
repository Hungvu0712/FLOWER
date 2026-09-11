// docs/12 FE-04 — xem giải thích chung ở (storefront)/loading.tsx.
export default function Loading() {
  return (
    <div className="px-8 py-12 lg:px-16" aria-hidden="true">
      <div className="mb-8 h-4 w-56 animate-pulse rounded bg-border-soft" />

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        <div className="aspect-square animate-pulse rounded-2xl bg-border-soft" />

        <div className="space-y-4">
          <div className="h-4 w-24 animate-pulse rounded bg-border-soft" />
          <div className="h-10 w-3/4 animate-pulse rounded bg-border-soft" />
          <div className="h-8 w-40 animate-pulse rounded bg-border-soft" />
          <div className="space-y-2 pt-3">
            <div className="h-4 w-full animate-pulse rounded bg-border-soft" />
            <div className="h-4 w-full animate-pulse rounded bg-border-soft" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-border-soft" />
          </div>
          <div className="h-12 w-48 animate-pulse rounded-full bg-border-soft" />
        </div>
      </div>
    </div>
  );
}

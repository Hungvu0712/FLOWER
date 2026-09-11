import { ProductGridSkeleton } from '@/components/storefront/ProductCardSkeleton';

// docs/12 FE-04 — xem giải thích chung ở (storefront)/loading.tsx.
export default function Loading() {
  return (
    <div>
      <section className="bg-rose-light px-8 py-14 lg:px-16" aria-hidden="true">
        <div className="h-4 w-32 animate-pulse rounded bg-white/70" />
        <div className="mt-4 h-10 w-72 animate-pulse rounded bg-white/70" />
        <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded bg-white/70" />
      </section>

      <section className="px-8 py-14 lg:px-16">
        <ProductGridSkeleton />
      </section>
    </div>
  );
}

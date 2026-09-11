import { ProductGridSkeleton } from '@/components/storefront/ProductCardSkeleton';

// docs/12 FE-04: Next.js tự hiện file này (bọc Suspense) trong lúc StorefrontHomePage (Server
// Component) đang `await` categories + sản phẩm — trước đây trang trắng hoàn toàn lúc tải, giờ giữ
// đúng khung layout (hero tĩnh không cần khung xương, chỉ khung xương phần PHỤ THUỘC dữ liệu).
export default function Loading() {
  return (
    <>
      <section className="flex flex-col items-center gap-14 px-8 pt-14 pb-20 lg:flex-row lg:px-16 lg:pt-20 lg:pb-28">
        <div className="flex-1 space-y-6" aria-hidden="true">
          <div className="h-7 w-40 animate-pulse rounded-full bg-border-soft" />
          <div className="space-y-3">
            <div className="h-12 w-full max-w-sm animate-pulse rounded bg-border-soft" />
            <div className="h-12 w-2/3 max-w-xs animate-pulse rounded bg-border-soft" />
          </div>
          <div className="h-4 w-full max-w-md animate-pulse rounded bg-border-soft" />
          <div className="h-4 w-3/4 max-w-md animate-pulse rounded bg-border-soft" />
        </div>
        <div className="flex flex-1 justify-center">
          <div className="h-80 w-80 animate-pulse rounded-[2.5rem] bg-border-soft lg:h-[26rem] lg:w-[26rem]" />
        </div>
      </section>

      <section className="px-8 pb-20 lg:px-16">
        <div className="h-7 w-40 animate-pulse rounded bg-border-soft" aria-hidden="true" />
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl bg-border-soft/70"
              aria-hidden="true"
            />
          ))}
        </div>
      </section>

      <section className="px-8 pb-24 lg:px-16">
        <div className="mb-8 h-8 w-64 animate-pulse rounded bg-border-soft" aria-hidden="true" />
        <ProductGridSkeleton />
      </section>
    </>
  );
}

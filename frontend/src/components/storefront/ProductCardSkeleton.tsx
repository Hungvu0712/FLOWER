// docs/12 FE-04: khung xương cho lưới sản phẩm khi Server Component đang fetch dữ liệu — dùng ở mọi
// `loading.tsx` có lưới ProductCard, để trang không "nhảy" layout lúc dữ liệu tải xong (kích thước
// khung xương khớp đúng ProductCard thật, xem components/storefront/ProductCard.tsx).
export function ProductCardSkeleton() {
  return (
    <div
      className="flex flex-col gap-3.5 rounded-2xl border border-border-soft/70 bg-white p-5 shadow-sm"
      aria-hidden="true"
    >
      <div className="aspect-square animate-pulse rounded-2xl bg-border-soft" />
      <div className="space-y-2">
        <div className="h-3 w-16 animate-pulse rounded bg-border-soft" />
        <div className="h-5 w-3/4 animate-pulse rounded bg-border-soft" />
        <div className="h-4 w-full animate-pulse rounded bg-border-soft" />
      </div>
      <div className="mt-auto flex items-center justify-between">
        <div className="h-6 w-20 animate-pulse rounded bg-border-soft" />
        <div className="h-9 w-9 animate-pulse rounded-full bg-border-soft" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

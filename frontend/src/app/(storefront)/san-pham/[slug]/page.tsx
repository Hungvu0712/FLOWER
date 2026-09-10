import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/storefront/ProductCard";
import { ProductGallery } from "@/components/storefront/ProductGallery";
import { AddToCartControls } from "@/components/storefront/AddToCartControls";
import { formatVnd } from "@/lib/currency";
import { HOTLINE, ZALO_LINK } from "@/lib/contact-info";
import {
  getStorefrontProductBySlug,
  getStorefrontProducts,
} from "@/lib/storefront-api";

// Next.js 16: `params` là Promise trong Server Component route động — phải `await` trước khi dùng.
export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getStorefrontProductBySlug(slug);
  if (!product) notFound();

  // Sản phẩm liên quan — cùng danh mục, loại trừ chính nó. Không có danh mục thì bỏ qua khối này
  // thay vì lấy tạm sản phẩm ngẫu nhiên (dễ gây hiểu nhầm "liên quan" trong khi không liên quan gì).
  const related = product.category
    ? (
        await getStorefrontProducts({
          categoryId: product.category.id,
          limit: 5,
        })
      ).filter((p) => p.id !== product.id)
    : [];

  return (
    <div className="px-8 py-12 lg:px-16">
      <nav className="mb-8 text-sm text-ink-muted">
        <Link href="/" className="hover:text-rose">
          Trang chủ
        </Link>
        {product.category && (
          <>
            <span className="mx-2">/</span>
            <Link
              href={`/danh-muc/${product.category.slug}`}
              className="hover:text-rose"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        <ProductGallery images={product.images} productName={product.name} />

        <div>
          {product.category && (
            <Link
              href={`/danh-muc/${product.category.slug}`}
              className="text-sm font-semibold tracking-widest text-rose uppercase hover:text-rose-dark"
            >
              {product.category.name}
            </Link>
          )}
          <h1 className="mt-3 font-display text-4xl font-semibold text-ink">
            {product.name}
          </h1>
          <p className="mt-4 text-3xl font-semibold text-rose">
            {formatVnd(product.basePrice)}
          </p>

          {product.description && (
            // Mô tả đã được sanitize (allowlist thẻ, KHÔNG thuộc tính) ở thời điểm LƯU trên backend
            // (xem sanitizeHtml.ts / docs/modules/domain-products.md) — an toàn để render trực tiếp,
            // không cần sanitize lại lần 2 ở đây.
            <div
              className="prose mt-7 max-w-none text-ink-soft [&_blockquote]:border-l-2 [&_blockquote]:border-rose/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:mt-5 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_h3]:mt-4 [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-ink [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          )}

          <div className="mt-9">
            <AddToCartControls
              productId={product.id}
              name={product.name}
              slug={product.slug}
              basePrice={product.basePrice}
              image={product.images[0]?.file.url ?? null}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
            <a href={`tel:${HOTLINE}`} className="inline-flex items-center gap-1.5 hover:text-rose">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 5.5c0-1.1.9-2 2-2h2.2c.5 0 .95.35 1.06.85l.9 4c.1.45-.06.9-.4 1.2l-1.7 1.4a13 13 0 0 0 5.9 5.9l1.4-1.7c.3-.34.75-.5 1.2-.4l4 .9c.5.1.85.56.85 1.06V19c0 1.1-.9 2-2 2h-1C10.8 21 3 13.2 3 3.6v-1Z" />
              </svg>
              Hoặc gọi đặt nhanh
            </a>
            <a
              href={ZALO_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-rose"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15.5a2 2 0 0 1-2 2H8l-5 4V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9.5Z" />
              </svg>
              Nhắn Zalo hỏi thêm
            </a>
          </div>

          {/* Dải cam kết — đưa các ý bán hàng chính lên NGAY cạnh nút mua, thay vì chôn ở cuối trang */}
          <dl className="mt-8 grid grid-cols-1 gap-4 border-t border-border-soft pt-6 sm:grid-cols-3">
            {[
              { label: 'Giao đúng hẹn', desc: 'Chọn khung giờ khi đặt' },
              { label: 'Hoa tươi mỗi ngày', desc: 'Cắm theo đơn, không tồn kho' },
              { label: 'Thanh toán khi nhận', desc: 'Không cần chuyển khoản trước' },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-2.5">
                <svg className="mt-0.5 h-4 w-4 flex-none text-rose" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polyline points="4 12 9 17 20 6" />
                </svg>
                <div>
                  <dt className="text-sm font-semibold text-ink">{item.label}</dt>
                  <dd className="text-xs text-ink-muted">{item.desc}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24 border-t border-border-soft pt-14">
          <p className="text-sm font-semibold tracking-widest text-rose uppercase">Cùng danh mục</p>
          <h2 className="mt-2 mb-8 font-display text-3xl font-semibold text-ink">
            Sản phẩm liên quan
          </h2>
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4">
            {related.slice(0, 4).map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

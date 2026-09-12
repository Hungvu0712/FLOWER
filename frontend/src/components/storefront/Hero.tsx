'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { DEFAULT_STOREFRONT_SITE_CONTENT, type StorefrontSiteContent } from '@/lib/storefront-api';
import { HeroPetals } from './HeroPetals';

// Hero storefront — layout/typography/màu GIỮ NGUYÊN 100% so với bản trước (xem git log). Điểm nâng
// cấp: lớp cánh hoa 3D (HeroPetals, canvas riêng, pointer-events: none, tuyệt đối không chặn CTA) +
// parallax rất nhẹ theo chuột cho khối ảnh bó hoa + `siteContent` (banner/hotline/giờ mở cửa) do
// page.tsx (Server Component) fetch sẵn truyền xuống — admin đổi qua /admin/site-content, không cần
// deploy lại. Tách khỏi page.tsx vì cần refs/useEffect cho parallax + mount Three.js.
export function Hero({
  siteContent = DEFAULT_STOREFRONT_SITE_CONTENT,
}: {
  siteContent?: StorefrontSiteContent;
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const visualRef = useRef<HTMLDivElement | null>(null);
  const [visualIn, setVisualIn] = useState(false);

  useEffect(() => {
    // Ảnh bó hoa fade/slide nhẹ vào ~0.3s sau khi Hero load — tách khỏi lần render đầu (opacity-0)
    // bằng 1 tick để trigger transition CSS, không dùng animation library cho hiệu ứng 1 lần này.
    const timer = setTimeout(() => setVisualIn(true), 120);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative flex flex-col items-center gap-14 overflow-hidden px-8 pt-14 pb-20 lg:flex-row lg:px-16 lg:pt-20 lg:pb-28"
    >
      <HeroPetals sectionRef={sectionRef} visualRef={visualRef} />

      <div className="flex-1">
        <span className="inline-flex items-center gap-2 rounded-full border border-rose/15 bg-white/70 px-4 py-1.5 text-sm font-semibold text-rose shadow-sm backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-rose" />
          Hoa tươi mỗi ngày
        </span>
        <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] text-ink lg:text-7xl">
          Gửi trao
          <br />
          yêu thương
          <br />
          <span className="text-rose">qua từng cánh hoa</span>
        </h1>
        <p className="mt-7 max-w-md text-lg leading-relaxed text-ink-muted">
          Đặt hoa tươi giao tận nơi theo đúng ngày giờ bạn chọn — sinh nhật, khai trương, cưới hỏi
          hay chỉ đơn giản là một lời hỏi thăm.
        </p>
        <div className="mt-9 flex flex-wrap gap-4">
          <a
            href="#san-pham-noi-bat"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-rose px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose/25 transition-colors hover:bg-rose-dark"
          >
            Đặt hoa ngay
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </a>
          <a
            href="#danh-muc"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/15 bg-white/70 px-6 py-3 text-sm font-semibold text-ink-soft backdrop-blur-md transition-colors hover:border-ink-soft"
          >
            Xem bộ sưu tập
          </a>
        </div>
        <p className="mt-6 flex items-center gap-2 text-xs font-medium text-ink-muted">
          <svg
            className="h-3.5 w-3.5 text-rose"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5V12l3 2" />
          </svg>
          Mở cửa {siteContent.openHours} · Hotline {siteContent.hotline}
        </p>
      </div>

      <div className="flex flex-1 justify-center">
        <div
          ref={visualRef}
          style={{ willChange: 'transform' }}
          className={`relative flex h-80 w-80 items-center justify-center transition-all duration-700 ease-out lg:h-[26rem] lg:w-[26rem] ${
            visualIn ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          <div className="absolute inset-6 rounded-full bg-rose-light/80 blur-3xl" />

          <div className="relative h-full w-full overflow-hidden rounded-[2.5rem] border border-white/80 shadow-xl">
            <Image
              src={siteContent.heroBannerUrl ?? '/images/hero-bouquet.png'}
              alt="Bó hoa tươi Hoa Xinh"
              fill
              priority
              sizes="(min-width: 1024px) 26rem, 20rem"
              className="object-cover"
            />
          </div>

          {/* Thẻ nổi — nhấn 1 lợi ích cụ thể ngay trên hero, thay vì để khách tự đọc hết trang mới biết */}
          <div className="absolute -bottom-6 -left-6 flex items-center gap-3 rounded-2xl border border-border-soft bg-white px-5 py-4 shadow-xl shadow-ink/10 sm:-left-10">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-rose-light text-rose-dark">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
              >
                <path d="M3 6h2l2.4 12.4a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L22 8H6" />
                <circle cx="9" cy="21" r="1" />
                <circle cx="18" cy="21" r="1" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Thanh toán khi nhận hoa</p>
              <p className="text-xs text-ink-muted">Không cần chuyển khoản trước</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

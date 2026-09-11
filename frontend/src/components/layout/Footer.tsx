import Link from 'next/link';
import { FlowerIcon } from '@/components/ui/FlowerIcon';
import { BackToTopButton } from './BackToTopButton';
import {
  HOTLINE,
  HOTLINE_DISPLAY,
  ADDRESS,
  OPEN_HOURS,
  ZALO_LINK,
  ZALO_DISPLAY,
} from '@/lib/contact-info';

type FooterCategory = { id: string; name: string; slug: string };

const SUPPORT_LINKS = [
  { label: 'Hướng dẫn đặt hoa', href: '/lien-he' },
  { label: 'Chính sách giao hoa', href: '/' },
  { label: 'Chính sách đổi trả', href: '/' },
  { label: 'Chính sách bảo mật', href: '/' },
];

function ColumnHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="relative pb-3 text-sm font-semibold tracking-wide text-ink uppercase">
      {children}
      <span className="absolute bottom-0 left-0 h-0.5 w-7 bg-rose" />
    </h3>
  );
}

const PhoneIcon = (
  <svg
    className="h-full w-full"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
  >
    <path d="M4 5.5c0-1.1.9-2 2-2h2.2c.5 0 .95.35 1.06.85l.9 4c.1.45-.06.9-.4 1.2l-1.7 1.4a13 13 0 0 0 5.9 5.9l1.4-1.7c.3-.34.75-.5 1.2-.4l4 .9c.5.1.85.56.85 1.06V19c0 1.1-.9 2-2 2h-1C10.8 21 3 13.2 3 3.6v-1Z" />
  </svg>
);
const ZaloIcon = (
  <svg
    className="h-full w-full"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
  >
    <path d="M21 15.5a2 2 0 0 1-2 2H8l-5 4V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9.5Z" />
  </svg>
);
const PinIcon = (
  <svg
    className="h-full w-full"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
  >
    <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.3" />
  </svg>
);
const ClockIcon = (
  <svg
    className="h-full w-full"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
  >
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

function ContactRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-light p-2 text-rose-dark">
        {icon}
      </span>
      <span>
        <span className="block text-xs text-ink-muted">{label}</span>
        {href ? (
          <a
            href={href}
            target={href.startsWith('http') ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="font-semibold text-ink hover:text-rose"
          >
            {value}
          </a>
        ) : (
          <span className="block font-semibold text-ink">{value}</span>
        )}
      </span>
    </li>
  );
}

// Dùng chung cho storefront và trang tài khoản khách hàng (app/account/layout.tsx) — `categories`
// chỉ được layout storefront (Server Component) truyền xuống, giống hệt cách Nav.tsx đang làm, nên
// layout account không phải tự gọi API danh mục.
export function Footer({ categories = [] }: { categories?: FooterCategory[] }) {
  return (
    <footer className="border-t border-border-soft/70 bg-white/60 backdrop-blur-md">
      <div className="grid grid-cols-1 gap-10 px-8 py-16 sm:grid-cols-2 lg:grid-cols-4 lg:px-16">
        <div>
          <Link href="/" className="flex items-center gap-2.5">
            <FlowerIcon className="h-6 w-6" color="var(--color-rose)" />
            <span className="font-display text-xl font-semibold text-ink">Hoa Xinh</span>
          </Link>
          <p className="mt-1 text-xs font-semibold tracking-widest text-rose uppercase">
            Hoa tươi mỗi ngày
          </p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">
            Nhận đặt hoa bó, giỏ hoa, kệ khai trương và hoa chia buồn — cắm theo đơn, giao đúng ngày
            giờ bạn hẹn.
          </p>
          <div className="mt-5 flex gap-3">
            {/* Facebook/Instagram: TODO chưa có fanpage thật, chỉ để placeholder không dẫn đi đâu —
                khác Zalo (đã có số hotline mẫu nên link thật sự hoạt động). */}
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink-soft/40"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13.5 21v-7.2h2.4l.36-2.8h-2.76V9.1c0-.81.22-1.36 1.39-1.36h1.48V5.2c-.26-.03-1.14-.11-2.17-.11-2.15 0-3.62 1.31-3.62 3.72v2.08H8.2v2.8h2.38V21h2.92Z" />
              </svg>
            </span>
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink-soft/40"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="4" y="4" width="16" height="16" rx="5" />
                <circle cx="12" cy="12" r="3.5" />
              </svg>
            </span>
            <a
              href={ZALO_LINK}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Nhắn Zalo"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border p-2 text-ink-soft transition-colors hover:border-rose hover:text-rose"
            >
              {ZaloIcon}
            </a>
          </div>
        </div>

        <div>
          <ColumnHeading>Danh mục hoa</ColumnHeading>
          <ul className="mt-5 space-y-3 text-sm">
            {categories.length > 0 ? (
              categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/danh-muc/${cat.slug}`}
                    className="flex items-center gap-1.5 text-ink-muted hover:text-rose"
                  >
                    <span className="text-rose">›</span> {cat.name}
                  </Link>
                </li>
              ))
            ) : (
              <li className="text-ink-muted">Đang cập nhật</li>
            )}
          </ul>
        </div>

        <div>
          <ColumnHeading>Hỗ trợ khách hàng</ColumnHeading>
          <ul className="mt-5 space-y-3 text-sm">
            {SUPPORT_LINKS.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="flex items-center gap-1.5 text-ink-muted hover:text-rose"
                >
                  <span className="text-rose">›</span> {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <ColumnHeading>Liên hệ đặt hoa</ColumnHeading>
          <ul className="mt-5 space-y-4 text-sm">
            <ContactRow
              icon={PhoneIcon}
              label="Hotline đặt hoa"
              value={HOTLINE_DISPLAY}
              href={`tel:${HOTLINE}`}
            />
            <ContactRow icon={ZaloIcon} label="Zalo" value={ZALO_DISPLAY} href={ZALO_LINK} />
            <ContactRow icon={PinIcon} label="Địa chỉ" value={ADDRESS} />
            <ContactRow icon={ClockIcon} label="Giờ mở cửa" value={OPEN_HOURS} />
          </ul>
        </div>
      </div>

      <div className="border-t border-border-soft/70 px-8 py-6 lg:px-16">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-center text-xs text-ink-muted sm:text-left">
            © {new Date().getFullYear()} Hoa Xinh — Hoa tươi mỗi ngày. Hotline{' '}
            <a href={`tel:${HOTLINE}`} className="font-semibold text-rose hover:text-rose-dark">
              {HOTLINE_DISPLAY}
            </a>
          </p>
          <BackToTopButton />
        </div>
        <p className="mt-2 text-center text-[11px] text-ink-muted/70 sm:text-left">
          Thông tin liên hệ trên đây là dữ liệu demo dựng giao diện, sẽ được thay bằng thông tin
          thật trước khi vận hành chính thức.
        </p>
      </div>
    </footer>
  );
}

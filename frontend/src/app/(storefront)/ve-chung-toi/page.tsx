import Link from 'next/link';
import { FlowerIcon } from '@/components/ui/FlowerIcon';

// Nội dung tĩnh (không qua API) — TODO: thay bằng câu chuyện/nội dung THẬT của cửa hàng, đây chỉ là
// khung mẫu để dựng giao diện.
const VALUES = [
  {
    title: 'Hoa tươi mỗi ngày',
    desc: 'Nhập hoa mỗi sáng, không giữ hàng tồn qua đêm.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="3" />
        <circle cx="7" cy="13" r="3" />
        <circle cx="17" cy="13" r="3" />
        <path d="M12 11v9" />
      </svg>
    ),
  },
  {
    title: 'Ảnh thật trước khi giao',
    desc: 'Chụp đúng bó hoa sẽ giao, không dùng ảnh mẫu.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="5.5" width="18" height="14" rx="2" />
        <circle cx="12" cy="12.5" r="3.2" />
        <path d="M8 5.5 9.3 3.5h5.4L16 5.5" />
      </svg>
    ),
  },
  {
    title: 'Giao đúng giờ hẹn',
    desc: 'Chọn được khung giờ giao, đặc biệt quan trọng với hoa cưới.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </svg>
    ),
  },
  {
    title: 'Tư vấn tận tâm',
    desc: 'Gọi điện hoặc nhắn Zalo, luôn có người tư vấn mẫu phù hợp.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 15.5a2 2 0 0 1-2 2H8l-5 4V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9.5Z" />
      </svg>
    ),
  },
];

export default function AboutUsPage() {
  return (
    <div>
      <section className="flex flex-col items-center gap-6 bg-rose-light px-8 py-16 text-center lg:px-16 lg:py-20">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm">
          <FlowerIcon className="h-10 w-10" color="var(--color-rose)" />
        </div>
        <p className="text-sm font-semibold tracking-widest text-rose uppercase">Câu chuyện của chúng tôi</p>
        <h1 className="font-display text-4xl font-semibold text-ink lg:text-5xl">
          Hoa Xinh — nơi mỗi bó hoa
          <br />
          là một lời muốn nói
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-ink-muted">
          Chúng tôi tin rằng một bó hoa đúng lúc có thể thay cho ngàn lời nói. Từ những ngày đầu chỉ là
          một tiệm hoa nhỏ, Hoa Xinh lớn lên nhờ sự tin tưởng của khách hàng — những người gửi hoa
          chúc mừng, tỏ tình, hay đơn giản là một lời hỏi thăm.
        </p>
      </section>

      <section className="px-8 py-20 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <p className="text-center text-sm font-semibold tracking-widest text-rose uppercase">Cam kết</p>
          <h2 className="mt-2 text-center font-display text-3xl font-semibold text-ink">
            Điều làm nên Hoa Xinh
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="rounded-2xl border border-border-soft bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-light text-rose-dark">
                  {v.icon}
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold text-ink">{v.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink px-8 py-14 lg:px-16">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 text-center">
          <h2 className="font-display text-2xl font-semibold text-white lg:text-3xl">
            Sẵn sàng gửi một bó hoa hôm nay?
          </h2>
          <p className="max-w-md text-sm text-white/70">
            Chọn mẫu có sẵn hoặc gọi trực tiếp để được tư vấn mẫu phù hợp với dịp của bạn.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-rose px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose/30 transition-colors hover:bg-rose-dark"
            >
              Xem mẫu hoa
            </Link>
            <Link
              href="/lien-he"
              className="inline-flex items-center justify-center rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Liên hệ tư vấn
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

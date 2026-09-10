import { FlowerIcon } from '@/components/ui/FlowerIcon';

// Nội dung tĩnh (không qua API) — TODO: thay bằng câu chuyện/nội dung THẬT của cửa hàng, đây chỉ là
// khung mẫu để dựng giao diện.
const VALUES = [
  { title: 'Hoa tươi mỗi ngày', desc: 'Nhập hoa mỗi sáng, không giữ hàng tồn qua đêm.' },
  { title: 'Ảnh thật trước khi giao', desc: 'Chụp đúng bó hoa sẽ giao, không dùng ảnh mẫu.' },
  { title: 'Giao đúng giờ hẹn', desc: 'Chọn được khung giờ giao, đặc biệt quan trọng với hoa cưới.' },
  { title: 'Tư vấn tận tâm', desc: 'Gọi điện hoặc nhắn Zalo, luôn có người tư vấn mẫu phù hợp.' },
];

export default function AboutUsPage() {
  return (
    <div>
      <section className="flex flex-col items-center gap-8 px-8 py-16 text-center lg:px-16">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-light">
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

      <section className="px-8 pb-20 lg:px-16">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-2xl border border-border-soft bg-white p-6">
              <h3 className="font-display text-lg font-semibold text-ink">{v.title}</h3>
              <p className="mt-2 text-sm text-ink-muted">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

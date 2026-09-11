'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FlowerIcon } from '@/components/ui/FlowerIcon';

type GalleryImage = { id: string; file: { url: string } };

// 'use client' vì cần state đổi ảnh chính khi bấm thumbnail — bản thân dữ liệu ảnh vẫn do trang chi
// tiết (Server Component) fetch sẵn rồi truyền xuống qua prop `images`.
export function ProductGallery({
  images,
  productName,
}: {
  images: GalleryImage[];
  productName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex];

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-square overflow-hidden rounded-3xl border border-border-soft/70 bg-white shadow-sm">
        {active ? (
          <Image
            src={active.file.url}
            alt={productName}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            priority
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-rose-light/50">
            <FlowerIcon className="h-20 w-20" color="var(--color-rose)" />
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-3">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`Xem ảnh ${i + 1} của ${productName}`}
              aria-current={i === activeIndex}
              className={`h-20 w-20 overflow-hidden rounded-xl border-2 transition-colors ${
                i === activeIndex ? 'border-rose' : 'border-transparent hover:border-border'
              }`}
            >
              <Image
                src={img.file.url}
                alt=""
                width={80}
                height={80}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

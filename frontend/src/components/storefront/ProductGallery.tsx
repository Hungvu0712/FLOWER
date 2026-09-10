"use client";

import { useState } from "react";
import { FlowerIcon } from "@/components/ui/FlowerIcon";

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
      <div className="aspect-square overflow-hidden rounded-3xl border border-border-soft/70 bg-white shadow-sm">
        {active ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={active.file.url}
            alt={productName}
            className="h-full w-full object-cover"
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
                i === activeIndex
                  ? "border-rose"
                  : "border-transparent hover:border-border"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.file.url}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomeLoading from '@/app/(storefront)/loading';
import CategoryLoading from '@/app/(storefront)/danh-muc/[slug]/loading';
import ProductLoading from '@/app/(storefront)/san-pham/[slug]/loading';
import { ProductGridSkeleton } from '@/components/storefront/ProductCardSkeleton';

// docs/12 FE-04: `loading.tsx` không có timing/luồng dữ liệu để test qua tích hợp (Next.js tự
// quyết định khi nào hiện) — test ở đây chỉ xác nhận component tự nó render được, không throw, và có
// đúng số khung xương sản phẩm (chống lệch layout khi dữ liệu thật tải xong).
describe('loading.tsx skeletons (docs/12 FE-04)', () => {
  it('trang chủ: render được, không throw', () => {
    expect(() => render(<HomeLoading />)).not.toThrow();
  });

  it('trang danh mục: render được, không throw', () => {
    expect(() => render(<CategoryLoading />)).not.toThrow();
  });

  it('trang chi tiết sản phẩm: render được, không throw', () => {
    expect(() => render(<ProductLoading />)).not.toThrow();
  });

  it('ProductGridSkeleton mặc định hiện 8 khung xương (khớp limit trang chủ)', () => {
    const { container } = render(<ProductGridSkeleton />);
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBe(8);
  });

  it('ProductGridSkeleton nhận count tuỳ chỉnh', () => {
    const { container } = render(<ProductGridSkeleton count={3} />);
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBe(3);
  });
});

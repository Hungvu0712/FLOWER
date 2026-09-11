import { beforeEach, describe, expect, it, vi } from 'vitest';

// docs/12 FE-06: generateMetadata là hàm thuần (không JSX) nên test được trực tiếp như 1 hàm service —
// mock lib/storefront-api để không cần fetch thật.
vi.mock('@/lib/storefront-api', () => ({
  getStorefrontProductBySlug: vi.fn(),
  getStorefrontCategoryBySlug: vi.fn(),
  getStorefrontProducts: vi.fn().mockResolvedValue([]),
  getStorefrontCategories: vi.fn().mockResolvedValue([]),
}));

const { getStorefrontProductBySlug, getStorefrontCategoryBySlug } =
  await import('@/lib/storefront-api');
const { generateMetadata: generateProductMetadata } =
  await import('@/app/(storefront)/san-pham/[slug]/page');
const { generateMetadata: generateCategoryMetadata } =
  await import('@/app/(storefront)/danh-muc/[slug]/page');

beforeEach(() => {
  vi.mocked(getStorefrontProductBySlug).mockReset();
  vi.mocked(getStorefrontCategoryBySlug).mockReset();
});

describe('generateMetadata — trang sản phẩm (docs/12 FE-06)', () => {
  it('sản phẩm không tồn tại → title thông báo, không throw', async () => {
    vi.mocked(getStorefrontProductBySlug).mockResolvedValue(null);
    const meta = await generateProductMetadata({ params: Promise.resolve({ slug: 'khong-co' }) });
    expect(meta.title).toBe('Không tìm thấy sản phẩm');
  });

  it('có mô tả HTML → title = tên sản phẩm, description là bản TEXT THUẦN (đã strip HTML)', async () => {
    vi.mocked(getStorefrontProductBySlug).mockResolvedValue({
      id: '1',
      name: 'Bó hồng đỏ',
      slug: 'bo-hong-do',
      description: '<p>12 bông hồng <strong>nhập khẩu</strong></p>',
      basePrice: 450000,
      category: null,
      images: [
        { id: 'i1', sortOrder: 0, file: { id: 'f1', url: 'https://res.cloudinary.com/x.jpg' } },
      ],
    } as never);

    const meta = await generateProductMetadata({ params: Promise.resolve({ slug: 'bo-hong-do' }) });

    expect(meta.title).toBe('Bó hồng đỏ');
    expect(meta.description).toBe('12 bông hồng nhập khẩu');
    expect(meta.openGraph?.images).toEqual([{ url: 'https://res.cloudinary.com/x.jpg' }]);
  });

  it('không có mô tả → dùng description dự phòng chứa tên + giá, không để trống', async () => {
    vi.mocked(getStorefrontProductBySlug).mockResolvedValue({
      id: '1',
      name: 'Bó hồng đỏ',
      slug: 'bo-hong-do',
      description: null,
      basePrice: 450000,
      category: null,
      images: [],
    } as never);

    const meta = await generateProductMetadata({ params: Promise.resolve({ slug: 'bo-hong-do' }) });

    expect(meta.description).toContain('Bó hồng đỏ');
    expect(meta.openGraph?.images).toBeUndefined();
  });
});

describe('generateMetadata — trang danh mục (docs/12 FE-06)', () => {
  it('danh mục không tồn tại → title thông báo, không throw', async () => {
    vi.mocked(getStorefrontCategoryBySlug).mockResolvedValue(null);
    const meta = await generateCategoryMetadata({ params: Promise.resolve({ slug: 'khong-co' }) });
    expect(meta.title).toBe('Không tìm thấy danh mục');
  });

  it('có description thật → dùng nguyên văn, không ghi đè bằng fallback', async () => {
    vi.mocked(getStorefrontCategoryBySlug).mockResolvedValue({
      id: '1',
      name: 'Hoa cưới',
      slug: 'hoa-cuoi',
      description: 'Mô tả thật của danh mục',
      parentId: null,
      imageFile: null,
    });

    const meta = await generateCategoryMetadata({ params: Promise.resolve({ slug: 'hoa-cuoi' }) });

    expect(meta.title).toBe('Hoa cưới');
    expect(meta.description).toBe('Mô tả thật của danh mục');
  });

  it('description null → dùng fallback chứa tên danh mục', async () => {
    vi.mocked(getStorefrontCategoryBySlug).mockResolvedValue({
      id: '1',
      name: 'Hoa cưới',
      slug: 'hoa-cuoi',
      description: null,
      parentId: null,
      imageFile: null,
    });

    const meta = await generateCategoryMetadata({ params: Promise.resolve({ slug: 'hoa-cuoi' }) });

    expect(meta.description).toContain('hoa cưới');
  });
});

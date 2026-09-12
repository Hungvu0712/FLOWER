import type { Metadata } from 'next';
import { BlogPostCard } from '@/components/storefront/BlogPostCard';
import { getStorefrontBlogPosts } from '@/lib/storefront-api';

export const metadata: Metadata = {
  title: 'Blog — Hoa Xinh',
  description: 'Mẹo cắm hoa, gợi ý quà tặng và tin tức mới từ Hoa Xinh.',
};

export default async function BlogListPage() {
  const posts = await getStorefrontBlogPosts({ limit: 24 });

  return (
    <div className="px-8 py-12 lg:px-16">
      <p className="text-sm font-semibold tracking-widest text-rose uppercase">Hoa Xinh</p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink">Blog</h1>
      <p className="mt-3 max-w-xl text-sm text-ink-muted">
        Mẹo cắm hoa, gợi ý quà tặng theo dịp và tin tức mới từ cửa hàng.
      </p>

      {posts.length === 0 ? (
        <p className="mt-12 text-sm text-ink-muted">Chưa có bài viết nào.</p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <BlogPostCard key={post.id} post={post} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

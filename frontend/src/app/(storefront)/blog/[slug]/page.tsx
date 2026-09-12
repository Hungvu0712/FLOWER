import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { stripHtml } from '@/lib/html';
import { getStorefrontBlogPostBySlug } from '@/lib/storefront-api';

// docs/12 FE-06: title/description riêng cho SEO + chia sẻ link — giống san-pham/[slug]/page.tsx.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getStorefrontBlogPostBySlug(slug);
  if (!post) return { title: 'Không tìm thấy bài viết' };

  const description = post.excerpt ?? stripHtml(post.content).slice(0, 160);
  return {
    title: post.title,
    description,
    openGraph: {
      title: post.title,
      description,
      type: 'article',
      ...(post.thumbnailFile && { images: [{ url: post.thumbnailFile.url }] }),
    },
  };
}

export default async function BlogPostDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getStorefrontBlogPostBySlug(slug);
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-3xl px-8 py-12 lg:px-16">
      <nav className="mb-8 text-sm text-ink-muted">
        <Link href="/" className="hover:text-rose">
          Trang chủ
        </Link>
        <span className="mx-2">/</span>
        <Link href="/blog" className="hover:text-rose">
          Blog
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{post.title}</span>
      </nav>

      {post.publishedAt && (
        <p className="text-xs font-semibold tracking-wide text-rose/70 uppercase">
          {new Date(post.publishedAt).toLocaleDateString('vi-VN')}
          {post.author && ` · ${post.author.fullName}`}
        </p>
      )}
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink">{post.title}</h1>

      {post.thumbnailFile && (
        <div className="relative mt-8 aspect-16/9 overflow-hidden rounded-2xl">
          <Image
            src={post.thumbnailFile.url}
            alt={post.title}
            fill
            sizes="(min-width: 1024px) 60vw, 90vw"
            className="object-cover"
          />
        </div>
      )}

      {/* content đã được sanitize (allowlist thẻ, KHÔNG thuộc tính) ở thời điểm LƯU trên backend
          (xem sanitizeHtml.ts) — an toàn để render trực tiếp, không cần sanitize lại lần 2 ở đây,
          giống san-pham/[slug]/page.tsx. */}
      <div
        className="prose mt-8 max-w-none text-ink-soft [&_blockquote]:border-l-2 [&_blockquote]:border-rose/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:mt-5 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_h3]:mt-4 [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-ink [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      <div className="mt-12 border-t border-border-soft pt-8">
        <Link href="/blog" className="text-sm font-semibold text-rose hover:text-rose-dark">
          ← Xem thêm bài viết khác
        </Link>
      </div>
    </div>
  );
}

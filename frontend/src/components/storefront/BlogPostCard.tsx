import Link from 'next/link';
import Image from 'next/image';
import { FlowerIcon } from '@/components/ui/FlowerIcon';
import type { StorefrontBlogPost } from '@/lib/storefront-api';

const PLACEHOLDER_COLORS = ['#c95b52', '#d69a3a', '#c17a4a', '#c98fae', '#7a9b6e', '#b3856b'];

export function BlogPostCard({ post, index = 0 }: { post: StorefrontBlogPost; index?: number }) {
  const color = PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="flex flex-col gap-3.5 rounded-2xl border border-border-soft/70 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
    >
      {post.thumbnailFile ? (
        <div className="relative aspect-16/10 overflow-hidden rounded-2xl">
          <Image
            src={post.thumbnailFile.url}
            alt={post.title}
            fill
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 90vw"
            className="object-cover"
          />
        </div>
      ) : (
        <div
          className="flex aspect-16/10 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${color}22` }}
        >
          <FlowerIcon className="h-12 w-12" color={color} />
        </div>
      )}
      <div>
        {post.publishedAt && (
          <p className="text-xs font-semibold tracking-wide text-rose/70 uppercase">
            {new Date(post.publishedAt).toLocaleDateString('vi-VN')}
          </p>
        )}
        <h3 className="mt-0.5 text-lg font-semibold text-ink hover:text-rose">{post.title}</h3>
        {post.excerpt && <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{post.excerpt}</p>}
      </div>
    </Link>
  );
}

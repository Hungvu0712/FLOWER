import { ContactPageView } from '@/components/storefront/ContactPageView';
import { getStorefrontSiteContent } from '@/lib/storefront-api';

// Server Component CHỈ fetch siteContent (hotline/Zalo/địa chỉ/giờ mở cửa, admin sửa qua
// /admin/site-content) — phần form/tương tác nằm ở ContactPageView (Client Component), cùng pattern
// page.tsx → *View của don-hang/[id]/page.tsx → OrderConfirmationView.
export default async function ContactPage() {
  const siteContent = await getStorefrontSiteContent();
  return <ContactPageView siteContent={siteContent} />;
}

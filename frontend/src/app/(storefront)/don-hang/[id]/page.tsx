import { notFound } from 'next/navigation';
import { OrderConfirmationView } from '@/components/storefront/OrderConfirmationView';
import { getOrderById, getStorefrontSiteContent } from '@/lib/storefront-api';

// Public — `id` (UUID) đóng vai trò token tra cứu, xem ghi chú ở backend orders.routes.ts. Khách bookmark
// hoặc lưu lại link này để xem lại tình trạng đơn bất cứ lúc nào, không cần tài khoản.
// Server Component CHỈ fetch dữ liệu ban đầu — phần hiển thị (kể cả theo dõi trạng thái đơn REALTIME
// qua Socket.io khi admin/florist/shipper đổi trạng thái) nằm ở OrderConfirmationView (Client
// Component), xem docs/modules/domain-orders.md §10.
export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [order, siteContent] = await Promise.all([getOrderById(id), getStorefrontSiteContent()]);
  if (!order) notFound();

  return <OrderConfirmationView order={order} siteContent={siteContent} />;
}

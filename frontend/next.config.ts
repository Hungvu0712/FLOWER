import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // docs/12 FE-05: ảnh sản phẩm/danh mục/avatar đều lưu trên Cloudinary (module Files, xem
    // docs/modules/core-files.md) — next/image CHẶN domain ngoài whitelist theo mặc định để tránh
    // bị lợi dụng làm proxy tối ưu ảnh cho ảnh tuỳ ý (SSRF/lạm dụng băng thông). Không giới hạn
    // pathname theo cloud_name cụ thể — mọi tài khoản Cloudinary đều phục vụ qua chung host này.
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
};

export default nextConfig;

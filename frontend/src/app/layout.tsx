import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/Toaster";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// Design system "Soft Petal" — xem .design/flower-storefront (canvas đã chốt) và docs/04.
const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
});

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Hoa Xinh — Hoa tươi mỗi ngày",
  description: "Website bán hoa trực tuyến — đặt hoa tươi giao tận nơi theo đúng ngày giờ bạn chọn.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${cormorant.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-ivory text-ink font-sans">
        <Providers>
          {children}
          <Toaster />
          <ConfirmDialog />
        </Providers>
      </body>
    </html>
  );
}

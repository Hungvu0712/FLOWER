'use client';

import { useEffect } from 'react';

// Bắt lỗi ở chính ROOT LAYOUT (app/layout.tsx) — hiếm gặp hơn error.tsx (bắt lỗi route con), nhưng
// KHÔNG có file này thì lỗi ở layout gốc vẫn ra trang trắng (docs/12 FE-01). Next.js yêu cầu file
// này tự khai báo <html>/<body> vì nó THAY THẾ layout gốc — cố tình không import font/design system/
// Providers từ layout.tsx, vì chính những thứ đó có thể là nguyên nhân gây lỗi.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Lỗi ở root layout:', error);
  }, [error]);

  return (
    <html lang="vi">
      <body
        style={{
          display: 'flex',
          minHeight: '100vh',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '1rem',
          fontFamily: 'system-ui, sans-serif',
          background: '#fffaf5',
          color: '#2d2420',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Đã có lỗi xảy ra</h1>
        <p
          style={{ marginTop: '0.5rem', maxWidth: '24rem', fontSize: '0.875rem', color: '#6b5f57' }}
        >
          Trang gặp sự cố ngoài dự kiến. Vui lòng thử lại.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: '2rem',
            padding: '0.75rem 1.5rem',
            borderRadius: '9999px',
            border: 'none',
            background: '#ec4899',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Thử lại
        </button>
      </body>
    </html>
  );
}

'use client';

import Script from 'next/script';
import { useCallback, useRef } from 'react';
import { useLoginWithGoogle } from './auth.hooks';
import { getErrorMessage } from '@/lib/errors';

// Khai báo tối thiểu cho window.google — Google không xuất @types chính thức cho Identity Services.
interface GoogleAccountsId {
  initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

// Dùng Google Identity Services (ID token, không phải luồng redirect passport truyền thống) — backend
// verify token qua google-auth-library ở POST /api/v1/auth/google. Xem docs/02 §8.
export function GoogleLoginButton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const loginWithGoogle = useLoginWithGoogle();

  const initialize = useCallback(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google || !containerRef.current) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => loginWithGoogle.mutate(response.credential),
    });
    window.google.accounts.id.renderButton(containerRef.current, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      width: 320,
    });
  }, [loginWithGoogle]);

  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return null;

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={initialize} />
      <div ref={containerRef} className="flex justify-center" />
      {loginWithGoogle.isError && (
        <p className="mt-2 text-center text-xs text-red-600">
          {getErrorMessage(loginWithGoogle.error, 'Đăng nhập Google thất bại, thử lại.')}
        </p>
      )}
    </>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/account/profile', label: 'Hồ sơ' },
  { href: '/account/devices', label: 'Thiết bị đăng nhập' },
];

export function AccountTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-8 inline-flex gap-1 rounded-full border border-border-soft bg-white p-1">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
              active ? 'bg-rose text-white' : 'text-ink-soft hover:bg-rose-light'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

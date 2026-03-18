'use client';

import { IBM_Plex_Mono, DM_Sans } from 'next/font/google';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import '../dashboard/dashboard.css';

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-mono',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
});

const NAV_ITEMS = [
  { href: '/dashboard-demo', label: 'Overview', icon: '◎' },
  { href: '/dashboard-demo/payments', label: 'Payments', icon: '⬡' },
  { href: '/dashboard-demo/agents', label: 'Agents', icon: '◈' },
  { href: '/dashboard-demo/policies', label: 'Policies', icon: '⬢' },
  { href: '#', label: 'Wallet Coverage', icon: '◑', disabled: true },
  { href: '/dashboard-demo/export', label: 'Audit Export', icon: '⎋' },
];

export default function DashboardDemoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [clock, setClock] = useState('');

  // No auth check — demo mode

  // Live clock
  useEffect(() => {
    const update = () => {
      setClock(
        new Date().toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const pageTitle =
    NAV_ITEMS.find((n) => n.href === pathname)?.label ?? 'Dashboard';

  return (
    <div className={`dashboard ${plexMono.variable} ${dmSans.variable}`}>
      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar-logo">
          <span style={{ color: 'var(--dash-accent)' }}>$</span> kontext
        </div>
        <nav className="dash-sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.disabled ? '#' : item.href}
              className={`dash-nav-item ${
                pathname === item.href ? 'active' : ''
              } ${item.disabled ? 'disabled' : ''}`}
            >
              <span style={{ fontSize: 14, opacity: 0.7 }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="dash-sidebar-footer">
          <div className="dash-org-chip">
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--dash-green)',
              }}
            />
            org_legaci_demo
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="dash-main">
        <header className="dash-topbar">
          <span className="dash-topbar-title">{pageTitle}</span>
          <div className="dash-topbar-right">
            <div
              className="dash-live-badge"
              style={{ background: 'rgba(79, 110, 247, 0.15)', border: '1px solid rgba(79, 110, 247, 0.3)' }}
            >
              <span
                className="dash-live-dot"
                style={{ background: 'var(--dash-accent)', boxShadow: '0 0 6px var(--dash-accent)' }}
              />
              DEMO
            </div>
            <span className="dash-env-pill">sandbox</span>
            <span className="dash-clock">{clock}</span>
          </div>
        </header>
        <div className="dash-content">{children}</div>
      </div>
    </div>
  );
}

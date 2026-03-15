'use client';

import { IBM_Plex_Mono, DM_Sans } from 'next/font/google';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import './dashboard.css';

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
  { href: '/dashboard', label: 'Overview', icon: '◎' },
  { href: '/dashboard/payments', label: 'Payments', icon: '⬡' },
  { href: '/dashboard/agents', label: 'Agents', icon: '◈' },
  { href: '/dashboard/policies', label: 'Policies', icon: '⬢' },
  { href: '#', label: 'Wallet Coverage', icon: '◑', disabled: true },
  { href: '/dashboard/export', label: 'Audit Export', icon: '⎋' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [clock, setClock] = useState('');

  // Check auth
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = localStorage.getItem('kontext_api_key');
    if (!key && pathname !== '/dashboard/login') {
      window.location.href = '/dashboard/login';
    }
  }, [pathname]);

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

  // Login page: no sidebar/topbar
  if (pathname === '/dashboard/login') {
    return (
      <div className={`dashboard ${plexMono.variable} ${dmSans.variable}`}>
        {children}
      </div>
    );
  }

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
            <div className="dash-live-badge">
              <span className="dash-live-dot" />
              LIVE
            </div>
            <span className="dash-env-pill">production</span>
            <span className="dash-clock">{clock}</span>
          </div>
        </header>
        <div className="dash-content">{children}</div>
      </div>
    </div>
  );
}

'use client';

// Navigation.jsx
// Mobile: fixed bottom tab bar with icon + label (5 items).
// Desktop: fixed top bar with brand name left, links right.
//
// Both use bg-surface with a single border-stroke line — no shadows.
// Active item uses text-accent. Inactive uses text-dust.
// usePathname() drives the active state — updates on every route change.

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// ── Icon components ──────────────────────────────────────────────────────────
// Each accepts a className so the parent can control size and colour
// via Tailwind's text-* utilities (stroke="currentColor" picks it up).

function WardrobeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/>
    </svg>
  );
}

function StyleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  );
}

function BuyIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  );
}

function OutfitIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function FindIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

// ── Nav items ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    href:         '/wardrobe',
    label:        'Wardrobe',
    desktopLabel: 'Wardrobe',
    Icon:         WardrobeIcon,
  },
  {
    href:         '/features/outfit-pairing',
    label:        'Style',
    desktopLabel: 'What goes with this?',
    Icon:         StyleIcon,
  },
  {
    href:         '/features/buy-decision',
    label:        'Buy?',
    desktopLabel: 'Should I buy this?',
    Icon:         BuyIcon,
  },
  {
    href:         '/features/outfit-check',
    label:        'Outfit',
    desktopLabel: 'Is this outfit okay?',
    Icon:         OutfitIcon,
  },
  {
    href:         '/features/find-similar',
    label:        'Find',
    desktopLabel: 'Find something like this',
    Icon:         FindIcon,
  },
];

// ── Navigation ───────────────────────────────────────────────────────────────
export default function Navigation() {
  const pathname = usePathname();

  // Returns true if the current URL starts with this nav item's path.
  // The root check is exact-match only to avoid / matching everything.
  function isActive(href) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* ── MOBILE: fixed bottom tab bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-stroke md:hidden">
        <div className="flex items-center justify-around">
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 flex-1 py-3 px-1 transition-colors duration-150 ${
                  active ? 'text-accent' : 'text-dust'
                }`}
              >
                {/* Icon inherits text colour via currentColor */}
                <item.Icon className="h-5 w-5" />
                {/* Short label — font-body as per design system (no Syne in nav) */}
                <span className="font-body text-[10px] font-medium leading-none">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── DESKTOP: fixed top bar ── */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-surface border-b border-stroke">
        <div className="flex items-center justify-between w-full max-w-4xl mx-auto px-8 h-14">

          {/* Brand name — display font, links back to home */}
          <Link
            href="/"
            className="font-display text-sm font-bold text-ink hover:text-accent transition-colors duration-150"
          >
            StyleSense
          </Link>

          {/* Nav links — longer labels on desktop */}
          <div className="flex items-center gap-6">
            {NAV_ITEMS.map(item => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`font-body text-sm transition-colors duration-150 ${
                    active
                      ? 'text-accent font-medium'
                      : 'text-dust hover:text-ink'
                  }`}
                >
                  {item.desktopLabel}
                </Link>
              );
            })}
          </div>

        </div>
      </nav>
    </>
  );
}
// layout.jsx
// Root layout — wraps every single page in the app.
// Loads Syne and DM Sans from Google Fonts and applies global styles.

import { Syne, DM_Sans } from 'next/font/google';
import Navigation from '../components/Navigation';
import './globals.css';

// Syne — display font for eyebrow labels, verdicts, and page headings only
const syne = Syne({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-syne',   // registered as a CSS variable for Tailwind
});

// DM Sans — body font for all other UI text
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-dm-sans', // registered as a CSS variable for Tailwind
});

export const metadata = {
  title: 'StyleSense',
  description: 'Your AI personal stylist',
};

export default function RootLayout({ children }) {
  return (
    // Both CSS variables applied to <html> so every component can use them
    <html lang="en" className={`${syne.variable} ${dmSans.variable}`}>
      {/*
        font-body    → DM Sans as the default typeface for all text
        bg-background → warm stone background on every page
        min-h-screen  → background fills the full viewport height
        pb-20         → clears the fixed mobile bottom tab bar
        md:pb-0       → cancels bottom padding on desktop (no bottom nav there)
        md:pt-14      → clears the fixed desktop top nav bar (h-14 = 56px)
      */}
      <body className="font-body bg-background min-h-screen pb-20 md:pb-0 md:pt-14">
        <Navigation />
        {children}
      </body>
    </html>
  );
}
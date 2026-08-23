import type { Metadata } from 'next';
import { Instrument_Serif, Space_Grotesk } from 'next/font/google';
import { siteConfig } from '@/src/config/site';
import './globals.css';

const display = Instrument_Serif({
  variable: '--font-display',
  subsets: ['latin'],
  weight: '400',
});

const sans = Space_Grotesk({
  variable: '--font-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: `${siteConfig.name} — Independent film in ${siteConfig.city.name}`,
  description: `${siteConfig.description} ${siteConfig.city.name}, ${siteConfig.city.region}.`,
  openGraph: {
    title: siteConfig.name,
    description: `${siteConfig.description} ${siteConfig.city.name}, ${siteConfig.city.region}.`,
    type: 'website',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: 'Puget Screen — Independent film around the Sound' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: `${siteConfig.description} ${siteConfig.city.name}, ${siteConfig.city.region}.`,
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable}`}>{children}</body>
    </html>
  );
}

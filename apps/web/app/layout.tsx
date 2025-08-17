import './globals.css';
import { Inter } from 'next/font/google';
import { Shell } from '@/components/layout/shell';
import { AuthProvider } from '@/lib/auth';
import { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Kudjo - Connect & Earn',
    template: '%s | Kudjo'
  },
  description: 'Generate and track content coupons effortlessly. Connect businesses with influencers through automated coupon generation and performance tracking.',
  icons: {
    icon: '/favicon.ico'
  },
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://kudjo.app',
    title: 'Kudjo - Connect & Earn',
    description: 'Generate and track content coupons effortlessly',
    siteName: 'Kudjo'
  },
  twitter: {
    card: 'summary',
    title: 'Kudjo - Connect & Earn',
    description: 'Generate and track content coupons effortlessly'
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <Shell>{children}</Shell>
        </AuthProvider>
      </body>
    </html>
  );
} 
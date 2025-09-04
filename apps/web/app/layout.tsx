import './globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import { Toaster } from 'react-hot-toast';
import { RoutePrefetcher } from '@/components/route-prefetcher';
import { PerformanceProvider } from '@/components/providers/performance-provider';
import { LoadingProvider } from '@/components/global-loading-overlay';
import { Shell } from '@/components/layout/shell';
import { Metadata } from 'next';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap'
});

export const metadata: Metadata = {
  title: {
    default: 'Kudjo - Connect & Earn',
    template: '%s | Kudjo'
  },
  description: 'Generate and track content coupons effortlessly. Connect businesses with influencers through automated coupon generation and performance tracking.',
  icons: {
    icon: '/favicon.ico'
  },
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
          <LoadingProvider>
            <PerformanceProvider>
              <RoutePrefetcher />
              <Shell>
                {children}
              </Shell>
              <Toaster />
            </PerformanceProvider>
          </LoadingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
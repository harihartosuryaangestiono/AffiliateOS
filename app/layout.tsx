import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';
export const metadata: Metadata = {
  title: 'AffiliateOS — Affiliate Operations',
  description:
    'Your affiliate campaigns, creators, and marketplace performance in one focused workspace.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}

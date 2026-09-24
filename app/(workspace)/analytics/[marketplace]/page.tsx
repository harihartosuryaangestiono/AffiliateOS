import { notFound } from 'next/navigation';
import { MarketplaceAnalytics } from '@/components/analytics/marketplace-analytics';

export default async function AnalyticsMarketplacePage({
  params,
}: {
  params: Promise<{ marketplace: string }>;
}) {
  const { marketplace } = await params;
  const normalized = marketplace.toLowerCase();

  if (normalized !== 'shopee' && normalized !== 'tiktok') {
    notFound();
  }

  const market = normalized === 'shopee' ? 'Shopee' : 'TikTok';
  return <MarketplaceAnalytics market={market} />;
}

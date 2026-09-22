export type ReportTemplate = {
  id: string;
  version: string;
  name: string;
  marketplaces: string[];
  periodType: 'Weekly' | 'Monthly' | 'Campaign';
  metricOrder: string[];
  sections: string[];
  exportFormats: ('xlsx' | 'pptx')[];
};

export const reportTemplates: ReportTemplate[] = [
  {
    id: 'internal-affiliate-weekly',
    version: '1.0.0',
    name: 'Internal Affiliate Weekly',
    marketplaces: ['Shopee', 'TikTok', 'Multi-platform'],
    periodType: 'Weekly',
    metricOrder: [
      'affiliateGmv',
      'orders',
      'quantity',
      'affiliatesWithSales',
      'commission',
      'roi',
    ],
    sections: [
      'KPI Summary',
      'Marketplace Performance',
      'Narratives',
      'Source Lineage',
    ],
    exportFormats: ['xlsx', 'pptx'],
  },
  {
    id: 'shopee-haleon-weekly',
    version: '1.0.0',
    name: 'Shopee Haleon Weekly',
    marketplaces: ['Shopee'],
    periodType: 'Weekly',
    metricOrder: [
      'storeRevenue',
      'affiliateGmv',
      'affiliateContribution',
      'quantity',
      'affiliatesWithSales',
      'asp',
      'commission',
      'roi',
    ],
    sections: ['Weekly Performance', 'Key Highlights', 'Source Lineage'],
    exportFormats: ['xlsx', 'pptx'],
  },
  {
    id: 'shopee-simba-weekly',
    version: '1.0.0',
    name: 'Shopee Simba Weekly',
    marketplaces: ['Shopee'],
    periodType: 'Weekly',
    metricOrder: [
      'storeRevenue',
      'affiliateGmv',
      'affiliateContribution',
      'totalAffiliates',
      'affiliatesWithSales',
      'quantity',
      'asp',
      'commission',
      'roi',
      'costRatio',
    ],
    sections: ['Weekly Performance', 'Key Highlights', 'Source Lineage'],
    exportFormats: ['xlsx', 'pptx'],
  },
  {
    id: 'tiktok-simba-weekly',
    version: '1.0.0',
    name: 'TikTok Simba Weekly',
    marketplaces: ['TikTok'],
    periodType: 'Weekly',
    metricOrder: [
      'storeRevenue',
      'affiliateGmv',
      'affiliateContribution',
      'totalAffiliates',
      'affiliatesWithSales',
      'quantity',
      'asp',
      'commission',
      'roi',
      'costRatio',
    ],
    sections: ['Weekly Performance', 'Key Highlights', 'Source Lineage'],
    exportFormats: ['xlsx', 'pptx'],
  },
  {
    id: 'monthly-recap',
    version: '1.0.0',
    name: 'Monthly Recap',
    marketplaces: ['Shopee', 'TikTok', 'Multi-platform'],
    periodType: 'Monthly',
    metricOrder: [
      'affiliateGmv',
      'orders',
      'quantity',
      'affiliatesWithSales',
      'commission',
      'roi',
    ],
    sections: [
      'Monthly Summary',
      'Marketplace Performance',
      'Narratives',
      'Source Lineage',
    ],
    exportFormats: ['xlsx', 'pptx'],
  },
  {
    id: 'campaign-peak-day',
    version: '1.0.0',
    name: 'Campaign / Peak Day Report',
    marketplaces: ['Shopee', 'TikTok', 'Multi-platform'],
    periodType: 'Campaign',
    metricOrder: [
      'affiliateGmv',
      'orders',
      'quantity',
      'affiliatesWithSales',
      'commission',
      'roi',
    ],
    sections: [
      'Campaign Results',
      'Key Highlights',
      'Next Action',
      'Source Lineage',
    ],
    exportFormats: ['xlsx', 'pptx'],
  },
];

export function templateFor(reportType: string, marketplace: string) {
  if (reportType === 'Haleon Weekly')
    return reportTemplates.find((item) => item.id === 'shopee-haleon-weekly')!;
  if (reportType === 'Monthly Recap')
    return reportTemplates.find((item) => item.id === 'monthly-recap')!;
  if (reportType === 'Campaign Report')
    return reportTemplates.find((item) => item.id === 'campaign-peak-day')!;
  if (marketplace === 'Shopee')
    return reportTemplates.find((item) => item.id === 'shopee-simba-weekly')!;
  if (marketplace === 'TikTok')
    return reportTemplates.find((item) => item.id === 'tiktok-simba-weekly')!;
  return reportTemplates[0];
}

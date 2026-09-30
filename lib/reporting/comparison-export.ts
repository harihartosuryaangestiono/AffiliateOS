import PptxGenJS from 'pptxgenjs';
import { money } from '@/lib/data/metrics';

export interface ComparisonReportData {
  reportName: string;
  marketplace: string;
  primaryPeriod: { start: string; end: string };
  comparePeriod: { start: string; end: string };
  metricsPrimary: {
    gmv: number;
    orders: number;
    units: number;
    activeCreators: number;
    commission: number;
    aov: number;
  };
  metricsCompare: {
    gmv: number;
    orders: number;
    units: number;
    activeCreators: number;
    commission: number;
    aov: number;
  };
  channelSplit: {
    shopee: { primaryGmv: number; compareGmv: number; primaryOrders: number; compareOrders: number };
    tiktok: { primaryGmv: number; compareGmv: number; primaryOrders: number; compareOrders: number };
  };
  topCampaigns: { name: string; primaryGmv: number; compareGmv: number }[];
  topCreators: { name: string; username: string; marketplace: string; primaryGmv: number }[];
  narrative: {
    highlights: string[];
    whatWentWell: string[];
    issues: string[];
    nextActions: string[];
  };
}

export async function generateComparisonPPTX(data: ComparisonReportData) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'AffiliateOS';
  pptx.company = 'AffiliateOS';
  pptx.title = data.reportName;

  const C = {
    navy: '0D1B35',
    royalBlue: '2563EB',
    lightBlue: 'EFF6FF',
    textDark: '0F172A',
    textMuted: '64748B',
    white: 'FFFFFF',
    green: '16A34A',
    lightGreen: 'DCFCE7',
    red: 'DC2626',
    border: 'E2E8F0',
  };

  const gmvGrowth = data.metricsCompare.gmv > 0
    ? ((data.metricsPrimary.gmv - data.metricsCompare.gmv) / data.metricsCompare.gmv) * 100
    : 100;
  const ordersGrowth = data.metricsCompare.orders > 0
    ? ((data.metricsPrimary.orders - data.metricsCompare.orders) / data.metricsCompare.orders) * 100
    : 100;

  // Slide 1: Cover Slide
  const slide1 = pptx.addSlide();
  slide1.background = { color: C.navy };
  slide1.addText('AffiliateOS Executive Report', {
    x: 1.0,
    y: 1.8,
    w: 11.3,
    h: 0.4,
    fontSize: 14,
    color: '93C5FD',
    bold: true,
  });
  slide1.addText(data.reportName, {
    x: 1.0,
    y: 2.3,
    w: 11.3,
    h: 1.2,
    fontSize: 32,
    color: C.white,
    bold: true,
  });
  slide1.addText(
    `Platform: ${data.marketplace}  |  Primary: ${data.primaryPeriod.start} to ${data.primaryPeriod.end}  |  Compare: ${data.comparePeriod.start} to ${data.comparePeriod.end}`,
    {
      x: 1.0,
      y: 3.7,
      w: 11.3,
      h: 0.5,
      fontSize: 14,
      color: 'CBD5E1',
    },
  );
  slide1.addText('Generated with AffiliateOS Intelligent Reporting Suite', {
    x: 1.0,
    y: 6.5,
    w: 11.3,
    h: 0.4,
    fontSize: 11,
    color: '64748B',
  });

  // Slide 2: Executive Summary & Comparison KPIs
  const slide2 = pptx.addSlide();
  slide2.background = { color: 'F8FAFC' };
  slide2.addText('Executive Performance Comparison', {
    x: 0.8,
    y: 0.6,
    w: 8.0,
    h: 0.4,
    fontSize: 22,
    bold: true,
    color: C.textDark,
  });
  slide2.addText(
    `Primary: ${data.primaryPeriod.start} — ${data.primaryPeriod.end} vs. Previous: ${data.comparePeriod.start} — ${data.comparePeriod.end}`,
    {
      x: 0.8,
      y: 1.05,
      w: 10.0,
      h: 0.3,
      fontSize: 12,
      color: C.textMuted,
    },
  );

  const kpis = [
    {
      label: 'Affiliate GMV',
      primary: money(data.metricsPrimary.gmv),
      compare: money(data.metricsCompare.gmv),
      growth: `${gmvGrowth >= 0 ? '+' : ''}${gmvGrowth.toFixed(1)}%`,
      isPositive: gmvGrowth >= 0,
    },
    {
      label: 'Total Orders',
      primary: data.metricsPrimary.orders.toLocaleString(),
      compare: data.metricsCompare.orders.toLocaleString(),
      growth: `${ordersGrowth >= 0 ? '+' : ''}${ordersGrowth.toFixed(1)}%`,
      isPositive: ordersGrowth >= 0,
    },
    {
      label: 'Selling Creators',
      primary: data.metricsPrimary.activeCreators.toString(),
      compare: data.metricsCompare.activeCreators.toString(),
      growth: `${data.metricsPrimary.activeCreators - data.metricsCompare.activeCreators >= 0 ? '+' : ''}${data.metricsPrimary.activeCreators - data.metricsCompare.activeCreators} creators`,
      isPositive: data.metricsPrimary.activeCreators >= data.metricsCompare.activeCreators,
    },
    {
      label: 'Avg Order Value (AOV)',
      primary: money(data.metricsPrimary.aov),
      compare: money(data.metricsCompare.aov),
      growth: `${data.metricsCompare.aov > 0 ? (((data.metricsPrimary.aov - data.metricsCompare.aov) / data.metricsCompare.aov) * 100).toFixed(1) : 0}%`,
      isPositive: data.metricsPrimary.aov >= data.metricsCompare.aov,
    },
  ];

  kpis.forEach((kpi, idx) => {
    const cardX = 0.8 + idx * 2.95;
    slide2.addShape(pptx.ShapeType.roundRect, {
      x: cardX,
      y: 1.5,
      w: 2.8,
      h: 2.0,
      rectRadius: 0.1,
      fill: { color: C.white },
      line: { color: C.border, width: 1 },
    });
    slide2.addText(kpi.label, {
      x: cardX + 0.2,
      y: 1.65,
      w: 2.4,
      h: 0.3,
      fontSize: 11,
      color: C.textMuted,
      bold: true,
    });
    slide2.addText(kpi.primary, {
      x: cardX + 0.2,
      y: 2.0,
      w: 2.4,
      h: 0.45,
      fontSize: 16,
      bold: true,
      color: C.textDark,
    });
    slide2.addText(`Prev: ${kpi.compare}`, {
      x: cardX + 0.2,
      y: 2.5,
      w: 2.4,
      h: 0.3,
      fontSize: 11,
      color: C.textMuted,
    });
    slide2.addText(kpi.growth, {
      x: cardX + 0.2,
      y: 2.85,
      w: 2.4,
      h: 0.35,
      fontSize: 12,
      bold: true,
      color: kpi.isPositive ? C.green : C.red,
    });
  });

  // Table of Channel Split
  slide2.addText('Marketplace Channel Split', {
    x: 0.8,
    y: 3.8,
    w: 6.0,
    h: 0.35,
    fontSize: 14,
    bold: true,
    color: C.textDark,
  });

  const channelTableRows = [
    [
      { text: 'Marketplace', options: { bold: true, fill: { color: 'F1F5F9' } } },
      { text: 'Primary GMV', options: { bold: true, fill: { color: 'F1F5F9' } } },
      { text: 'Compare GMV', options: { bold: true, fill: { color: 'F1F5F9' } } },
      { text: 'Primary Orders', options: { bold: true, fill: { color: 'F1F5F9' } } },
      { text: 'Compare Orders', options: { bold: true, fill: { color: 'F1F5F9' } } },
    ],
    [
      { text: 'Shopee Affiliate' },
      { text: money(data.channelSplit.shopee.primaryGmv) },
      { text: money(data.channelSplit.shopee.compareGmv) },
      { text: data.channelSplit.shopee.primaryOrders.toLocaleString() },
      { text: data.channelSplit.shopee.compareOrders.toLocaleString() },
    ],
    [
      { text: 'TikTok Shop Creator' },
      { text: money(data.channelSplit.tiktok.primaryGmv) },
      { text: money(data.channelSplit.tiktok.compareGmv) },
      { text: data.channelSplit.tiktok.primaryOrders.toLocaleString() },
      { text: data.channelSplit.tiktok.compareOrders.toLocaleString() },
    ],
  ];

  slide2.addTable(channelTableRows, {
    x: 0.8,
    y: 4.25,
    w: 11.6,
    h: 1.8,
    fontSize: 11,
    border: { color: C.border, pt: 0.8 },
    fontFace: 'Aptos',
  });

  // Slide 3: Top Growth Drivers & Narrative
  const slide3 = pptx.addSlide();
  slide3.background = { color: 'F8FAFC' };
  slide3.addText('Strategic Highlights & Growth Drivers', {
    x: 0.8,
    y: 0.6,
    w: 10.0,
    h: 0.4,
    fontSize: 22,
    bold: true,
    color: C.textDark,
  });

  // Highlights Box
  slide3.addShape(pptx.ShapeType.roundRect, {
    x: 0.8,
    y: 1.3,
    w: 5.6,
    h: 5.2,
    rectRadius: 0.1,
    fill: { color: C.white },
    line: { color: C.border, width: 1 },
  });
  slide3.addText('Executive Findings & Wins', {
    x: 1.1,
    y: 1.5,
    w: 5.0,
    h: 0.35,
    fontSize: 14,
    bold: true,
    color: C.royalBlue,
  });

  const highlightsText = data.narrative.whatWentWell.length
    ? data.narrative.whatWentWell.map((w) => `• ${w}`).join('\n\n')
    : '• Steady overall affiliate trajectory across active campaigns.\n\n• High conversion on hero SKUs during peak promotion hours.';

  slide3.addText(highlightsText, {
    x: 1.1,
    y: 2.0,
    w: 5.0,
    h: 4.2,
    fontSize: 11,
    color: C.textDark,
    valign: 'top',
  });

  // Action Items Box
  slide3.addShape(pptx.ShapeType.roundRect, {
    x: 6.8,
    y: 1.3,
    w: 5.6,
    h: 5.2,
    rectRadius: 0.1,
    fill: { color: C.white },
    line: { color: C.border, width: 1 },
  });
  slide3.addText('Recommended Next Actions', {
    x: 7.1,
    y: 1.5,
    w: 5.0,
    h: 0.35,
    fontSize: 14,
    bold: true,
    color: C.green,
  });

  const nextActionsText = data.narrative.nextActions.length
    ? data.narrative.nextActions.map((a) => `• ${a}`).join('\n\n')
    : '• Expand seeding to top-performing Tier-2 creators with verified engagement.\n\n• Re-stock inventory for upcoming mega campaign days.';

  slide3.addText(nextActionsText, {
    x: 7.1,
    y: 2.0,
    w: 5.0,
    h: 4.2,
    fontSize: 11,
    color: C.textDark,
    valign: 'top',
  });

  // Download directly in browser
  const cleanName = data.reportName.replace(/[^a-zA-Z0-9_-]/g, '_');
  await pptx.writeFile({ fileName: `${cleanName}.pptx` });
}

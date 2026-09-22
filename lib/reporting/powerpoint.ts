import PptxGenJS from 'pptxgenjs';
import type { ReportTemplate } from './templates.ts';
import {
  metricLabels,
  snapshotMetric,
  snapshotWithTemplate,
  type FrozenReportSnapshot,
} from './snapshot.ts';

const C = {
  navy: '0D1B35',
  blue: '1473E6',
  cyan: '28A9E0',
  green: '13A66A',
  red: 'E65B5B',
  pale: 'EDF5FC',
  text: '17243A',
  muted: '64748B',
  white: 'FFFFFF',
};
export async function buildPowerPointReport(input: {
  reportName: string;
  snapshot: FrozenReportSnapshot;
  template: ReportTemplate;
  finalizedAt: string;
}) {
  const snapshot = snapshotWithTemplate(input.snapshot, input.template),
    pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'AffiliateOS';
  pptx.subject = input.template.name;
  pptx.title = input.reportName;
  pptx.company = 'AffiliateOS';
  pptx.theme = { headFontFace: 'Aptos Display', bodyFontFace: 'Aptos' };
  const title = pptx.addSlide();
  title.background = { color: C.navy };
  title.addText(input.reportName, {
    x: 0.8,
    y: 2.35,
    w: 11.7,
    h: 0.7,
    fontFace: 'Aptos Display',
    fontSize: 28,
    bold: true,
    color: C.white,
    align: 'center',
    margin: 0,
  });
  title.addText(
    `${snapshot.marketplace} · ${snapshot.period.start} — ${snapshot.period.end}`,
    {
      x: 1,
      y: 3.15,
      w: 11.3,
      h: 0.35,
      fontSize: 13,
      color: 'B8C6D9',
      align: 'center',
      margin: 0,
    },
  );
  title.addText('AffiliateOS', {
    x: 0.55,
    y: 6.95,
    w: 2,
    h: 0.2,
    fontSize: 9,
    color: C.white,
    margin: 0,
  });
  const performance = pptx.addSlide();
  addHeader(
    performance,
    `${snapshot.marketplace} Affiliate Performance`,
    `${snapshot.period.start} — ${snapshot.period.end}`,
  );
  const metrics = input.template.metricOrder.slice(0, 10);
  const rows = metrics.map((key) => [
    { text: metricLabels[key] || key, options: { bold: true } },
    { text: formatMetric(key, snapshotMetric(snapshot, key)) },
  ]);
  performance.addTable(rows, {
    x: 0.65,
    y: 1.25,
    w: 7.1,
    h: 4.9,
    border: { type: 'solid', color: 'D7E2EE', pt: 0.7 },
    fill: { color: C.white },
    color: C.text,
    fontFace: 'Aptos',
    fontSize: 12,
    rowH: 0.43,
    margin: 0.08,
    colW: [4.5, 2.6],
  });
  performance.addShape(pptx.ShapeType.roundRect, {
    x: 8.1,
    y: 1.25,
    w: 4.55,
    h: 4.9,
    rectRadius: 0.05,
    fill: { color: 'F7FAFD' },
    line: { color: 'D7E2EE' },
  });
  performance.addText('Key Highlights', {
    x: 8.45,
    y: 1.55,
    w: 3.8,
    h: 0.35,
    fontSize: 16,
    bold: true,
    color: C.blue,
    margin: 0,
  });
  const notes = [
    snapshot.narrative?.what_went_well,
    snapshot.narrative?.issues,
    snapshot.narrative?.next_action,
  ]
    .filter(Boolean)
    .map(String);
  performance.addText(
    notes.length
      ? notes.map((value) => ({
          text: value,
          options: { bullet: { indent: 14 }, breakLine: true },
        }))
      : 'No narrative added.',
    {
      x: 8.45,
      y: 2.05,
      w: 3.75,
      h: 3.5,
      fontSize: 12,
      color: C.text,
      breakLine: false,
      valign: 'top',
      margin: 0.03,
      paraSpaceAfter: 12,
    },
  );
  addFooter(performance, 2);
  const narrative = pptx.addSlide();
  addHeader(
    narrative,
    'Weekly Review',
    `${input.template.name} · frozen ${input.finalizedAt.slice(0, 10)}`,
  );
  [
    ['What Went Well', 'what_went_well', C.green],
    ['Issues / Risks', 'issues', C.red],
    ['Next Action', 'next_action', C.blue],
  ].forEach(([label, key, color], index) => {
    const y = 1.2 + index * 1.75;
    narrative.addShape(pptx.ShapeType.roundRect, {
      x: 0.75,
      y,
      w: 11.85,
      h: 1.35,
      rectRadius: 0.05,
      fill: { color: 'F8FAFC' },
      line: { color: 'D7E2EE' },
    });
    narrative.addText(label, {
      x: 1,
      y: y + 0.2,
      w: 2.2,
      h: 0.3,
      bold: true,
      color,
      fontSize: 15,
      margin: 0,
    });
    narrative.addText(String(snapshot.narrative?.[key] || '—'), {
      x: 3.2,
      y: y + 0.2,
      w: 8.9,
      h: 0.85,
      fontSize: 12,
      color: C.text,
      margin: 0,
      valign: 'top',
      breakLine: false,
    });
  });
  addFooter(narrative, 3);
  const lineage = pptx.addSlide();
  addHeader(
    lineage,
    'Source Lineage',
    'Every exported value comes from this immutable report snapshot.',
  );
  const sourceRows = (snapshot.sources || [])
    .slice(0, 12)
    .map((source) =>
      [
        String(source.marketplace || '—'),
        String(source.filename || source.source_type || 'Payment Order'),
        `${String(source.period_start || '—')} — ${String(source.period_end || '—')}`,
        String(source.status || '—'),
      ].map((text) => ({ text })),
    );
  lineage.addTable(
    [
      ['Marketplace', 'Source', 'Covered period', 'Status'].map((text) => ({
        text,
        options: { bold: true },
      })),
      ...sourceRows,
    ],
    {
      x: 0.65,
      y: 1.25,
      w: 12,
      h: Math.max(1.1, 0.44 * (sourceRows.length + 1)),
      border: { type: 'solid', color: 'D7E2EE', pt: 0.7 },
      color: C.text,
      fontSize: 10.5,
      margin: 0.06,
      bold: false,
      fill: { color: C.white },
      colW: [1.6, 4.6, 3.4, 2.4],
    },
  );
  addFooter(lineage, 4);
  return Buffer.from(
    (await pptx.write({ outputType: 'nodebuffer' })) as Buffer,
  );
}

function addHeader(slide: PptxGenJS.Slide, title: string, subtitle: string) {
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: 13.333,
    h: 0.12,
    fill: { color: C.blue },
    line: { color: C.blue },
  });
  slide.addText(title, {
    x: 0.65,
    y: 0.38,
    w: 8.8,
    h: 0.4,
    fontSize: 22,
    bold: true,
    color: C.blue,
    margin: 0,
  });
  slide.addText(subtitle, {
    x: 0.65,
    y: 0.83,
    w: 10,
    h: 0.22,
    fontSize: 10,
    color: C.muted,
    margin: 0,
  });
  slide.addText('AffiliateOS', {
    x: 11.2,
    y: 0.42,
    w: 1.45,
    h: 0.24,
    fontSize: 11,
    bold: true,
    color: C.text,
    align: 'right',
    margin: 0,
  });
}
function addFooter(slide: PptxGenJS.Slide, number: number) {
  slide.addText(`CONFIDENTIAL · ${number}`, {
    x: 10.9,
    y: 7.12,
    w: 1.8,
    h: 0.16,
    fontSize: 7,
    color: C.muted,
    align: 'right',
    margin: 0,
  });
}
function formatMetric(key: string, value: number | null) {
  if (value === null) return 'Source unavailable';
  if (
    ['affiliateGmv', 'commission', 'asp', 'storeRevenue', 'target'].includes(
      key,
    )
  )
    return `Rp${Math.round(value).toLocaleString('en-US')}`;
  if (
    [
      'costRatio',
      'affiliateContribution',
      'targetAchievement',
      'growth',
    ].includes(key)
  )
    return `${(Math.abs(value) <= 1 ? value * 100 : value).toFixed(1)}%`;
  if (key === 'roi') return `${value.toFixed(2)}x`;
  return Math.round(value).toLocaleString('en-US');
}

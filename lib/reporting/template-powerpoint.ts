import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import JSZip from 'jszip';
import type { ReportTemplate } from './templates.ts';
import { snapshotMetric, type FrozenReportSnapshot } from './snapshot.ts';
import type { ReportDataset } from './datamart.ts';
import { REPORT_PROFILES } from './contracts.ts';

const source = () =>
  path.join(process.cwd(), 'report-templates/private/anymind-haleon-weekly-v1.pptx');

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const money = (v: number | null | undefined) =>
  v === null || v === undefined
    ? 'Source unavailable'
    : new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v);

const pct = (v: number | null | undefined) =>
  v === null || v === undefined
    ? 'Source unavailable'
    : `${(v > 1 ? v : v * 100).toFixed(2)}%`;

function replaceTexts(xml: string, map: Record<number, string>) {
  let i = -1;
  return xml.replace(/<a:t(\s[^>]*)?>([\s\S]*?)<\/a:t>/g, (_all, attrs = '') => {
    i++;
    return `<a:t${attrs}>${esc(map[i] ?? '')}</a:t>`;
  });
}

function removeNonLogoPictures(xml: string) {
  return xml.replace(/<p:pic>[\s\S]*?<\/p:pic>/g, (block) =>
    /r:embed="rId3"/.test(block) ? block : '',
  );
}

export async function buildAnyMindPowerPoint(input: {
  reportName: string;
  snapshot: FrozenReportSnapshot;
  template: ReportTemplate;
  finalizedAt: string;
}) {
  const original = await fs.readFile(source());
  const hash = crypto.createHash('sha256').update(original).digest('hex');

  if (hash !== input.template.sourceHash) {
    throw Error('PowerPoint template integrity check failed.');
  }

  const zip = await JSZip.loadAsync(original);
  const s = input.snapshot;
  const ds = s.reportDataset as unknown as ReportDataset | undefined;

  const profileKey =
    input.template.periodType === 'Monthly' ? 'anymind-monthly' : 'anymind-weekly';
  const profile = REPORT_PROFILES[profileKey] || REPORT_PROFILES['anymind-weekly'];

  const includedSlides = new Set<number>([21]);

  // Determine slide inclusions based on profile and dataset readiness
  if (ds) {
    if (profile.supportedSlideNumbers.includes(16)) includedSlides.add(16);
    if (profile.supportedSlideNumbers.includes(17)) includedSlides.add(17);
    if (profile.supportedSlideNumbers.includes(18)) includedSlides.add(18);
    if (profile.supportedSlideNumbers.includes(20) && ds.peakDayComparison?.currentPeakDay) {
      includedSlides.add(20);
    }
    if (profile.supportedSlideNumbers.includes(31) && ds.activationPlanning?.initiatives.length) {
      includedSlides.add(31);
    }
  }

  // -------------------------------------------------------------
  // SLIDE 16 — Affiliate KPI Summary
  // -------------------------------------------------------------
  if (includedSlides.has(16)) {
    const raw16 = await zip.file('ppt/slides/slide16.xml')!.async('string');
    const roi = snapshotMetric(s, 'roi');
    const map16: Record<number, string> = {
      1: `Weekly Review ${s.period.start} to ${s.period.end}`,
      2: `${s.marketplace} Performance `,
      3: '(Snapshot)',
      4: input.reportName,
      7: 'Key Highlights',
      8: 'What Went Well:',
      9: ` ${String(s.narrative?.what_went_well || 'No narrative added.')}`,
      10: 'Issues / Risks:',
      11: ` ${String(s.narrative?.issues || 'No issues recorded.')}`,
      12: 'Next Action:',
      13: ` ${String(s.narrative?.next_action || 'No next action recorded.')}`,
      18: 'Metric',
      19: 'Affiliate GMV',
      20: 'Commission',
      21: 'ROI',
      22: 'Cost Ratio',
      23: 'Affiliates with Sales',
      24: 'Orders',
      25: 'Units',
      26: 'Snapshot',
      27: money(snapshotMetric(s, 'affiliateGmv')),
      28: money(snapshotMetric(s, 'commission')),
      29: roi === null ? 'Source unavailable' : roi.toFixed(2),
      30: pct(snapshotMetric(s, 'costRatio')),
      31: money(snapshotMetric(s, 'affiliatesWithSales')),
      32: money(snapshotMetric(s, 'orders')),
      33: 'Period',
      34: `${s.period.start} to ${s.period.end}`,
      35: 'Finalized',
      36: input.finalizedAt.slice(0, 10),
      37: 'Marketplace',
      38: s.marketplace,
      39: money(snapshotMetric(s, 'quantity')),
      40: 'Status',
      41: 'Final',
    };
    zip.file('ppt/slides/slide16.xml', replaceTexts(removeNonLogoPictures(raw16), map16));
  }

  // -------------------------------------------------------------
  // SLIDE 17 — Funnel Split
  // -------------------------------------------------------------
  if (includedSlides.has(17)) {
    const raw17 = await zip.file('ppt/slides/slide17.xml')!.async('string');
    const ch = ds?.funnel?.channels;
    const map17: Record<number, string> = {
      1: `Weekly Review ${s.period.start} to ${s.period.end}`,
      2: `${s.marketplace} Performance `,
      3: '(Lower Funnel)',
      4: String(s.narrative?.what_went_well || 'Channel split generated from normalized performance.'),
      7: 'Key Highlights',
      8: 'Live Performance:',
      9: ` Live GMV: Rp${money(ch?.live?.gmv)} (${money(ch?.live?.affiliates)} affiliates)`,
      10: 'Video Performance:',
      11: ` Video GMV: Rp${money(ch?.video?.gmv)} (${money(ch?.video?.affiliates)} affiliates)`,
      12: 'Share Link:',
      13: ` Share Link GMV: Rp${money(ch?.shareLink?.gmv)} (${money(ch?.shareLink?.affiliates)} affiliates)`,
      15: 'Live',
      16: 'NMV',
      17: money(ch?.live?.gmv),
      18: 'Affiliates',
      19: money(ch?.live?.affiliates),
      20: 'Video',
      21: 'NMV',
      22: money(ch?.video?.gmv),
      23: 'Affiliates',
      24: money(ch?.video?.affiliates),
      25: 'Share Link',
      26: 'NMV',
      27: money(ch?.shareLink?.gmv),
      28: 'Affiliates',
      29: money(ch?.shareLink?.affiliates),
    };
    zip.file('ppt/slides/slide17.xml', replaceTexts(removeNonLogoPictures(raw17), map17));
  }

  // -------------------------------------------------------------
  // SLIDE 18 — Brand Performance
  // -------------------------------------------------------------
  if (includedSlides.has(18)) {
    const raw18 = await zip.file('ppt/slides/slide18.xml')!.async('string');
    const brands = ds?.brandPerformance?.rows || [];
    const b0 = brands[0];
    const b1 = brands[1];
    const b2 = brands[2];

    const map18: Record<number, string> = {
      1: `Weekly Review ${s.period.start} to ${s.period.end}`,
      2: `${s.marketplace} Brand Performance`,
      3: '(Brand Breakdown)',
      4: `Brand attribution across ${brands.length} mapped brand(s).`,
      7: 'Key Highlights',
      8: b0 ? `${b0.brand_name}: Rp${money(b0.gmv)} (${pct(b0.contribution)} contribution)` : 'No brand data',
      9: b1 ? `${b1.brand_name}: Rp${money(b1.gmv)} (${pct(b1.contribution)} contribution)` : '',
      10: b2 ? `${b2.brand_name}: Rp${money(b2.gmv)} (${pct(b2.contribution)} contribution)` : '',
      17: b0?.brand_name || 'Brand 1',
      18: 'NMV',
      19: money(b0?.gmv),
      20: 'Affiliates',
      21: money(b0?.affiliates),
      22: b1?.brand_name || 'Brand 2',
      23: 'NMV',
      24: money(b1?.gmv),
      25: 'Affiliates',
      26: money(b1?.affiliates),
      27: b2?.brand_name || 'Brand 3',
      28: 'NMV',
      29: money(b2?.gmv),
      30: 'Affiliates',
      31: money(b2?.affiliates),
    };
    zip.file('ppt/slides/slide18.xml', replaceTexts(removeNonLogoPictures(raw18), map18));
  }

  // -------------------------------------------------------------
  // SLIDE 20 — Peak Day Comparison
  // -------------------------------------------------------------
  if (includedSlides.has(20)) {
    const raw20 = await zip.file('ppt/slides/slide20.xml')!.async('string');
    const pk = ds?.peakDayComparison;
    const c1 = pk?.comparisonPeakDay;
    const c2 = pk?.currentPeakDay;
    const g = pk?.growth;

    const map20: Record<number, string> = {
      1: `Weekly Review ${s.period.start} to ${s.period.end}`,
      2: `${s.marketplace} Performance `,
      3: '(Peak Day Comparison)',
      4: pk?.reason || 'Peak Day comparison.',
      6: 'Date',
      7: 'Affiliate NMV',
      8: 'Commission',
      9: 'ROI',
      10: 'Cost Ratio',
      11: 'Affiliates with Sales',
      12: c1?.name || 'Previous Peak',
      13: money(c1?.gmv),
      14: money(c1?.commission),
      15: c1?.roi ? c1.roi.toFixed(2) : '—',
      16: pct(c1?.costRatio),
      17: money(c1?.affiliates),
      18: c2?.name || 'Current Peak',
      19: money(c2?.gmv),
      20: money(c2?.commission),
      21: c2?.roi ? c2.roi.toFixed(2) : '—',
      22: pct(c2?.costRatio),
      23: money(c2?.affiliates),
      24: 'Growth',
      25: pct(g?.gmv),
      26: pct(g?.commission),
      27: '—',
      28: '—',
      29: pct(g?.affiliates),
      30: 'Key Highlights',
      31: `Peak Day NMV growth: ${pct(g?.gmv)}`,
      32: `Affiliates with sales growth: ${pct(g?.affiliates)}`,
    };
    zip.file('ppt/slides/slide20.xml', replaceTexts(removeNonLogoPictures(raw20), map20));
  }

  // -------------------------------------------------------------
  // SLIDE 21 — Operational Narrative
  // -------------------------------------------------------------
  const raw21 = await zip.file('ppt/slides/slide21.xml')!.async('string');
  const roi = snapshotMetric(s, 'roi');
  const map21: Record<number, string> = {
    1: `Weekly Review ${s.period.start} to ${s.period.end}`,
    2: `${s.marketplace} Performance `,
    3: '(Snapshot)',
    6: 'Manual Narratives',
    7: 'Affiliate GMV / Commission',
    8: `Rp${money(snapshotMetric(s, 'affiliateGmv'))} / Rp${money(snapshotMetric(s, 'commission'))}`,
    10: 'Orders / Units',
    11: `${money(snapshotMetric(s, 'orders'))} / ${money(snapshotMetric(s, 'quantity'))}`,
    12: `ROI ${roi === null ? '—' : roi.toFixed(2)} · Cost ratio ${pct(snapshotMetric(s, 'costRatio'))} · ${money(snapshotMetric(s, 'affiliatesWithSales'))} affiliate(s) with sales`,
    13: 'What Went Well:',
    14: ' ',
    15: String(s.narrative?.what_went_well || 'No narrative added.'),
    17: 'Issues / Risks:',
    18: ' ',
    19: String(s.narrative?.issues || 'No issues recorded.'),
    23: 'Next Action:',
    24: ' ',
    25: String(s.narrative?.next_action || 'No next action recorded.'),
    26: '',
  };
  zip.file('ppt/slides/slide21.xml', replaceTexts(removeNonLogoPictures(raw21), map21));

  // -------------------------------------------------------------
  // SLIDE 31 — Q4 Activation Plan
  // -------------------------------------------------------------
  if (includedSlides.has(31)) {
    const raw31 = await zip.file('ppt/slides/slide31.xml')!.async('string');
    const plan = ds?.activationPlanning;
    const init = plan?.initiatives?.[0];
    const map31: Record<number, string> = {
      1: 'Key Learnings and Initiatives',
      2: `${s.marketplace} Affiliates `,
      3: '(Activation Plan)',
      5: `Affiliate Plan - ${s.period.start.slice(0, 7)}`,
      6: 'Initiative',
      12: 'Total Creator Target',
      13: money(init?.creatorsTarget || plan?.totalCreators),
      32: 'Activation Breakdown:',
      37: init?.name || 'Core Campaign Activation',
      42: 'Target Creators',
      43: money(init?.creatorsTarget),
      131: 'Strategy:',
      132: String(init?.contentTarget || 'Execute creator activation plan.'),
    };
    zip.file('ppt/slides/slide31.xml', replaceTexts(removeNonLogoPictures(raw31), map31));
  }

  // -------------------------------------------------------------
  // PRUNE UNUSED SLIDES AND PACKAGING
  // -------------------------------------------------------------
  const slideNumRegexStr = Array.from(includedSlides).join('|');

  for (const name of Object.keys(zip.files)) {
    const isSlideXml = /^ppt\/slides\/slide(\d+)\.xml$/.exec(name);
    if (isSlideXml) {
      const num = parseInt(isSlideXml[1], 10);
      if (!includedSlides.has(num)) zip.remove(name);
    }
    const isSlideRels = /^ppt\/slides\/_rels\/slide(\d+)\.xml\.rels$/.exec(name);
    if (isSlideRels) {
      const num = parseInt(isSlideRels[1], 10);
      if (!includedSlides.has(num)) zip.remove(name);
    }
    const unusedMedia =
      name.startsWith('ppt/media/') &&
      !/^ppt\/media\/image(4|5|7)\.png$/.test(name);
    const unusedFolder =
      /^ppt\/(notesSlides|charts|embeddings|diagrams|comments)\//.test(name) ||
      name === 'ppt/commentAuthors.xml';

    if (unusedMedia || unusedFolder) zip.remove(name);
  }

  // Prune presentation.xml.rels
  const relsFile = zip.file('ppt/_rels/presentation.xml.rels');
  if (relsFile) {
    const rels = await relsFile.async('string');
    zip.file(
      'ppt/_rels/presentation.xml.rels',
      rels
        .replace(
          new RegExp(
            `<Relationship[^>]*Type="[^"]*\\/slide"[^>]*Target="slides\\/slide(?!(${slideNumRegexStr})\\.xml)[^"]+"[^>]*\\/>`,
            'g',
          ),
          '',
        )
        .replace(/<Relationship[^>]*Type="[^"]*\/commentAuthors"[^>]*\/>/g, ''),
    );
  }

  // Filter <p:sldIdLst> in presentation.xml
  const rels = await zip.file('ppt/_rels/presentation.xml.rels')!.async('string');
  const keepRels = new Set<string>();
  for (const n of Array.from(includedSlides)) {
    const match = rels.match(
      new RegExp(`<Relationship[^>]*Id="([^"]+)"[^>]*Target="slides/slide${n}\\.xml"[^>]*/>`),
    );
    if (match) keepRels.add(match[1]);
  }

  let pres = await zip.file('ppt/presentation.xml')!.async('string');
  pres = pres.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, (block) => {
    const matches = [...block.matchAll(/<p:sldId[^>]*r:id="([^"]+)"[^>]*\/>/g)];
    const filtered = matches.filter((x) => keepRels.has(x[1])).map((x) => x[0]);
    return `<p:sldIdLst>${filtered.join('')}</p:sldIdLst>`;
  });
  zip.file('ppt/presentation.xml', pres);

  // Update docProps/core.xml & app.xml
  const coreFile = zip.file('docProps/core.xml');
  if (coreFile) {
    const core = await coreFile.async('string');
    zip.file(
      'docProps/core.xml',
      core.replace(/<dc:title>[\s\S]*?<\/dc:title>/, `<dc:title>${esc(input.reportName)}</dc:title>`),
    );
  }

  const appFile = zip.file('docProps/app.xml');
  if (appFile) {
    const app = await appFile.async('string');
    zip.file(
      'docProps/app.xml',
      app
        .replace(/<Slides>\d+<\/Slides>/, `<Slides>${includedSlides.size}</Slides>`)
        .replace(/<Notes>\d+<\/Notes>/, '<Notes>0</Notes>'),
    );
  }

  // Update [Content_Types].xml
  const contentTypes = await zip.file('[Content_Types].xml')!.async('string');
  zip.file(
    '[Content_Types].xml',
    contentTypes.replace(/<Override\b[^>]*\/>/g, (tag) => {
      const part = tag.match(/PartName="([^"]+)"/)?.[1] || '';
      const slideMatch = /^\/ppt\/slides\/slide(\d+)\.xml$/.exec(part);
      if (slideMatch) {
        const num = parseInt(slideMatch[1], 10);
        if (!includedSlides.has(num)) return '';
      }
      const removedFolder =
        /^\/ppt\/(notesSlides|charts|embeddings|diagrams|comments)\//.test(part) ||
        part === '/ppt/commentAuthors.xml';
      return removedFolder ? '' : tag;
    }),
  );

  return Buffer.from(await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

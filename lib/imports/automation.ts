import { readReport } from './read-file.ts';
import { detectMapping } from './validation.ts';
import { normalizedHeader, parseDate, parseNumber, type RawRow } from './shared.ts';
import type { WorkspaceData, Marketplace, TikTokPerformance, ShopeePerformance } from '../../types/domain.ts';

export type DetectedFileType =
  | 'SHOPEE_PAYMENT_ORDER'
  | 'TIKTOK_PAYMENT_ORDER'
  | 'SHOPEE_AFFILIATE_REPORT'
  | 'TIKTOK_AFFILIATE_REPORT'
  | 'STOCK_EXPORT'
  | 'UNKNOWN';

export type DetectionConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type SchemaSignature = {
  signatureId: string;
  marketplace: Marketplace;
  type: DetectedFileType;
  version: string;
  requiredHeaders: string[];
  optionalHeaders: string[];
};

export type SchemaDriftReport = {
  hasDrift: boolean;
  signatureId?: string;
  addedColumns: string[];
  missingColumns: string[];
  warningMessage?: string;
};

export type FileAnalysis = {
  id: string;
  file: File;
  fileHash: string;
  fileSize: number;
  marketplace: Marketplace | 'Unknown';
  fileType: DetectedFileType;
  confidence: DetectionConfidence;
  schemaSignature?: string;
  schemaDrift: SchemaDriftReport;
  rows: RawRow[];
  headers: string[];
  periodStart: string | null;
  periodEnd: string | null;
  totalRows: number;
  validRowsCount: number;
  isExactDuplicate: boolean;
  duplicateImportId?: string;
  duplicateImportDate?: string;
  suggestedCampaignId?: string;
  suggestedBrandId?: string;
  mapping: Record<string, string>;
  status: 'READY' | 'NEEDS_REVIEW' | 'DUPLICATE' | 'ERROR';
  errorMessage?: string;
};

export type BatchSummary = {
  totalFiles: number;
  readyCount: number;
  needsReviewCount: number;
  duplicateCount: number;
  errorCount: number;
  files: FileAnalysis[];
};

export type ReconciliationResult = {
  newCount: number;
  existingUnchangedCount: number;
  updatedCount: number;
  conflictCount: number;
  details: string[];
};

export type WhatChangedSummary = {
  gmvDelta: number;
  newCreatorsWithSales: number;
  coverageEndDate: string;
  alertsChangedCount: number;
  hslRisksCount: number;
  stockRisksCount: number;
  summaryBulletPoints: string[];
};

export type DataCoverageInfo = {
  marketplace: Marketplace;
  coverageStart: string | null;
  coverageEnd: string | null;
  latestImportDate: string | null;
  missingDaysCount: number;
  isH2Ready: boolean;
  h2CutoffDate: string;
  statusLabel: string;
};

// Known schema signatures for marketplace exports
export const schemaSignatures: SchemaSignature[] = [
  {
    signatureId: 'shopee-payment-order-v1',
    marketplace: 'Shopee',
    type: 'SHOPEE_PAYMENT_ORDER',
    version: '1.0',
    requiredHeaders: ['Payment Order ID', 'Purchase Value(Rp)', 'Refund Amount(Rp)', 'Order Time'],
    optionalHeaders: ['Item Brand Commission(Rp)', 'Seller ID', 'SKU ID', 'Order Status'],
  },
  {
    signatureId: 'tiktok-payment-order-v1',
    marketplace: 'TikTok',
    type: 'TIKTOK_PAYMENT_ORDER',
    version: '1.0',
    requiredHeaders: ['Payment Order ID', 'Payment Amount', 'Payment time', 'Creator Username'],
    optionalHeaders: ['Est. standard commission payment', 'Product ID', 'SKU ID', 'Content Type', 'Order Status'],
  },
  {
    signatureId: 'shopee-affiliate-report-v1',
    marketplace: 'Shopee',
    type: 'SHOPEE_AFFILIATE_REPORT',
    version: '1.0',
    requiredHeaders: ['Date', 'Affiliate Username', 'Purchase Value', 'Orders'],
    optionalHeaders: ['Clicks', 'Conversion Rate', 'Commission'],
  },
  {
    signatureId: 'tiktok-affiliate-report-v1',
    marketplace: 'TikTok',
    type: 'TIKTOK_AFFILIATE_REPORT',
    version: '1.0',
    requiredHeaders: ['Date', 'TikTok Username', 'GMV', 'Orders'],
    optionalHeaders: ['Videos', 'Live Sessions', 'Commission'],
  },
  {
    signatureId: 'stock-export-v1',
    marketplace: 'Multi-platform',
    type: 'STOCK_EXPORT',
    version: '1.0',
    requiredHeaders: ['product_id', 'stock_quantity'],
    optionalHeaders: ['marketplace', 'snapshot_at'],
  },
];

/**
 * Compute SHA-256 fingerprint for a file blob
 */
export async function computeFileFingerprint(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Detect marketplace, file type, confidence, and schema drift from raw headers
 */
export function detectFileSchema(headers: string[]): {
  marketplace: Marketplace | 'Unknown';
  fileType: DetectedFileType;
  confidence: DetectionConfidence;
  signatureId?: string;
  drift: SchemaDriftReport;
} {
  const normHeaders = new Set(headers.map(normalizedHeader));

  let bestSig: SchemaSignature | null = null;
  let maxScore = 0;

  for (const sig of schemaSignatures) {
    const normReq = sig.requiredHeaders.map(normalizedHeader);
    const matches = normReq.filter((h) => normHeaders.has(h)).length;

    const score = normReq.length ? matches / normReq.length : 0;
    if (score > maxScore) {
      maxScore = score;
      bestSig = sig;
    }
  }

  // Also check standard mapping fallback if header matches
  if (!bestSig || maxScore < 0.4) {
    const ttScore = Object.values(detectMapping(headers, 'TikTok')).filter(Boolean).length;
    const shopeeScore = Object.values(detectMapping(headers, 'Shopee')).filter(Boolean).length;

    if (ttScore >= 3 || shopeeScore >= 3) {
      const isTT = ttScore >= shopeeScore;
      return {
        marketplace: isTT ? 'TikTok' : 'Shopee',
        fileType: isTT ? 'TIKTOK_PAYMENT_ORDER' : 'SHOPEE_PAYMENT_ORDER',
        confidence: ttScore >= 5 || shopeeScore >= 5 ? 'MEDIUM' : 'LOW',
        drift: {
          hasDrift: false,
          addedColumns: [],
          missingColumns: [],
        },
      };
    }

    return {
      marketplace: 'Unknown',
      fileType: 'UNKNOWN',
      confidence: 'LOW',
      drift: {
        hasDrift: false,
        addedColumns: [],
        missingColumns: [],
      },
    };
  }

  const confidence: DetectionConfidence = maxScore === 1.0 ? 'HIGH' : maxScore >= 0.6 ? 'MEDIUM' : 'LOW';

  const missingColumns = bestSig.requiredHeaders.filter(
    (h) => !normHeaders.has(normalizedHeader(h)),
  );

  const normSigAll = new Set([
    ...bestSig.requiredHeaders.map(normalizedHeader),
    ...bestSig.optionalHeaders.map(normalizedHeader),
  ]);
  const addedColumns = headers.filter((h) => !normSigAll.has(normalizedHeader(h)));

  const hasDrift = missingColumns.length > 0 || addedColumns.length > 0;
  const warningMessage = hasDrift
    ? `Marketplace export format appears to have changed. ${missingColumns.length ? `Missing: ${missingColumns.join(', ')}. ` : ''}${addedColumns.length ? `New: ${addedColumns.join(', ')}.` : ''}`
    : undefined;

  return {
    marketplace: bestSig.marketplace,
    fileType: bestSig.type,
    confidence,
    signatureId: bestSig.signatureId,
    drift: {
      hasDrift,
      signatureId: bestSig.signatureId,
      addedColumns,
      missingColumns,
      warningMessage,
    },
  };
}

/**
 * Scan rows to detect period coverage (earliest & latest date)
 */
export function extractPeriodCoverage(
  rows: RawRow[],
  mapping: Record<string, string>,
): { periodStart: string | null; periodEnd: string | null; validDatesCount: number } {
  const dates: string[] = [];
  const dateKey = mapping.date || Object.keys(rows[0] || {}).find((k) => /date|time/i.test(k));

  if (dateKey) {
    for (const r of rows) {
      const val = r[dateKey];
      if (val) {
        const parsed = parseDate(val);
        if (parsed) dates.push(parsed);
      }
    }
  }

  if (!dates.length) {
    return { periodStart: null, periodEnd: null, validDatesCount: 0 };
  }

  dates.sort();
  return {
    periodStart: dates[0],
    periodEnd: dates[dates.length - 1],
    validDatesCount: dates.length,
  };
}

/**
 * Analyze single file for drop preview
 */
export async function analyzeFile(
  file: File,
  data: WorkspaceData,
): Promise<FileAnalysis> {
  const fileHash = await computeFileFingerprint(file);

  // Check exact duplicate file in workspace imports history
  const duplicate = data.imports.find((j) => j.file_hash && j.file_hash === fileHash);
  const isExactDuplicate = !!duplicate;

  let rows: RawRow[] = [];
  let errorMessage: string | undefined;

  try {
    rows = await readReport(file);
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Could not read file';
  }

  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const schema = detectFileSchema(headers);

  const market = schema.marketplace !== 'Unknown' ? (schema.marketplace as 'TikTok' | 'Shopee') : undefined;
  const detectedMapping = market ? detectMapping(headers, market) : {};

  // Auto-assign campaign ID if unique or matched
  const candidateCampaign = data.entities.campaigns.find(
    (c) => market && [market, 'Multi-platform'].includes(String(c.marketplace)),
  );
  if (candidateCampaign) {
    detectedMapping.__campaign_id = candidateCampaign.id;
  }

  const period = extractPeriodCoverage(rows, detectedMapping);

  let status: FileAnalysis['status'] = 'READY';
  if (errorMessage) {
    status = 'ERROR';
  } else if (isExactDuplicate) {
    status = 'DUPLICATE';
  } else if (schema.confidence === 'LOW' || schema.drift.hasDrift || !detectedMapping.__campaign_id) {
    status = 'NEEDS_REVIEW';
  }

  return {
    id: crypto.randomUUID(),
    file,
    fileHash,
    fileSize: file.size,
    marketplace: schema.marketplace,
    fileType: schema.fileType,
    confidence: schema.confidence,
    schemaSignature: schema.signatureId,
    schemaDrift: schema.drift,
    rows,
    headers,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    totalRows: rows.length,
    validRowsCount: period.validDatesCount,
    isExactDuplicate,
    duplicateImportId: duplicate?.id,
    duplicateImportDate: duplicate?.created_at,
    suggestedCampaignId: candidateCampaign?.id,
    mapping: detectedMapping,
    status,
    errorMessage,
  };
}

/**
 * Analyze batch of dropped files
 */
export async function analyzeBatch(
  files: File[],
  data: WorkspaceData,
): Promise<BatchSummary> {
  const analyses = await Promise.all(files.map((f) => analyzeFile(f, data)));

  let readyCount = 0;
  let needsReviewCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;

  for (const a of analyses) {
    if (a.status === 'READY') readyCount++;
    else if (a.status === 'NEEDS_REVIEW') needsReviewCount++;
    else if (a.status === 'DUPLICATE') duplicateCount++;
    else if (a.status === 'ERROR') errorCount++;
  }

  return {
    totalFiles: files.length,
    readyCount,
    needsReviewCount,
    duplicateCount,
    errorCount,
    files: analyses,
  };
}

/**
 * Reconcile overlapping period records against existing workspace data
 */
export function reconcileOverlappingRows(
  rows: RawRow[],
  mapping: Record<string, string>,
  market: 'TikTok' | 'Shopee',
  data: WorkspaceData,
): ReconciliationResult {
  const existing = market === 'TikTok' ? data.tiktok_performance : data.shopee_performance;
  const accounts = market === 'TikTok' ? data.tiktok_accounts : data.shopee_accounts;

  const existingKeys = new Map<string, TikTokPerformance | ShopeePerformance>();
  for (const r of existing) {
    const key = `${r.date}|${r.account_id}|${r.campaign_id || ''}`;
    existingKeys.set(key, r);
  }

  let newCount = 0;
  let existingUnchangedCount = 0;
  let updatedCount = 0;
  const conflictCount = 0;
  const details: string[] = [];

  const dateKey = mapping.date || 'date';
  const userKey = mapping.username || 'username';
  const gmvKey = mapping.gmv || 'gmv';

  for (const row of rows) {
    const rawDate = parseDate(row[dateKey] || '');
    const rawUser = (row[userKey] || '').toLowerCase().replace(/^@/, '').trim();
    const gmvVal = parseNumber(row[gmvKey] || '0');

    if (!rawDate || !rawUser) continue;

    const acc = accounts.find((a) => a.username.toLowerCase().replace(/^@/, '').trim() === rawUser);
    if (!acc) continue;

    const campaignId = mapping.__campaign_id || '';
    const key = `${rawDate}|${acc.id}|${campaignId}`;

    let prev = existingKeys.get(key);
    if (!prev) {
      prev = Array.from(existingKeys.values()).find((r) => r.date === rawDate && r.account_id === acc.id);
    }
    if (!prev) {
      newCount++;
    } else if (prev.gmv === gmvVal) {
      existingUnchangedCount++;
    } else {
      updatedCount++;
      details.push(`Updated ${acc.username} on ${rawDate}: GMV changed from Rp${prev.gmv.toLocaleString()} to Rp${gmvVal.toLocaleString()}`);
    }
  }

  return {
    newCount,
    existingUnchangedCount,
    updatedCount,
    conflictCount,
    details,
  };
}

/**
 * Compute deterministic "What Changed?" summary post-import
 */
export function computeWhatChangedSummary(
  beforeData: WorkspaceData,
  afterData: WorkspaceData,
  market: 'TikTok' | 'Shopee',
): WhatChangedSummary {
  const beforePerf = market === 'TikTok' ? beforeData.tiktok_performance : beforeData.shopee_performance;
  const afterPerf = market === 'TikTok' ? afterData.tiktok_performance : afterData.shopee_performance;

  const beforeGmv = beforePerf.reduce((s, r) => s + r.gmv, 0);
  const afterGmv = afterPerf.reduce((s, r) => s + r.gmv, 0);
  const gmvDelta = Math.max(0, afterGmv - beforeGmv);

  const beforeCreators = new Set(beforePerf.filter((r) => r.orders > 0).map((r) => r.account_id));
  const afterCreators = new Set(afterPerf.filter((r) => r.orders > 0).map((r) => r.account_id));
  const newCreatorsWithSales = Math.max(0, afterCreators.size - beforeCreators.size);

  const allDates = afterPerf.map((r) => r.date).sort();
  const coverageEndDate = allDates.length ? allDates[allDates.length - 1] : new Date().toISOString().slice(0, 10);

  const summaryBulletPoints: string[] = [];

  if (gmvDelta > 0) {
    summaryBulletPoints.push(`Affiliate GMV: +Rp ${Math.round(gmvDelta).toLocaleString('id-ID')} new imported coverage`);
  }
  if (newCreatorsWithSales > 0) {
    summaryBulletPoints.push(`Creators with sales: +${newCreatorsWithSales} newly active creators`);
  }
  summaryBulletPoints.push(`${market} data coverage now available through ${coverageEndDate}`);

  return {
    gmvDelta,
    newCreatorsWithSales,
    coverageEndDate,
    alertsChangedCount: 0,
    hslRisksCount: 0,
    stockRisksCount: 0,
    summaryBulletPoints,
  };
}

/**
 * Calculate Data Coverage Model & H-2 Readiness
 */
export function getWorkspaceDataCoverage(
  data: WorkspaceData,
  marketplace: Marketplace,
  asOfDate = new Date().toISOString().slice(0, 10),
): DataCoverageInfo {
  const perfRows = marketplace === 'Shopee' ? data.shopee_performance : data.tiktok_performance;

  const dates = perfRows.map((r) => r.date).sort();
  const coverageStart = dates[0] || null;
  const coverageEnd = dates.length ? dates[dates.length - 1] : null;

  // H-2 Target Cutoff (2 days before asOfDate)
  const asOf = new Date(asOfDate);
  const h2Date = new Date(asOf.getTime() - 2 * 24 * 60 * 60 * 1000);
  const h2CutoffDate = h2Date.toISOString().slice(0, 10);

  const isH2Ready = !!coverageEnd && coverageEnd >= h2CutoffDate;

  let missingDaysCount = 0;
  if (coverageEnd && coverageEnd < h2CutoffDate) {
    const diffMs = new Date(h2CutoffDate).getTime() - new Date(coverageEnd).getTime();
    missingDaysCount = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  const latestImport = data.imports
    .filter((j) => j.marketplace === marketplace)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  const statusLabel = isH2Ready
    ? `${marketplace} coverage available through H-2 (${coverageEnd})`
    : coverageEnd
      ? `${marketplace} data incomplete for H-2 reporting (${missingDaysCount} day${missingDaysCount === 1 ? '' : 's'} behind)`
      : `${marketplace} no data imported yet`;

  return {
    marketplace,
    coverageStart,
    coverageEnd,
    latestImportDate: latestImport?.created_at ? latestImport.created_at.slice(0, 10) : null,
    missingDaysCount,
    isH2Ready,
    h2CutoffDate,
    statusLabel,
  };
}

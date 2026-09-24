import type {
  WorkspaceData,
  CommunicationTemplate,
  CommunicationChannel,
  Marketplace,
} from '../../types/domain.ts';
import { interpolateTemplate } from './templates.ts';
import { normalizePhoneNumber } from './queue.ts';
import { records } from '../operations/config.ts';

export type PreparedItemAnalysis = {
  creatorId: string;
  creatorName: string;
  marketplace: Marketplace;
  channel: CommunicationChannel;
  phone?: string | null;
  email?: string | null;
  preparedBody: string;
  unresolvedVariables: string[];
  isBlacklisted: boolean;
  contactedRecently: boolean;
  daysSinceContact: number | null;
  status: 'READY' | 'NEEDS_REVIEW' | 'SKIPPED';
  reviewReason?: string;
};

export type BulkPreparationResult = {
  batchId: string;
  templateId: string;
  templateVersion: number;
  totalSelected: number;
  readyCount: number;
  needsReviewCount: number;
  skippedCount: number;
  items: PreparedItemAnalysis[];
};

/**
 * Bulk Prepare Communication Queue Items for Selected Creators
 */
export function prepareBulkCommunication(
  creatorIds: string[],
  template: CommunicationTemplate,
  data: WorkspaceData,
  campaignId?: string,
  asOfDate = new Date().toISOString().slice(0, 10),
): BulkPreparationResult {
  const batchId = crypto.randomUUID();
  const items: PreparedItemAnalysis[] = [];

  let readyCount = 0;
  let needsReviewCount = 0;
  let skippedCount = 0;

  const campaign = campaignId ? data.entities.campaigns.find((c) => c.id === campaignId) : undefined;
  const brand = campaign ? data.entities.brands.find((b) => b.id === campaign.brand_id) : undefined;
  const product = data.entities.products[0];

  const outreachList = records(data, 'creator_outreach');

  for (const cid of creatorIds) {
    const creator = data.entities.creators.find((c) => c.id === cid);
    if (!creator) {
      skippedCount++;
      continue;
    }

    const isBlacklisted =
      String(creator.status).toLowerCase() === 'blacklisted' ||
      String(creator.notes || '').toLowerCase().includes('blacklist') ||
      String(creator.tags || '').toLowerCase().includes('blacklist');

    const creatorOutreach = outreachList
      .filter((r) => r.creator_id === creator.id)
      .sort((a, b) => String(b.contacted_at || b.created_at).localeCompare(String(a.contacted_at || a.created_at)));

    const latest = creatorOutreach[0];
    const lastContactDate = latest?.contacted_at ? String(latest.contacted_at).slice(0, 10) : null;

    let daysSinceContact: number | null = null;
    if (lastContactDate) {
      const a = new Date(lastContactDate + 'T00:00:00Z').getTime();
      const b = new Date(asOfDate + 'T00:00:00Z').getTime();
      daysSinceContact = Math.floor((b - a) / 86400000);
    }

    const contactedRecently = daysSinceContact !== null && daysSinceContact >= 0 && daysSinceContact < 3;

    // Detect primary account & marketplace
    const spAcc = data.shopee_accounts.find((a) => a.creator_id === creator.id);
    const ttAcc = data.tiktok_accounts.find((a) => a.creator_id === creator.id);
    const market: Marketplace = spAcc ? 'Shopee' : ttAcc ? 'TikTok' : 'Multi-platform';

    const normPhone = normalizePhoneNumber(creator.phone ? String(creator.phone) : null);
    const channel: CommunicationChannel = template.channel || (normPhone ? 'WHATSAPP' : 'EMAIL');

    // Interpolate template variables
    const variables = {
      creator_name: creator.name,
      campaign_name: campaign?.name || 'Affiliate Campaign',
      brand_name: brand?.name || 'AffiliateOS Partner',
      marketplace: market,
      product_name: product?.name || 'Featured Product',
      deadline: campaign?.end_date ? String(campaign.end_date) : 'End of Month',
    };

    const interpolated = interpolateTemplate(template.body, variables);

    let status: 'READY' | 'NEEDS_REVIEW' | 'SKIPPED' = 'READY';
    const reasons: string[] = [];

    if (template.channel === 'WHATSAPP' && !normPhone) {
      status = 'NEEDS_REVIEW';
      reasons.push('Missing valid WhatsApp phone number');
    }
    if (interpolated.missingVariables.length > 0) {
      status = 'NEEDS_REVIEW';
      reasons.push(`Unresolved placeholders: ${interpolated.missingVariables.join(', ')}`);
    }
    if (isBlacklisted) {
      status = 'NEEDS_REVIEW';
      reasons.push('Creator is blacklisted');
    }
    if (contactedRecently) {
      status = 'NEEDS_REVIEW';
      reasons.push(`Contacted recently (${daysSinceContact} day(s) ago)`);
    }

    if (status === 'READY') {
      readyCount++;
    } else {
      needsReviewCount++;
    }

    items.push({
      creatorId: creator.id,
      creatorName: creator.name,
      marketplace: market,
      channel,
      phone: creator.phone ? String(creator.phone) : null,
      email: creator.email ? String(creator.email) : null,
      preparedBody: interpolated.text,
      unresolvedVariables: interpolated.missingVariables,
      isBlacklisted,
      contactedRecently,
      daysSinceContact,
      status,
      reviewReason: reasons.join('; ') || undefined,
    });
  }

  return {
    batchId,
    templateId: template.id,
    templateVersion: template.current_version,
    totalSelected: creatorIds.length,
    readyCount,
    needsReviewCount,
    skippedCount,
    items,
  };
}

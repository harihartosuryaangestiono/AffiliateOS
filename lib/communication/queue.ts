import type {
  WorkspaceData,
  OutreachQueueItem,
  TemplateCategory,
  CommunicationChannel,
  Marketplace,
} from '../../types/domain.ts';
import { records, thresholds } from '../operations/config.ts';
import { metrics, periodRange } from '../operations/engine.ts';

const DAY_MS = 86400000;

function daysBetween(aStr: string, bStr: string): number {
  const a = new Date(aStr + 'T00:00:00Z').getTime();
  const b = new Date(bStr + 'T00:00:00Z').getTime();
  return Math.floor((b - a) / DAY_MS);
}

/**
 * Normalize phone number to clean E.164 digits format without leading '+'
 * e.g. "08123456789" -> "628123456789", "+62 812-3456-789" -> "628123456789"
 */
export function normalizePhoneNumber(rawPhone?: string | null): string | null {
  if (!rawPhone) return null;

  let cleaned = rawPhone.replace(/[^\d+]/g, '');
  if (!cleaned) return null;

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  } else if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }

  if (cleaned.length < 9 || cleaned.length > 15) {
    return null;
  }

  return cleaned;
}

/**
 * Generate safe WhatsApp deep link for user-initiated navigation
 */
export function generateWhatsAppLink(rawPhone: string, messageBody: string): string {
  const norm = normalizePhoneNumber(rawPhone);
  if (!norm) {
    throw new Error('Creator does not have a valid WhatsApp phone number (e.g. 628123456789).');
  }

  const encodedText = encodeURIComponent(messageBody);
  return `https://wa.me/${norm}?text=${encodedText}`;
}

/**
 * Generate safe social profile link (Instagram / TikTok)
 */
export function generateProfileLink(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

/**
 * Generate Prioritized Daily Communication Queue
 */
export function generateTodayQueue(
  data: WorkspaceData,
  asOfDate = new Date().toISOString().slice(0, 10),
): OutreachQueueItem[] {
  const t = thresholds(data);
  const queue: OutreachQueueItem[] = [];

  const outreachList = records(data, 'creator_outreach');
  const sampleList = records(data, 'sample_seedings');
  const hslList = records(data, 'hsl_activations');
  const peakCreatorsList = records(data, 'peak_day_creators');
  const peakDaysList = records(data, 'peak_days');

  for (const creator of data.entities.creators) {
    const isBlacklisted =
      String(creator.status).toLowerCase() === 'blacklisted' ||
      String(creator.relationship_status || '').toLowerCase() === 'blacklisted' ||
      String(creator.notes || '').toLowerCase().includes('blacklist') ||
      String(creator.tags || '').toLowerCase().includes('blacklist');

    if (isBlacklisted) {
      continue;
    }

    const creatorOutreach = outreachList
      .filter((r) => r.creator_id === creator.id)
      .sort((a, b) => String(b.contacted_at || b.created_at).localeCompare(String(a.contacted_at || a.created_at)));

    const latestOutreach = creatorOutreach[0];
    const lastContactDate = latestOutreach?.contacted_at ? String(latestOutreach.contacted_at).slice(0, 10) : null;
    const daysSinceContact = lastContactDate ? daysBetween(lastContactDate, asOfDate) : null;

    const contactedRecently = daysSinceContact !== null && daysSinceContact >= 0 && daysSinceContact < 3;

    // Accounts for creator
    const ttAcc = data.tiktok_accounts.find((a) => a.creator_id === creator.id);
    const spAcc = data.shopee_accounts.find((a) => a.creator_id === creator.id);
    const primaryMarketplace: Marketplace = spAcc ? 'Shopee' : ttAcc ? 'TikTok' : 'Multi-platform';

    // Recent GMV check
    const period = periodRange('MTD', new Date(asOfDate), 2);
    const m = metrics(data, period, primaryMarketplace, { creator_id: creator.id });
    const recentGmv = m.gmv || 0;

    // Check HSL context
    const activeHsl = hslList.find((h) => h.creator_id === creator.id && ['Confirmed', 'Ready', 'Active'].includes(String(h.status)));

    // Check Sample context
    const pendingSample = sampleList.find(
      (s) => s.creator_id === creator.id && ['Shipped', 'Received', 'Activation Pending'].includes(String(s.status)),
    );

    // Check Peak Day context
    const peakLink = peakCreatorsList.find((p) => p.creator_id === creator.id);
    const peakEvent = peakLink ? peakDaysList.find((e) => e.id === peakLink.peak_day_id) : null;
    const leadPeakDays = peakEvent ? daysBetween(asOfDate, String(peakEvent.event_date)) : null;

    let reason = '';
    let category: TemplateCategory = 'FIRST_OUTREACH';
    let priority: 'P0' | 'P1' | 'P2' | 'P3' = 'P2';
    let nextAction = 'Send outreach message';
    let isEligible = false;

    // Priority 1: Peak Day Lock Lead (T-1 to T-3)
    if (leadPeakDays !== null && leadPeakDays >= 0 && leadPeakDays <= 3 && peakLink?.status !== 'Confirmed') {
      isEligible = true;
      priority = leadPeakDays <= 1 ? 'P0' : 'P1';
      category = 'CAMPAIGN_INVITE';
      reason = `Peak Day ${peakEvent?.name} is T-${leadPeakDays}. Confirm creator schedule lock.`;
      nextAction = 'Confirm Peak Day schedule & deliverable format';
    }
    // Priority 2: HSL SKU / Activation Follow-Up
    else if (activeHsl && !records(data, 'hsl_creator_products').some((p) => p.hsl_activation_id === activeHsl.id && p.priority === 'Hero')) {
      isEligible = true;
      priority = 'P1';
      category = 'HSL';
      reason = 'Active HSL creator missing hero SKU selection.';
      nextAction = 'Send HSL hero SKU recommendation';
    }
    // Priority 3: Sample Deliverable Follow-Up
    else if (pendingSample) {
      const sampleAge = pendingSample.shipped_at
        ? daysBetween(String(pendingSample.shipped_at), asOfDate)
        : pendingSample.received_at
          ? daysBetween(String(pendingSample.received_at), asOfDate)
          : 0;

      if (sampleAge >= t.sample_days) {
        isEligible = true;
        priority = 'P2';
        category = 'SAMPLE_FOLLOW_UP';
        reason = `Sample ${pendingSample.status.toLowerCase()} ${sampleAge} day(s) ago without recorded post/live.`;
        nextAction = 'Check sample delivery & confirm activation date';
      }
    }

    // Standard Cadence Evaluation (if no specific operational trigger took precedence)
    if (!isEligible) {
      if (!lastContactDate) {
        // New Outreach
        isEligible = true;
        priority = 'P2';
        category = 'FIRST_OUTREACH';
        reason = 'New acquisition target pending initial outreach.';
        nextAction = 'Send first outreach message';
      } else if (daysSinceContact !== null) {
        const status = String(latestOutreach?.status || 'No Response');

        if (['No Response', 'Follow Up'].includes(status)) {
          if (daysSinceContact >= t.no_response_days) {
            isEligible = true;
            priority = 'P2';
            category = 'NO_RESPONSE';
            reason = `No response received after ${daysSinceContact} days. Review for re-approach or close.`;
            nextAction = 'Review no-response status & schedule re-approach';
          } else if (daysSinceContact >= t.second_follow_up_days) {
            isEligible = true;
            priority = 'P1';
            category = 'FOLLOW_UP_2';
            reason = `H+7 follow-up due (${daysSinceContact} days since last contact).`;
            nextAction = 'Send second follow-up message';
          } else if (daysSinceContact >= t.first_follow_up_days) {
            isEligible = true;
            priority = 'P1';
            category = 'FOLLOW_UP_1';
            reason = `H+3 follow-up due (${daysSinceContact} days since last contact).`;
            nextAction = 'Send first follow-up message';
          }
        } else if (status === 'Replied' || status === 'Interested') {
          isEligible = true;
          priority = 'P1';
          category = 'INTERESTED';
          reason = `Creator responded (${status}). Needs next action agreement.`;
          nextAction = 'Send campaign proposal or rate agreement';
        } else if (daysSinceContact >= t.reactivation_days && !['Declined', 'Converted'].includes(status)) {
          isEligible = true;
          priority = 'P3';
          category = 'REAPPROACH';
          reason = `Inactive for ${daysSinceContact} days. Re-approach opportunity.`;
          nextAction = 'Send re-approach message';
        }
      }
    }

    if (isEligible) {
      const channel: CommunicationChannel = creator.phone ? 'WHATSAPP' : creator.email ? 'EMAIL' : 'OTHER';

      queue.push({
        id: creator.id,
        creator_id: creator.id,
        creator_name: creator.name,
        marketplace: primaryMarketplace,
        phone: creator.phone ? String(creator.phone) : null,
        email: creator.email ? String(creator.email) : null,
        profile_url: generateProfileLink(creator.profile_url ? String(creator.profile_url) : null),
        current_outreach_state: latestOutreach?.status ? String(latestOutreach.status) : 'Prospect',
        campaign_id: latestOutreach?.campaign_id ? String(latestOutreach.campaign_id) : null,
        campaign_name: latestOutreach?.campaign_id
          ? data.entities.campaigns.find((c) => c.id === latestOutreach.campaign_id)?.name
          : null,
        last_contact_at: lastContactDate,
        days_since_contact: daysSinceContact,
        reason,
        recommended_category: category,
        recommended_channel: channel,
        next_action: nextAction,
        priority,
        recent_gmv: recentGmv,
        hsl_status: activeHsl ? String(activeHsl.status) : null,
        sample_status: pendingSample ? String(pendingSample.status) : null,
        is_blacklisted: isBlacklisted,
        contacted_recently: contactedRecently,
        days_since_recent_contact: daysSinceContact,
      });
    }
  }

  // Sort queue: P0 first, then P1, P2, P3, then priority by days_since_contact desc
  return queue.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority.localeCompare(b.priority);
    }
    return (b.days_since_contact || 0) - (a.days_since_contact || 0);
  });
}

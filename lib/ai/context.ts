import type { WorkspaceData, RecordData } from '@/types/domain';
import { sanitizePII } from './guardrails.ts';

/**
 * 1. Curated Context for Creator Outreach Draft
 */
export function buildOutreachContext(
  creator: RecordData,
  options: {
    campaign?: RecordData | null;
    stage?: string;
    lastContactDate?: string;
    previousResponse?: string;
    hslContext?: RecordData | null;
    sampleContext?: RecordData | null;
    deadline?: string;
  } = {}
) {
  const context = {
    creator_display_name: creator.name || creator.handle || 'Creator',
    handle: creator.handle || creator.username || '',
    marketplace: creator.marketplace || 'Shopee',
    tier: creator.tier || 'Micro',
    niche: creator.niche || 'General',
    status: creator.status || 'Prospect',
    outreach_stage: options.stage || 'First Outreach',
    last_contact_date: options.lastContactDate || null,
    previous_response_category: options.previousResponse || null,
    campaign_name: options.campaign?.name || null,
    brand_name: options.campaign?.brand_name || 'Haleon',
    deadline: options.deadline || null,
    has_hsl: !!options.hslContext,
    hsl_details: options.hslContext ? {
      status: options.hslContext.status,
      start_date: options.hslContext.start_date,
      end_date: options.hslContext.end_date,
    } : null,
    has_sample: !!options.sampleContext,
    sample_details: options.sampleContext ? {
      status: options.sampleContext.status,
      product_name: options.sampleContext.product_name,
      expected_activation: options.sampleContext.expected_activation_at,
    } : null,
  };

  return sanitizePII(context);
}

/**
 * 2. Curated Context for Creator Performance Insight
 */
export function buildCreatorInsightContext(
  creator: RecordData,
  performanceRows: (RecordData | Record<string, unknown>)[] = [],
  signals: RecordData[] = [],
  hslContext?: RecordData | null,
  sampleContext?: RecordData | null
) {
  const sumGmv = (rows: (RecordData | Record<string, unknown>)[]) => rows.reduce((acc, r) => acc + (Number(r.affiliate_gmv || r.gmv) || 0), 0);
  const sumOrders = (rows: (RecordData | Record<string, unknown>)[]) => rows.reduce((acc, r) => acc + (Number(r.orders || r.order_count) || 0), 0);
  const sumUnits = (rows: (RecordData | Record<string, unknown>)[]) => rows.reduce((acc, r) => acc + (Number(r.units_sold || r.quantity) || 0), 0);
  // Aggregate recent 7 days vs previous 7 days deterministically
  const getDateStr = (row: RecordData | Record<string, unknown>): string => {
    if (typeof row.date === 'string') return row.date;
    if (typeof row.performance_date === 'string') return row.performance_date;
    return '';
  };
  const sorted = [...performanceRows].sort((a, b) => getDateStr(b).localeCompare(getDateStr(a)));

  const recent7 = sorted.slice(0, 7);
  const prev7 = sorted.slice(7, 14);


  const recentGmv = sumGmv(recent7);
  const prevGmv = sumGmv(prev7);
  const gmvDeltaPct = prevGmv > 0 ? Math.round(((recentGmv - prevGmv) / prevGmv) * 100) : (recentGmv > 0 ? 100 : 0);

  const context = {
    creator: {
      id: creator.id,
      name: creator.name || creator.handle,
      handle: creator.handle,
      marketplace: creator.marketplace,
      tier: creator.tier,
      relationship_status: creator.status,
    },
    performance_summary: {
      recent_7d_gmv: recentGmv,
      recent_7d_gmv_formatted: `Rp ${recentGmv.toLocaleString('id-ID')}`,
      previous_7d_gmv: prevGmv,
      previous_7d_gmv_formatted: `Rp ${prevGmv.toLocaleString('id-ID')}`,
      gmv_change_percentage: `${gmvDeltaPct > 0 ? '+' : ''}${gmvDeltaPct}%`,
      recent_7d_orders: sumOrders(recent7),
      recent_7d_units: sumUnits(recent7),
      sales_active_days_last_7d: recent7.filter(r => (Number(r.affiliate_gmv || r.gmv) || 0) > 0).length,
    },
    hsl_status: hslContext ? {
      status: hslContext.status,
      start_date: hslContext.start_date,
      end_date: hslContext.end_date,
    } : 'None',
    sample_status: sampleContext ? {
      status: sampleContext.status,
      expected_activation: sampleContext.expected_activation_at,
    } : 'None',
    deterministic_signals: signals.slice(0, 5).map(s => ({
      title: s.title,
      priority: s.priority,
      reason: s.description || s.reason,
    })),
    data_freshness: {
      latest_performance_date: sorted[0]?.date || 'None',
      coverage_note: 'Performance aggregated from official imported daily records',
    },
  };

  return sanitizePII(context);
}

/**
 * 3. Curated Context for Operational Daily Brief
 */
export function buildDailyBriefContext(
  workspaceData: WorkspaceData,
  actions: RecordData[] = []
) {
  const p0Actions = actions.filter(a => a.priority === 'P0' && a.status !== 'Completed');
  const p1Actions = actions.filter(a => a.priority === 'P1' && a.status !== 'Completed');

  const outreach = workspaceData.operations?.creator_outreach || [];
  const todayStr = new Date().toISOString().slice(0, 10);
  const overdueOutreach = outreach.filter(o => 
    o.follow_up_at && String(o.follow_up_at) <= todayStr && o.status !== 'Converted' && o.status !== 'Declined'
  );

  const stockAlerts = (workspaceData.operations?.operational_alerts || []).filter(
    a => a.alert_type === 'STOCK' || String(a.message).toLowerCase().includes('stock')
  );

  const sampleDelays = (workspaceData.operations?.sample_seedings || []).filter(
    s => s.status === 'Received' && s.expected_activation_at && String(s.expected_activation_at) <= todayStr
  );

  const context = {
    date: todayStr,
    action_center: {
      p0_critical_count: p0Actions.length,
      p1_high_count: p1Actions.length,
      top_p0_items: p0Actions.slice(0, 3).map(a => ({
        id: a.id,
        title: a.title,
        reason: a.description || a.title,
        entity_type: a.entity_type || 'action',
        entity_id: a.entity_id || a.id,
      })),
      top_p1_items: p1Actions.slice(0, 3).map(a => ({
        id: a.id,
        title: a.title,
        reason: a.description || a.title,
        entity_type: a.entity_type || 'action',
        entity_id: a.entity_id || a.id,
      })),
    },
    overdue_follow_ups: {
      count: overdueOutreach.length,
      sample_creators: overdueOutreach.slice(0, 3).map(o => ({
        creator_id: o.creator_id,
        reason: o.reason,
        due_date: o.follow_up_at,
      })),
    },
    stock_alerts: {
      count: stockAlerts.length,
      summary: stockAlerts.slice(0, 2).map(s => s.message),
    },
    sample_activation_delays: {
      count: sampleDelays.length,
      sample_creators: sampleDelays.slice(0, 2).map(s => ({
        creator_id: s.creator_id,
        expected_at: s.expected_activation_at,
      })),
    },
    data_coverage: {
      status: 'Shopee & TikTok ready through H-2',
      reporting_readiness: 'Weekly deck ready for generation',
    },
  };

  return sanitizePII(context);
}

/**
 * 4. Curated Context for Report Narrative Assistant
 */
export function buildReportNarrativeContext(
  reportDataset: Record<string, unknown>,
  reportMetadata: Record<string, unknown> = {}
) {
  const kpis = (reportDataset.executive_kpis || reportDataset.kpis || {}) as Record<string, unknown>;
  const topProducts = ((reportDataset.product_performance || reportDataset.top_products || []) as Record<string, unknown>[]).slice(0, 5);
  const brandSummaries = ((reportDataset.brand_performance || reportDataset.brands || []) as Record<string, unknown>[]).slice(0, 3);

  const context = {
    report_title: reportMetadata.name || 'Weekly Affiliate Performance',
    period_start: reportMetadata.period_start || 'N/A',
    period_end: reportMetadata.period_end || 'N/A',
    data_cutoff: reportMetadata.cutoff_date || 'H-2',
    executive_kpis: kpis,
    top_performing_products: topProducts.map(p => ({
      name: p.product_name || p.name,
      brand: p.brand_name || p.brand,
      gmv: p.affiliate_gmv || p.gmv,
      orders: p.orders,
    })),
    brand_breakdown: brandSummaries.map(b => ({
      brand: b.brand_name || b.name,
      gmv: b.affiliate_gmv || b.gmv,
      share: b.gmv_share || b.share,
    })),
    data_limitations: [
      'Rank-Up Program data SOURCE_UNAVAILABLE (excluded from evaluation)',
      'Metrics computed strictly through official H-2 cutoff date',
    ],
  };

  return sanitizePII(context);
}

/**
 * 5. Safe Domain Query Routing & Curated Context for Ask AffiliateOS
 */
export function routeAndBuildAskContext(
  query: string,
  workspaceData: WorkspaceData
): { domain: string; context: Record<string, unknown>; validEntityIds: Set<string> } {
  const lower = query.toLowerCase();
  const validEntityIds = new Set<string>();

  // Collect valid creator IDs
  for (const c of workspaceData.entities.creators || []) {
    if (c.id) validEntityIds.add(c.id);
  }
  // Collect valid action IDs
  for (const a of workspaceData.operations?.operational_actions || []) {
    if (a.id) validEntityIds.add(a.id);
  }
  // Collect valid campaign IDs
  for (const c of workspaceData.entities.campaigns || []) {
    if (c.id) validEntityIds.add(c.id);
  }

  // 1. Outreach / Follow-up domain
  if (lower.includes('follow-up') || lower.includes('outreach') || lower.includes('chat') || lower.includes('kontak') || lower.includes('wa')) {
    const outreach = workspaceData.operations?.creator_outreach || [];
    const creators = workspaceData.entities.creators || [];
    const creatorMap = new Map(creators.map(c => [c.id, c.name || c.handle]));

    const dueOutreach = outreach.slice(0, 10).map(o => ({
      creator_id: String(o.creator_id || ''),
      creator_name: creatorMap.get(String(o.creator_id || '')) || 'Unknown Creator',
      channel: o.channel,
      status: o.status,
      reason: o.reason,
      follow_up_date: o.follow_up_at,
    }));

    return {
      domain: 'OUTREACH',
      context: {
        domain: 'OUTREACH',
        total_due: dueOutreach.length,
        due_creators: dueOutreach,
        note: 'Prioritized daily outreach list from AffiliateOS database',
      },
      validEntityIds,
    };
  }

  // 2. Action Center / Priorities domain
  if (lower.includes('p1') || lower.includes('p0') || lower.includes('prioritas') || lower.includes('action') || lower.includes('urgent') || lower.includes('tugas')) {
    const actions = (workspaceData.operations?.operational_actions || []).filter(a => a.status !== 'Completed').slice(0, 8);
    return {
      domain: 'ACTION_CENTER',
      context: {
        domain: 'ACTION_CENTER',
        active_actions_count: actions.length,
        actions: actions.map(a => ({
          id: a.id,
          title: a.title,
          priority: a.priority,
          category: a.category,
          due_date: a.due_at,
        })),
      },
      validEntityIds,
    };
  }

  // 3. Campaign domain
  if (lower.includes('campaign') || lower.includes('9.9') || lower.includes('gajian') || lower.includes('promo')) {
    const campaigns = workspaceData.entities.campaigns || [];
    return {
      domain: 'CAMPAIGNS',
      context: {
        domain: 'CAMPAIGNS',
        active_campaigns: campaigns.slice(0, 5).map(c => ({
          id: c.id,
          name: c.name,
          brand: c.brand_name || 'Haleon',
          status: c.status,
          start_date: c.start_date,
          end_date: c.end_date,
        })),
      },
      validEntityIds,
    };
  }

  // 4. Default / General Creators & Overview
  const topCreators = (workspaceData.entities.creators || []).slice(0, 5).map(c => ({
    id: c.id,
    name: c.name || c.handle,
    handle: c.handle,
    marketplace: c.marketplace,
    status: c.status,
  }));

  return {
    domain: 'GENERAL_OVERVIEW',
    context: {
      domain: 'GENERAL_OVERVIEW',
      summary: 'AffiliateOS operational overview',
      creators_sample: topCreators,
      total_creators_count: workspaceData.entities.creators?.length || 0,
      total_actions_count: workspaceData.operations?.operational_actions?.length || 0,
    },
    validEntityIds,
  };
}

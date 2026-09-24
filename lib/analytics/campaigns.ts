import type { WorkspaceData, Performance } from '../../types/domain.ts';
import { records } from '../operations/config.ts';

export type CampaignAnalyticsRow = {
  campaignId: string;
  campaignName: string;
  currentGmv: number;
  comparisonGmv: number;
  absoluteDelta: number;
  growthPct: number | null;
  orders: number;
  units: number;
  creatorsCount: number;
  targetGmv: number | null;
  achievementPct: number | null;
  gmvPerCreator: number | null;
  hasHsl: boolean;
  hasPeakDay: boolean;
  status: string;
};

export function aggregateCampaignAnalytics(
  currentRows: Performance[],
  comparisonRows: Performance[],
  data: WorkspaceData,
  marketplace: 'Shopee' | 'TikTok',
): CampaignAnalyticsRow[] {
  const campaigns = data.entities.campaigns.filter(
    (c) =>
      c.marketplace === marketplace ||
      c.marketplace === 'Multi-platform' ||
      !c.marketplace,
  );

  const curByCamp = new Map<
    string,
    { gmv: number; orders: number; units: number; creators: Set<string> }
  >();
  for (const r of currentRows) {
    if (!r.campaign_id) continue;
    const existing = curByCamp.get(r.campaign_id) || {
      gmv: 0,
      orders: 0,
      units: 0,
      creators: new Set(),
    };
    existing.gmv += Number(r.gmv || 0);
    existing.orders += Number(r.orders || 0);
    existing.units += Number(r.units_sold || 0);
    existing.creators.add(r.account_id);
    curByCamp.set(r.campaign_id, existing);
  }

  const compByCamp = new Map<string, { gmv: number }>();
  for (const r of comparisonRows) {
    if (!r.campaign_id) continue;
    const existing = compByCamp.get(r.campaign_id) || { gmv: 0 };
    existing.gmv += Number(r.gmv || 0);
    compByCamp.set(r.campaign_id, existing);
  }

  const hslActivations = records(data, 'hsl_activations');
  const peakDays = records(data, 'peak_days');

  return campaigns
    .map((c) => {
      const cur = curByCamp.get(c.id) || {
        gmv: 0,
        orders: 0,
        units: 0,
        creators: new Set(),
      };
      const comp = compByCamp.get(c.id) || { gmv: 0 };

      const absoluteDelta = cur.gmv - comp.gmv;
      const growthPct =
        comp.gmv > 0
          ? Math.round(((cur.gmv - comp.gmv) / comp.gmv) * 1000) / 10
          : null;

      const targetGmv = c.target_gmv ? Number(c.target_gmv) : null;
      const achievementPct =
        targetGmv && targetGmv > 0
          ? Math.round((cur.gmv / targetGmv) * 1000) / 10
          : null;

      const gmvPerCreator =
        cur.creators.size > 0 ? Math.round(cur.gmv / cur.creators.size) : null;

      const hasHsl = hslActivations.some((h) => h.campaign_id === c.id);
      const hasPeakDay = peakDays.some((p) => p.campaign_id === c.id);

      return {
        campaignId: c.id,
        campaignName: c.name,
        currentGmv: Math.round(cur.gmv * 100) / 100,
        comparisonGmv: Math.round(comp.gmv * 100) / 100,
        absoluteDelta: Math.round(absoluteDelta * 100) / 100,
        growthPct,
        orders: cur.orders,
        units: cur.units,
        creatorsCount: cur.creators.size,
        targetGmv,
        achievementPct,
        gmvPerCreator,
        hasHsl,
        hasPeakDay,
        status: String(c.status || 'Active'),
      };
    })
    .sort((a, b) => b.currentGmv - a.currentGmv);
}

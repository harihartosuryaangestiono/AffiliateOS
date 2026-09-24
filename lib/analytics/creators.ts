import type { WorkspaceData, Performance } from '../../types/domain.ts';
import type { LeaderboardItem, ConcentrationRisk } from './types.ts';
import { classifyChange } from './metrics.ts';

export function aggregateCreatorPerformance(
  currentRows: Performance[],
  comparisonRows: Performance[],
  data: WorkspaceData,
  marketplace: 'Shopee' | 'TikTok',
): {
  items: LeaderboardItem[];
  topByGmv: LeaderboardItem[];
  topByOrders: LeaderboardItem[];
  topGrowth: LeaderboardItem[];
  largestDeclining: LeaderboardItem[];
  newlyActive: LeaderboardItem[];
  losingMomentum: LeaderboardItem[];
  concentrationRisk: ConcentrationRisk;
} {
  const accounts =
    marketplace === 'TikTok' ? data.tiktok_accounts : data.shopee_accounts;

  // Map account_id -> creator_id
  const accountToCreatorMap = new Map<string, string>();
  for (const acc of accounts) {
    accountToCreatorMap.set(acc.id, acc.creator_id);
  }

  // Aggregate current period by creator_id
  const curByCreator = new Map<
    string,
    { gmv: number; orders: number; units: number; commission: number }
  >();
  for (const r of currentRows) {
    const creatorId = accountToCreatorMap.get(r.account_id) || r.account_id;
    const existing = curByCreator.get(creatorId) || {
      gmv: 0,
      orders: 0,
      units: 0,
      commission: 0,
    };
    existing.gmv += Number(r.gmv || 0);
    existing.orders += Number(r.orders || 0);
    existing.units += Number(r.units_sold || 0);
    existing.commission += Number(r.commission || 0);
    curByCreator.set(creatorId, existing);
  }

  // Aggregate comparison period by creator_id
  const compByCreator = new Map<
    string,
    { gmv: number; orders: number; units: number; commission: number }
  >();
  for (const r of comparisonRows) {
    const creatorId = accountToCreatorMap.get(r.account_id) || r.account_id;
    const existing = compByCreator.get(creatorId) || {
      gmv: 0,
      orders: 0,
      units: 0,
      commission: 0,
    };
    existing.gmv += Number(r.gmv || 0);
    existing.orders += Number(r.orders || 0);
    existing.units += Number(r.units_sold || 0);
    existing.commission += Number(r.commission || 0);
    compByCreator.set(creatorId, existing);
  }

  const allCreatorIds = new Set<string>([
    ...curByCreator.keys(),
    ...compByCreator.keys(),
  ]);

  const totalCurrentGmv = Array.from(curByCreator.values()).reduce(
    (acc, v) => acc + v.gmv,
    0,
  );

  const items: LeaderboardItem[] = [];

  for (const creatorId of allCreatorIds) {
    const cur = curByCreator.get(creatorId) || {
      gmv: 0,
      orders: 0,
      units: 0,
      commission: 0,
    };
    const comp = compByCreator.get(creatorId) || {
      gmv: 0,
      orders: 0,
      units: 0,
      commission: 0,
    };

    const creatorRecord = data.entities.creators.find((c) => c.id === creatorId);
    const creatorAccount = accounts.find((a) => a.creator_id === creatorId);

    const name = creatorRecord?.name || creatorAccount?.username || `Creator ${creatorId.slice(0, 8)}`;
    const username = creatorAccount?.username ? `@${creatorAccount.username}` : undefined;

    const absoluteDelta = cur.gmv - comp.gmv;
    const growthPct =
      comp.gmv > 0
        ? Math.round(((cur.gmv - comp.gmv) / comp.gmv) * 1000) / 10
        : null;

    const contributionPct =
      totalCurrentGmv > 0
        ? Math.round((cur.gmv / totalCurrentGmv) * 1000) / 10
        : 0;

    items.push({
      id: creatorId,
      name,
      username,
      currentGmv: Math.round(cur.gmv * 100) / 100,
      comparisonGmv: Math.round(comp.gmv * 100) / 100,
      absoluteDelta: Math.round(absoluteDelta * 100) / 100,
      growthPct,
      orders: cur.orders,
      units: cur.units,
      commission: Math.round(cur.commission * 100) / 100,
      contributionPct,
      classification: classifyChange(growthPct),
      status: String(creatorRecord?.status || 'Active'),
    });
  }

  // Sorted views
  const topByGmv = [...items]
    .filter((i) => i.currentGmv > 0)
    .sort((a, b) => b.currentGmv - a.currentGmv);

  const topByOrders = [...items]
    .filter((i) => i.orders > 0)
    .sort((a, b) => b.orders - a.orders);

  const topGrowth = [...items]
    .filter((i) => i.absoluteDelta > 0)
    .sort((a, b) => b.absoluteDelta - a.absoluteDelta);

  const largestDeclining = [...items]
    .filter((i) => i.absoluteDelta < 0)
    .sort((a, b) => a.absoluteDelta - b.absoluteDelta);

  const newlyActive = [...items]
    .filter((i) => i.comparisonGmv === 0 && i.currentGmv > 0)
    .sort((a, b) => b.currentGmv - a.currentGmv);

  const losingMomentum = [...items]
    .filter(
      (i) =>
        i.comparisonGmv > 1000000 &&
        i.growthPct !== null &&
        i.growthPct < -40,
    )
    .sort((a, b) => a.absoluteDelta - b.absoluteDelta);

  // Concentration Risk Analysis
  let top1Share = 0;
  let top5Share = 0;
  let top10Share = 0;
  let remainingShare = 100;
  let riskLevel: 'LOW' | 'MODERATE' | 'HIGH' = 'LOW';
  let explanation = 'Creator sales are healthy and diversified across the network.';

  if (topByGmv.length > 0 && totalCurrentGmv > 0) {
    const top1Gmv = topByGmv.slice(0, 1).reduce((acc, c) => acc + c.currentGmv, 0);
    const top5Gmv = topByGmv.slice(0, 5).reduce((acc, c) => acc + c.currentGmv, 0);
    const top10Gmv = topByGmv.slice(0, 10).reduce((acc, c) => acc + c.currentGmv, 0);

    top1Share = Math.round((top1Gmv / totalCurrentGmv) * 1000) / 10;
    top5Share = Math.round((top5Gmv / totalCurrentGmv) * 1000) / 10;
    top10Share = Math.round((top10Gmv / totalCurrentGmv) * 1000) / 10;
    remainingShare = Math.round((100 - top10Share) * 10) / 10;

    if (top5Share > 70) {
      riskLevel = 'HIGH';
      explanation = `High concentration risk: Top 5 creators generate ${top5Share}% of total affiliate GMV. Performance is vulnerable to creator churn.`;
    } else if (top5Share >= 40) {
      riskLevel = 'MODERATE';
      explanation = `Moderate concentration: Top 5 creators account for ${top5Share}% of GMV. Expanding mid-tier creator activations is recommended.`;
    } else {
      riskLevel = 'LOW';
      explanation = `Diversified distribution: Top 5 creators drive ${top5Share}% of GMV. Healthy spread across creators.`;
    }
  }

  const concentrationRisk: ConcentrationRisk = {
    top1Share,
    top5Share,
    top10Share,
    remainingShare,
    riskLevel,
    explanation,
  };

  return {
    items,
    topByGmv,
    topByOrders,
    topGrowth,
    largestDeclining,
    newlyActive,
    losingMomentum,
    concentrationRisk,
  };
}

import type { ParetoAnalysis, ParetoItem } from './types.ts';

export function computeParetoAnalysis(
  rawItems: Array<{ id: string; name: string; value: number }>,
  entityLabel = 'entities',
  marketplaceLabel = 'Affiliate',
): ParetoAnalysis {
  // Filter out non-positive items and sort descending by value
  const validItems = rawItems
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalValue = validItems.reduce((acc, curr) => acc + curr.value, 0);
  const totalEntitiesCount = validItems.length;

  if (totalValue === 0 || totalEntitiesCount === 0) {
    return {
      items: [],
      totalValue: 0,
      totalEntitiesCount: 0,
      entitiesIn80PctCount: 0,
      entitiesIn80PctShare: 0,
      summaryText: `No active ${entityLabel} with sales in this period.`,
    };
  }

  let runningSum = 0;
  let countFor80 = 0;
  let crossed80 = false;

  const items: ParetoItem[] = validItems.map((item) => {
    runningSum += item.value;
    const contributionPct = (item.value / totalValue) * 100;
    const cumulativePct = (runningSum / totalValue) * 100;

    const isWithin80 = cumulativePct <= 80 || !crossed80;
    if (isWithin80 && !crossed80) {
      countFor80++;
      if (cumulativePct >= 80) {
        crossed80 = true;
      }
    }

    return {
      id: item.id,
      name: item.name,
      value: Math.round(item.value * 100) / 100,
      contributionPct: Math.round(contributionPct * 10) / 10,
      cumulativeValue: Math.round(runningSum * 100) / 100,
      cumulativePct: Math.round(cumulativePct * 10) / 10,
      isWithin80Percent: isWithin80,
    };
  });

  const entitiesIn80PctShare =
    totalEntitiesCount > 0
      ? Math.round((countFor80 / totalEntitiesCount) * 1000) / 10
      : 0;

  const summaryText = `${countFor80} of ${totalEntitiesCount} selling ${entityLabel} (${entitiesIn80PctShare}%) generate 80% of ${marketplaceLabel} GMV.`;

  return {
    items,
    totalValue: Math.round(totalValue * 100) / 100,
    totalEntitiesCount,
    entitiesIn80PctCount: countFor80,
    entitiesIn80PctShare,
    summaryText,
  };
}

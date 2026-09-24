import type {
  ContributionToChange,
  DriverItem,
  LeaderboardItem,
  ProductContributionRow,
} from './types.ts';

export function computeContributionToChange(
  creatorItems: LeaderboardItem[],
  productItems: ProductContributionRow[],
  totalCurrentGmv: number,
  totalComparisonGmv: number,
): ContributionToChange {
  const totalDeltaGmv = totalCurrentGmv - totalComparisonGmv;
  const totalGrowthPct =
    totalComparisonGmv > 0
      ? Math.round((totalDeltaGmv / totalComparisonGmv) * 1000) / 10
      : null;

  // Build product driver items
  const productDrivers: DriverItem[] = productItems.map((p) => {
    const isNew = p.comparisonGmv === 0 && p.currentGmv > 0;
    const isLost = p.comparisonGmv > 0 && p.currentGmv === 0;
    const contributionToGrowthPct =
      totalDeltaGmv !== 0
        ? Math.round((p.absoluteDelta / Math.abs(totalDeltaGmv)) * 1000) / 10
        : null;

    return {
      id: p.id,
      name: p.name,
      entityType: 'product',
      currentValue: p.currentGmv,
      comparisonValue: p.comparisonGmv,
      absoluteDelta: p.absoluteDelta,
      growthPct: p.growthPct,
      contributionToGrowthPct,
      isNew,
      isLost,
    };
  });

  // Top positive product drivers
  const topPositiveDrivers = productDrivers
    .filter((d) => d.absoluteDelta > 0)
    .sort((a, b) => b.absoluteDelta - a.absoluteDelta)
    .slice(0, 5);

  // Top negative product drivers
  const topNegativeDrivers = productDrivers
    .filter((d) => d.absoluteDelta < 0)
    .sort((a, b) => a.absoluteDelta - b.absoluteDelta)
    .slice(0, 5);

  // New contributors
  const newContributors = productDrivers
    .filter((d) => d.isNew)
    .sort((a, b) => b.currentValue - a.currentValue);

  // Lost contributors
  const lostContributors = productDrivers
    .filter((d) => d.isLost)
    .sort((a, b) => b.comparisonValue - a.comparisonValue);

  // Unexplained delta (if any)
  const explainedPositive = topPositiveDrivers.reduce((acc, d) => acc + d.absoluteDelta, 0);
  const explainedNegative = topNegativeDrivers.reduce((acc, d) => acc + d.absoluteDelta, 0);
  const unexplainedDeltaGmv = Math.round((totalDeltaGmv - (explainedPositive + explainedNegative)) * 100) / 100;

  return {
    totalDeltaGmv: Math.round(totalDeltaGmv * 100) / 100,
    totalGrowthPct,
    topPositiveDrivers,
    topNegativeDrivers,
    newContributors,
    lostContributors,
    unexplainedDeltaGmv,
  };
}

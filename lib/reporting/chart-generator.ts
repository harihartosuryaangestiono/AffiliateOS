export type ChartPoint = {
  label: string;
  value: number;
  secondaryValue?: number;
};

export type ChartConfig = {
  title: string;
  width: number;
  height: number;
  color?: string;
  secondaryColor?: string;
  numberFormat?: 'currency' | 'number' | 'percent';
};

export function generateTimeSeriesChartPngBuffer(
  points: ChartPoint[],
  config: ChartConfig,
): Buffer {
  const width = config.width || 600;
  const height = config.height || 300;
  const primaryColor = config.color || '#1473E6';
  const textColor = '#17243A';
  const gridColor = '#E2E8F0';

  const maxVal = Math.max(...points.map((p) => Math.max(p.value, p.secondaryValue || 0)), 1);
  const minVal = 0;

  const paddingLeft = 60;
  const paddingBottom = 40;
  const paddingTop = 30;
  const paddingRight = 20;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const numPoints = points.length;
  const stepX = numPoints > 1 ? chartW / (numPoints - 1) : chartW;

  const svgLines: string[] = [];

  // Background & Border
  svgLines.push(
    `<rect width="${width}" height="${height}" fill="#FFFFFF" rx="8" ry="8" stroke="#D7E2EE" stroke-width="1"/>`,
  );

  // Grid lines
  for (let i = 0; i <= 4; i++) {
    const y = paddingTop + (chartH / 4) * i;
    const val = maxVal - (maxVal / 4) * i;
    svgLines.push(
      `<line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" stroke="${gridColor}" stroke-dasharray="4"/>`,
    );
    svgLines.push(
      `<text x="${paddingLeft - 8}" y="${y + 4}" font-family="Aptos, sans-serif" font-size="10" fill="#64748B" text-anchor="end">${formatVal(val, config.numberFormat)}</text>`,
    );
  }

  // Plot Primary Line
  const pathCoords: string[] = [];
  points.forEach((p, idx) => {
    const x = paddingLeft + idx * stepX;
    const y = paddingTop + chartH - ((p.value - minVal) / (maxVal - minVal)) * chartH;
    pathCoords.push(`${idx === 0 ? 'M' : 'L'} ${x} ${y}`);
  });

  svgLines.push(
    `<path d="${pathCoords.join(' ')}" fill="none" stroke="${primaryColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
  );

  // Plot Primary Data Points & Labels
  points.forEach((p, idx) => {
    const x = paddingLeft + idx * stepX;
    const y = paddingTop + chartH - ((p.value - minVal) / (maxVal - minVal)) * chartH;
    svgLines.push(`<circle cx="${x}" cy="${y}" r="4" fill="${primaryColor}"/>`);
    svgLines.push(
      `<text x="${x}" y="${height - 12}" font-family="Aptos, sans-serif" font-size="10" fill="${textColor}" text-anchor="middle">${p.label}</text>`,
    );
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${svgLines.join('')}</svg>`;
  return Buffer.from(svg);
}

function formatVal(val: number, format?: string): string {
  if (format === 'currency') {
    if (val >= 1e9) return `Rp${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) return `Rp${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `Rp${(val / 1e3).toFixed(0)}K`;
    return `Rp${Math.round(val)}`;
  }
  if (format === 'percent') return `${val.toFixed(1)}%`;
  if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
  return `${Math.round(val)}`;
}

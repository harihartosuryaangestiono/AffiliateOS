'use client';
import { useId, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartNoAxesCombined } from 'lucide-react';
import { useWorkspace } from '@/components/layout/workspace-provider';
import { money } from '@/lib/data/metrics';
import {
  comparable,
  performanceRows,
  shiftDate,
  type Period,
} from '@/lib/operations/engine';

export function GrowthChart({
  period,
  market,
}: {
  period: Period;
  market: string;
}) {
  const { data } = useWorkspace();
  const [interval, setInterval] = useState('Daily');
  const gradient = useId().replaceAll(':', '');
  const previous = comparable(period);
  const rows = performanceRows(data, market);
  const totals = new Map<string, number>();
  rows.forEach((row) =>
    totals.set(row.date, (totals.get(row.date) || 0) + row.gmv),
  );
  const count = Math.max(
    0,
    Math.round((Date.parse(period.end) - Date.parse(period.start)) / 86400000) +
      1,
  );
  const buckets = new Map<
    string,
    { label: string; current: number; previous: number; date: string }
  >();
  for (let i = 0; i < count; i++) {
    const date = shiftDate(period.start, i);
    const key =
      interval === 'Monthly'
        ? date.slice(0, 7)
        : interval === 'Weekly'
          ? String(Math.floor(i / 7))
          : date;
    const prior = shiftDate(previous.start, i);
    const bucket = buckets.get(key) || {
      date,
      label: new Intl.DateTimeFormat('en-GB', {
        month: 'short',
        ...(interval === 'Monthly' ? {} : { day: 'numeric' as const }),
        timeZone: 'UTC',
      }).format(new Date(date + 'T12:00:00Z')),
      current: 0,
      previous: 0,
    };
    bucket.current += totals.get(date) || 0;
    bucket.previous += prior <= previous.end ? totals.get(prior) || 0 : 0;
    buckets.set(key, bucket);
  }
  const points = [...buckets.values()];
  return (
    <section className="panel growth-chart">
      <div className="ops-panel-heading">
        <div className="section-title-with-icon">
          <span className="metric-symbol tone-blue">
            <ChartNoAxesCombined size={22} />
          </span>
          <div>
            <h2>GMV overview</h2>
            <p>
              Processed payment orders · {period.start} — {period.end}
            </p>
          </div>
        </div>
        <select
          aria-label="Chart interval"
          value={interval}
          onChange={(e) => setInterval(e.target.value)}
        >
          {['Daily', 'Weekly', 'Monthly'].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      <figure
        className="growth-plot"
        aria-label={`${interval} GMV for ${market}, compared with ${previous.start} to ${previous.end}`}
      >
        {count > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={points}
              margin={{ top: 20, right: 18, left: 0, bottom: 12 }}
            >
              <defs>
                <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2475ff" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#2475ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="#e9eef7"
                strokeDasharray="4 4"
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                minTickGap={40}
                tick={{ fill: '#667897', fontSize: 11 }}
                dy={10}
              />
              <YAxis
                tickFormatter={(v) => money(v, true)}
                width={76}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#667897', fontSize: 11 }}
              />
              <Tooltip
                formatter={(v) => money(Number(v))}
                contentStyle={{
                  borderRadius: 14,
                  border: '1px solid #e7edf7',
                  boxShadow: '0 8px 24px #142a5010',
                  fontSize: 12,
                }}
              />
              <Area
                name="Previous comparable period"
                dataKey="previous"
                type="monotone"
                stroke="#a0b5ed"
                strokeDasharray="5 5"
                fill="transparent"
                strokeWidth={1.5}
              />
              <Area
                name="This period"
                dataKey="current"
                type="monotone"
                stroke="#2475ff"
                fill={`url(#${gradient})`}
                strokeWidth={2.5}
                activeDot={{ r: 5, stroke: '#fff', strokeWidth: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="ops-empty">
            <h3>Today’s data is not available yet</h3>
            <p>
              The reporting cutoff is {period.cutoff}. Choose an earlier period
              to see processed results.
            </p>
          </div>
        )}
      </figure>
      <div className="growth-legend">
        <span>
          <i />
          This period
        </span>
        <span>
          <i />
          Previous comparable period
        </span>
        <small>
          {previous.start} — {previous.end}
        </small>
      </div>
    </section>
  );
}

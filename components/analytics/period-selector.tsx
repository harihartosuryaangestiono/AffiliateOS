'use client';
import { useState } from 'react';
import { Calendar, Clock, ArrowRightLeft, AlertCircle } from 'lucide-react';
import type {
  PeriodMode,
  ComparisonMode,
  AnalyticsPeriod,
  AnalyticsComparison,
  CalendarGranularity,
} from '@/lib/analytics/types';
import { formatDateHuman } from '@/lib/analytics/periods';

interface Props {
  currentPeriod: AnalyticsPeriod;
  comparisonPeriod: AnalyticsComparison;
  onPeriodChange: (mode: PeriodMode, customStart?: string, customEnd?: string) => void;
  onComparisonChange: (mode: ComparisonMode, customStart?: string, customEnd?: string) => void;
  onCalendarChange?: (granularity: CalendarGranularity, dateStr: string) => void;
}

export function AnalyticsPeriodSelector({
  currentPeriod,
  comparisonPeriod,
  onPeriodChange,
  onComparisonChange,
}: Props) {
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [customStart, setCustomStart] = useState(currentPeriod.start);
  const [customEnd, setCustomEnd] = useState(currentPeriod.end);

  const [showCustomComparison, setShowCustomComparison] = useState(false);
  const [compCustomStart, setCompCustomStart] = useState(comparisonPeriod?.start || '');
  const [compCustomEnd, setCompCustomEnd] = useState(comparisonPeriod?.end || '');

  const presetModes: { key: PeriodMode; label: string }[] = [
    { key: 'TODAY', label: 'Today' },
    { key: 'YESTERDAY', label: 'Yesterday' },
    { key: 'LAST_7_DAYS', label: '7D' },
    { key: 'LAST_30_DAYS', label: '30D' },
    { key: 'THIS_WEEK', label: 'This Week' },
    { key: 'LAST_WEEK', label: 'Last Week' },
    { key: 'THIS_MONTH', label: 'MTD' },
    { key: 'LAST_MONTH', label: 'Last Month' },
  ];

  const comparisonOptions: { key: ComparisonMode; label: string }[] = [
    { key: 'PREVIOUS_PERIOD', label: 'Previous Period (Same Duration)' },
    { key: 'SAME_DAY_PREVIOUS_MONTH', label: 'Same-Day Previous Month' },
    { key: 'PREVIOUS_WEEK', label: 'Previous Week' },
    { key: 'PREVIOUS_MONTH', label: 'Full Previous Month' },
    { key: 'PREVIOUS_YEAR', label: 'Previous Year' },
    { key: 'CUSTOM_PERIOD', label: 'Custom Comparison...' },
    { key: 'NO_COMPARISON', label: 'No Comparison' },
  ];

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-2xs space-y-4">
      {/* Top row: Presets & Dates */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Preset buttons */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
          {presetModes.map((p) => {
            const isSelected = currentPeriod.mode === p.key && !showCustomRange;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  setShowCustomRange(false);
                  onPeriodChange(p.key);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white'
                }`}
              >
                {p.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowCustomRange(!showCustomRange)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              showCustomRange || currentPeriod.mode === 'CUSTOM_DATE_RANGE'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white'
            }`}
          >
            <Calendar size={13} />
            <span>Custom</span>
          </button>
        </div>

        {/* Selected Period Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] text-xs font-semibold shadow-2xs">
          <Clock size={14} className="text-[#2563EB]" />
          <span>
            {currentPeriod.label} ({currentPeriod.dayCount} days)
          </span>
        </div>
      </div>

      {/* Custom Date Range Picker Dropdown */}
      {showCustomRange && (
        <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-[#475569]">
            <span className="font-medium">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-medium text-[#0F172A]"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-[#475569]">
            <span className="font-medium">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-medium text-[#0F172A]"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (customStart && customEnd) {
                onPeriodChange('CUSTOM_DATE_RANGE', customStart, customEnd);
              }
            }}
            className="px-4 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            Apply Range
          </button>
        </div>
      )}

      {/* Bottom row: Comparison Bar */}
      <div className="pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-[#64748B] font-semibold">
            <ArrowRightLeft size={13} className="text-[#2563EB]" />
            <span>Compare with:</span>
          </div>

          <select
            value={comparisonPeriod?.mode || 'NO_COMPARISON'}
            onChange={(e) => {
              const val = e.target.value as ComparisonMode;
              if (val === 'CUSTOM_PERIOD') {
                setShowCustomComparison(true);
              } else {
                setShowCustomComparison(false);
                onComparisonChange(val);
              }
            }}
            className="px-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0F172A] hover:border-[#94A3B8] transition-colors focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-hidden"
          >
            {comparisonOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>

          {comparisonPeriod && (
            <span className="px-2.5 py-1 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] text-[11px] font-medium text-[#475569]">
              {formatDateHuman(comparisonPeriod.start)} – {formatDateHuman(comparisonPeriod.end)} ({comparisonPeriod.dayCount} days)
            </span>
          )}
        </div>

        {/* Duration Discrepancy Warning */}
        {comparisonPeriod?.isCustomUnequalDuration && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <AlertCircle size={13} className="text-amber-600 shrink-0" />
            <span>
              Unequal durations ({currentPeriod.dayCount}d vs {comparisonPeriod.dayCount}d). Normalized rates will be displayed.
            </span>
          </div>
        )}
      </div>

      {/* Custom Comparison Range Drawer */}
      {showCustomComparison && (
        <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-[#475569]">
            <span className="font-medium">Compare Start:</span>
            <input
              type="date"
              value={compCustomStart}
              onChange={(e) => setCompCustomStart(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-medium text-[#0F172A]"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-[#475569]">
            <span className="font-medium">Compare End:</span>
            <input
              type="date"
              value={compCustomEnd}
              onChange={(e) => setCompCustomEnd(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-medium text-[#0F172A]"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (compCustomStart && compCustomEnd) {
                onComparisonChange('CUSTOM_PERIOD', compCustomStart, compCustomEnd);
              }
            }}
            className="px-4 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            Apply Comparison
          </button>
        </div>
      )}
    </div>
  );
}

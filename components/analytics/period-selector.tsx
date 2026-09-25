'use client';

import { useState } from 'react';
import { Calendar, Clock, ArrowRightLeft, AlertCircle, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

  const presetModes: { key: PeriodMode; label: string; shortLabel?: string }[] = [
    { key: 'TODAY', label: 'Today' },
    { key: 'YESTERDAY', label: 'Yesterday', shortLabel: 'Yest' },
    { key: 'LAST_7_DAYS', label: '7D' },
    { key: 'LAST_30_DAYS', label: '30D' },
    { key: 'THIS_WEEK', label: 'This Week', shortLabel: 'Week' },
    { key: 'LAST_WEEK', label: 'Last Week', shortLabel: 'L.Week' },
    { key: 'THIS_MONTH', label: 'MTD' },
    { key: 'LAST_MONTH', label: 'Last Month', shortLabel: 'L.Mo' },
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
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
      {/* Primary Unified Control Surface */}
      <div className="p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Left: Gliding Preset Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl overflow-x-auto no-scrollbar">
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
                className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 ${
                  isSelected
                    ? 'text-white'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white/60'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="analytics-period-pill"
                    className="absolute inset-0 bg-[#2563EB] rounded-lg shadow-xs z-0"
                    transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                  />
                )}
                <span className="relative z-10">{p.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowCustomRange(!showCustomRange)}
            className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 active:scale-95 ${
              showCustomRange || currentPeriod.mode === 'CUSTOM_DATE_RANGE'
                ? 'text-white'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white/60'
            }`}
          >
            {(showCustomRange || currentPeriod.mode === 'CUSTOM_DATE_RANGE') && (
              <motion.div
                layoutId="analytics-period-pill"
                className="absolute inset-0 bg-[#0F172A] rounded-lg shadow-xs z-0"
                transition={{ type: 'spring', stiffness: 480, damping: 36 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Calendar size={13} />
              <span>Custom</span>
            </span>
          </button>
        </div>

        {/* Right: Integrated Comparison Controller & Period Badge */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Active Period Display Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] text-xs font-semibold shadow-2xs">
            <Clock size={13} className="text-[#2563EB] shrink-0" />
            <span>
              {currentPeriod.label}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/80 text-[#2563EB] font-bold border border-blue-200">
              {currentPeriod.dayCount}d
            </span>
          </div>

          {/* Comparison Selector Dropdown */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-[#64748B] font-medium shrink-0">
              <ArrowRightLeft size={13} className="text-[#2563EB]" />
              <span className="hidden sm:inline">vs:</span>
            </div>

            <div className="relative">
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
                className="h-8 pl-3 pr-8 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0F172A] hover:border-[#94A3B8] transition-colors focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-hidden appearance-none cursor-pointer"
              >
                {comparisonOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Context Ribbon (if active) */}
      {comparisonPeriod && comparisonPeriod.mode !== 'NO_COMPARISON' && (
        <div className="px-4 py-2 bg-[#F8FAFC] border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#475569]">
            <span className="text-[11px] text-[#94A3B8] font-medium">Comparison window:</span>
            <span className="font-semibold text-[#0F172A]">
              {formatDateHuman(comparisonPeriod.start)} – {formatDateHuman(comparisonPeriod.end)}
            </span>
            <span className="text-[11px] px-1.5 py-0.2 bg-[#E2E8F0] text-[#334155] rounded font-medium">
              {comparisonPeriod.dayCount} days
            </span>
          </div>

          {comparisonPeriod.isCustomUnequalDuration && (
            <div className="inline-flex items-center gap-1.5 text-amber-700 text-[11px] font-medium bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
              <AlertCircle size={12} className="text-amber-600 shrink-0" />
              <span>Unequal duration ({currentPeriod.dayCount}d vs {comparisonPeriod.dayCount}d). Daily rates are normalized.</span>
            </div>
          )}
        </div>
      )}

      {/* Collapsible Custom Date Range Drawer */}
      <AnimatePresence>
        {showCustomRange && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-[#F1F5F9] bg-[#F8FAFC]"
          >
            <div className="p-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-[#475569]">
                <span className="font-medium text-[#0F172A]">From:</span>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-hidden"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-[#475569]">
                <span className="font-medium text-[#0F172A]">To:</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-hidden"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (customStart && customEnd) {
                    onPeriodChange('CUSTOM_DATE_RANGE', customStart, customEnd);
                  }
                }}
                className="h-8 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Apply Range
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsible Custom Comparison Drawer */}
      <AnimatePresence>
        {showCustomComparison && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-[#F1F5F9] bg-[#F8FAFC]"
          >
            <div className="p-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-[#475569]">
                <span className="font-medium text-[#0F172A]">Compare Start:</span>
                <input
                  type="date"
                  value={compCustomStart}
                  onChange={(e) => setCompCustomStart(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-hidden"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-[#475569]">
                <span className="font-medium text-[#0F172A]">Compare End:</span>
                <input
                  type="date"
                  value={compCustomEnd}
                  onChange={(e) => setCompCustomEnd(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-hidden"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (compCustomStart && compCustomEnd) {
                    onComparisonChange('CUSTOM_PERIOD', compCustomStart, compCustomEnd);
                  }
                }}
                className="h-8 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Apply Comparison
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

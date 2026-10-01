'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useWorkspace } from '@/components/layout/workspace-provider';
import { Heading, MetricCards, OperationsTable, OpForm, NewReportButton } from './primitives';
import { records, canOperate } from '@/lib/operations/config';
import { formatDateID, metrics } from '@/lib/operations/engine';
import { money } from '@/lib/data/metrics';
import { toast } from 'sonner';
import { metricConfirmationStatus, snapshotMetricStatus } from '@/lib/reporting/business-rules';
import { templateFor } from '@/lib/reporting/templates';
import { buildReportDataset, type ReportDataset } from '@/lib/reporting/datamart';
import { getWorkspaceDataCoverage } from '@/lib/imports/automation';
import { PlatformIcon } from '@/components/dashboard/dashboard';
import {
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Sparkles,
  Eye,
  Printer,
  TrendingUp,
  TrendingDown,
  Layers,
  Calendar,
  FileBarChart2,
  FileText,
  Check,
} from 'lucide-react';
import { generateComparisonPPTX } from '@/lib/reporting/comparison-export';

type SourceLineage = {
  id: string;
  marketplace: string;
  filename?: string;
  source_type?: string;
  sales_metric?: string;
  period_start?: string;
  period_end?: string;
  status: string;
};

export function CompareReportStudio({ monthly = false }: { monthly?: boolean }) {
  const { data, role, mutate } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'studio' | 'saved'>('studio');

  // Presets & Filters
  const [marketplace, setMarketplace] = useState<'Multi-platform' | 'Shopee' | 'TikTok'>('Multi-platform');
  const [primaryPreset, setPrimaryPreset] = useState<'sep-mtd' | 'last-14' | 'peak-sale' | 'custom'>('sep-mtd');
  const [primaryStart, setPrimaryStart] = useState('2026-09-01');
  const [primaryEnd, setPrimaryEnd] = useState('2026-09-30');

  const [comparePreset, setComparePreset] = useState<'prev-period' | 'prev-month' | 'custom'>('prev-period');
  const [compareStart, setCompareStart] = useState('2026-08-01');
  const [compareEnd, setCompareEnd] = useState('2026-08-31');

  const [selectedClient, setSelectedClient] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('');

  const [isExportingPpt, setIsExportingPpt] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Handle Preset Changes
  const handlePrimaryPreset = (preset: 'sep-mtd' | 'last-14' | 'peak-sale' | 'custom') => {
    setPrimaryPreset(preset);
    if (preset === 'sep-mtd') {
      setPrimaryStart('2026-09-01');
      setPrimaryEnd('2026-09-30');
      if (comparePreset === 'prev-period') {
        setCompareStart('2026-08-02');
        setCompareEnd('2026-08-31');
      }
    } else if (preset === 'last-14') {
      setPrimaryStart('2026-09-17');
      setPrimaryEnd('2026-09-30');
      if (comparePreset === 'prev-period') {
        setCompareStart('2026-09-03');
        setCompareEnd('2026-09-16');
      }
    } else if (preset === 'peak-sale') {
      setPrimaryStart('2026-09-08');
      setPrimaryEnd('2026-09-14');
      if (comparePreset === 'prev-period') {
        setCompareStart('2026-09-01');
        setCompareEnd('2026-09-07');
      }
    }
  };

  const handleComparePreset = (preset: 'prev-period' | 'prev-month' | 'custom') => {
    setComparePreset(preset);
    if (preset === 'prev-month') {
      setCompareStart('2026-08-01');
      setCompareEnd('2026-08-31');
    } else if (preset === 'prev-period') {
      const pStart = new Date(primaryStart + 'T12:00:00Z');
      const pEnd = new Date(primaryEnd + 'T12:00:00Z');
      const diffDays = Math.max(1, Math.round((pEnd.getTime() - pStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const cStart = new Date(pStart);
      cStart.setUTCDate(cStart.getUTCDate() - diffDays);
      const cEnd = new Date(pStart);
      cEnd.setUTCDate(cEnd.getUTCDate() - 1);
      setCompareStart(cStart.toISOString().slice(0, 10));
      setCompareEnd(cEnd.toISOString().slice(0, 10));
    }
  };

  // Filter criteria
  const filter = {
    client_id: selectedClient || undefined,
    campaign_id: selectedCampaign || undefined,
  };

  // Calculate Primary Metrics
  const primaryPeriod = { start: primaryStart, end: primaryEnd, cutoff: primaryEnd };
  const metricsA = metrics(data, primaryPeriod, marketplace, filter);

  // Calculate Comparison Metrics
  const comparePeriod = { start: compareStart, end: compareEnd, cutoff: compareEnd };
  const metricsB = metrics(data, comparePeriod, marketplace, filter);

  // Calculations
  const gmvGrowth = metricsB.gmv > 0 ? ((metricsA.gmv - metricsB.gmv) / metricsB.gmv) * 100 : 100;
  const gmvDiff = metricsA.gmv - metricsB.gmv;
  const ordersGrowth = metricsB.orders > 0 ? ((metricsA.orders - metricsB.orders) / metricsB.orders) * 100 : 100;
  const ordersDiff = metricsA.orders - metricsB.orders;
  const creatorDiff = metricsA.activeCreators - metricsB.activeCreators;

  const aovA = metricsA.orders > 0 ? metricsA.gmv / metricsA.orders : 0;
  const aovB = metricsB.orders > 0 ? metricsB.gmv / metricsB.orders : 0;
  const aovGrowth = aovB > 0 ? ((aovA - aovB) / aovB) * 100 : 0;

  // Channel Splits
  const shopeeA = metrics(data, primaryPeriod, 'Shopee', filter);
  const shopeeB = metrics(data, comparePeriod, 'Shopee', filter);
  const tiktokA = metrics(data, primaryPeriod, 'TikTok', filter);
  const tiktokB = metrics(data, comparePeriod, 'TikTok', filter);

  // Top Campaigns in Primary Period
  const campaignsWithGmv = data.entities.campaigns
    .map((c) => {
      const cMetricsA = metrics(data, primaryPeriod, marketplace, { campaign_id: c.id });
      const cMetricsB = metrics(data, comparePeriod, marketplace, { campaign_id: c.id });
      return {
        id: c.id,
        name: c.name,
        marketplace: c.marketplace,
        primaryGmv: cMetricsA.gmv,
        compareGmv: cMetricsB.gmv,
        growth: cMetricsB.gmv > 0 ? ((cMetricsA.gmv - cMetricsB.gmv) / cMetricsB.gmv) * 100 : 100,
      };
    })
    .filter((c) => c.primaryGmv > 0)
    .sort((a, b) => b.primaryGmv - a.primaryGmv)
    .slice(0, 5);

  // Top Creators in Primary Period
  const creatorsWithGmv = data.entities.creators
    .map((c) => {
      const cMetricsA = metrics(data, primaryPeriod, marketplace, { creator_id: c.id });
      return {
        id: c.id,
        name: c.name,
        marketplace: c.primary_marketplace || 'Multi-platform',
        primaryGmv: cMetricsA.gmv,
        orders: cMetricsA.orders,
      };
    })
    .filter((c) => c.primaryGmv > 0)
    .sort((a, b) => b.primaryGmv - a.primaryGmv)
    .slice(0, 5);

  // Narrative Insights
  const reportHighlights = [
    `Total Affiliate GMV tercatat ${money(metricsA.gmv)}, ${gmvGrowth >= 0 ? 'tumbuh' : 'turun'} sebesar ${Math.abs(gmvGrowth).toFixed(1)}% (${gmvGrowth >= 0 ? '+' : ''}${money(gmvDiff)}) dibanding periode pembanding.`,
    `Volume pesanan mencapai ${metricsA.orders.toLocaleString()} orders dengan ${metricsA.activeCreators} kreator aktif menghasilkan penjualan.`,
    `Rata-rata nilai belanja per transaksi (AOV) sebesar ${money(aovA)} (${aovGrowth >= 0 ? '+' : ''}${aovGrowth.toFixed(1)}%).`,
  ];

  const whatWentWell = [
    `Kontribusi saluran utama didominasi oleh ${shopeeA.gmv >= tiktokA.gmv ? 'Shopee' : 'TikTok'} dengan perolehan ${money(Math.max(shopeeA.gmv, tiktokA.gmv))}.`,
    `Terdapat ${campaignsWithGmv.length} campaign aktif yang melampaui target engagement affiliate.`,
    `Tingkat produktivitas kreator meningkat dengan pertumbuhan pesanan +${Math.max(0, ordersDiff)} transaksi.`,
  ];

  const nextActions = [
    `Lakukan alokasi sampel dan seeding lanjutan pada 5 top creator teratas untuk memaksimalkan momentum konversi.`,
    `Sinkronisasi stok SKU unggulan menjelang puncak kampanye marketplace berikutnya.`,
    `Tingkatkan insentif komisi bersyarat (tiered bonus) bagi afiliator dengan konsistensi live harian.`,
  ];

  // Export to PPTX
  const handleExportPPTX = async () => {
    setIsExportingPpt(true);
    try {
      await generateComparisonPPTX({
        reportName: `Affiliate Performance Comparison (${formatDateID(primaryStart)} - ${formatDateID(primaryEnd)})`,
        marketplace,
        primaryPeriod: { start: primaryStart, end: primaryEnd },
        comparePeriod: { start: compareStart, end: compareEnd },
        metricsPrimary: {
          gmv: metricsA.gmv,
          orders: metricsA.orders,
          units: metricsA.units,
          activeCreators: metricsA.activeCreators,
          commission: metricsA.commission,
          aov: aovA,
        },
        metricsCompare: {
          gmv: metricsB.gmv,
          orders: metricsB.orders,
          units: metricsB.units,
          activeCreators: metricsB.activeCreators,
          commission: metricsB.commission,
          aov: aovB,
        },
        channelSplit: {
          shopee: {
            primaryGmv: shopeeA.gmv,
            compareGmv: shopeeB.gmv,
            primaryOrders: shopeeA.orders,
            compareOrders: shopeeB.orders,
          },
          tiktok: {
            primaryGmv: tiktokA.gmv,
            compareGmv: tiktokB.gmv,
            primaryOrders: tiktokA.orders,
            compareOrders: tiktokB.orders,
          },
        },
        topCampaigns: campaignsWithGmv.map((c) => ({
          name: c.name,
          primaryGmv: c.primaryGmv,
          compareGmv: c.compareGmv,
        })),
        topCreators: creatorsWithGmv.map((c) => ({
          name: c.name,
          username: c.name.toLowerCase().replace(/\s+/g, '_'),
          marketplace: String(c.marketplace || 'Multi-platform'),
          primaryGmv: c.primaryGmv,
        })),
        narrative: {
          highlights: reportHighlights,
          whatWentWell,
          issues: ['Perlu mitigasi keterbatasan stok SKU Hero pada tanggal puncak kampanye.'],
          nextActions,
        },
      });
      toast.success('Presentasi PowerPoint (.pptx) berhasil di-generate dan diunduh!');
    } catch (err) {
      console.error(err);
      toast.error('Gagal men-generate file PowerPoint.');
    } finally {
      setIsExportingPpt(false);
    }
  };

  // Save report to workspace
  const handleSaveReport = async () => {
    setIsSaving(true);
    try {
      const reportTitle = `Recap ${marketplace} (${formatDateID(primaryStart)} vs ${formatDateID(compareStart)})`;
      await mutate([
        {
          table: 'reports',
          record: {
            id: 'rep_' + Date.now(),
            created_at: new Date().toISOString(),
            name: reportTitle,
            report_type: 'Comparative Analysis',
            marketplace,
            period_start: primaryStart,
            period_end: primaryEnd,
            cutoff_date: primaryEnd,
            what_went_well: whatWentWell.join('\n'),
            issues: 'Review stok SKU dan jadwal live creator.',
            next_action: nextActions.join('\n'),
            status: 'Ready',
          },
        },
      ]);
      toast.success(`Report "${reportTitle}" berhasil disimpan ke daftar report workspace!`);
      setActiveTab('saved');
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan report.');
    } finally {
      setIsSaving(false);
    }
  };

  const savedReports = records(data, 'reports').filter((r) => !monthly || r.report_type === 'Monthly Recap');

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <FileBarChart2 size={20} />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Reporting & Comparison Hub
            </h1>
          </div>
          <p className="text-sm text-[#64748B]">
            Pilih rentang tanggal utama & tanggal pembanding. Sistem otomatis menganalisis performa, menyusun ringkasan eksekutif, dan siap diekspor ke PPTX atau PDF.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex items-center p-1 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0]">
            <button
              onClick={() => setActiveTab('studio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'studio'
                  ? 'bg-white text-[#0F172A] shadow-sm'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Sparkles size={14} className={activeTab === 'studio' ? 'text-blue-600' : ''} />
              Studio Pembuat & Compare
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'saved'
                  ? 'bg-white text-[#0F172A] shadow-sm'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <FileText size={14} />
              Arsip Report ({savedReports.length})
            </button>
          </div>
          {canOperate(role, 'reports') && <NewReportButton monthly={monthly} />}
        </div>
      </div>

      {activeTab === 'studio' && (
        <div className="space-y-6">
          {/* Controls & Date Selection Panel */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-blue-600" />
                <span className="text-sm font-bold text-[#0F172A]">Konfigurasi Periode Analisis</span>
              </div>

              {/* Marketplace Selector */}
              <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0]">
                {(['Multi-platform', 'Shopee', 'TikTok'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMarketplace(m)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      marketplace === m
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    {m === 'Multi-platform' ? 'Semua Platform' : m}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Pickers Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Primary Period */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    1. Periode Utama (Current Period)
                  </span>
                  <span className="text-[11px] text-[#64748B] font-medium">
                    {formatDateID(primaryStart)} — {formatDateID(primaryEnd)}
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handlePrimaryPreset('sep-mtd')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium border transition-colors ${
                      primaryPreset === 'sep-mtd'
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-[#E2E8F0] text-[#64748B] hover:bg-slate-50'
                    }`}
                  >
                    Sep 2026 MTD (1-30 Sep)
                  </button>
                  <button
                    onClick={() => handlePrimaryPreset('last-14')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium border transition-colors ${
                      primaryPreset === 'last-14'
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-[#E2E8F0] text-[#64748B] hover:bg-slate-50'
                    }`}
                  >
                    14 Hari Terakhir (17-30 Sep)
                  </button>
                  <button
                    onClick={() => handlePrimaryPreset('peak-sale')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium border transition-colors ${
                      primaryPreset === 'peak-sale'
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-[#E2E8F0] text-[#64748B] hover:bg-slate-50'
                    }`}
                  >
                    Mega Sale 9.9 (8-14 Sep)
                  </button>
                  <button
                    onClick={() => handlePrimaryPreset('custom')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium border transition-colors ${
                      primaryPreset === 'custom'
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-[#E2E8F0] text-[#64748B] hover:bg-slate-50'
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {/* Date Inputs */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label htmlFor="primary-start-date" className="text-[11px] font-semibold text-[#64748B] block mb-1">Mulai Dari</label>
                    <input
                      id="primary-start-date"
                      type="date"
                      value={primaryStart}
                      onChange={(e) => {
                        setPrimaryStart(e.target.value);
                        setPrimaryPreset('custom');
                      }}
                      className="w-full text-xs font-medium px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="primary-end-date" className="text-[11px] font-semibold text-[#64748B] block mb-1">Sampai Dengan</label>
                    <input
                      id="primary-end-date"
                      type="date"
                      value={primaryEnd}
                      onChange={(e) => {
                        setPrimaryEnd(e.target.value);
                        setPrimaryPreset('custom');
                      }}
                      className="w-full text-xs font-medium px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Compare Period */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                    2. Periode Pembanding (Compare With)
                  </span>
                  <span className="text-[11px] text-[#64748B] font-medium">
                    {formatDateID(compareStart)} — {formatDateID(compareEnd)}
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleComparePreset('prev-period')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium border transition-colors ${
                      comparePreset === 'prev-period'
                        ? 'bg-slate-200 border-slate-400 text-slate-800'
                        : 'bg-white border-[#E2E8F0] text-[#64748B] hover:bg-slate-50'
                    }`}
                  >
                    Periode Sebelumnya (Equal Days)
                  </button>
                  <button
                    onClick={() => handleComparePreset('prev-month')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium border transition-colors ${
                      comparePreset === 'prev-month'
                        ? 'bg-slate-200 border-slate-400 text-slate-800'
                        : 'bg-white border-[#E2E8F0] text-[#64748B] hover:bg-slate-50'
                    }`}
                  >
                    Bulan Sebelumnya (Agustus 2026)
                  </button>
                  <button
                    onClick={() => handleComparePreset('custom')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium border transition-colors ${
                      comparePreset === 'custom'
                        ? 'bg-slate-200 border-slate-400 text-slate-800'
                        : 'bg-white border-[#E2E8F0] text-[#64748B] hover:bg-slate-50'
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {/* Date Inputs */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label htmlFor="compare-start-date" className="text-[11px] font-semibold text-[#64748B] block mb-1">Mulai Dari</label>
                    <input
                      id="compare-start-date"
                      type="date"
                      value={compareStart}
                      onChange={(e) => {
                        setCompareStart(e.target.value);
                        setComparePreset('custom');
                      }}
                      className="w-full text-xs font-medium px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="compare-end-date" className="text-[11px] font-semibold text-[#64748B] block mb-1">Sampai Dengan</label>
                    <input
                      id="compare-end-date"
                      type="date"
                      value={compareEnd}
                      onChange={(e) => {
                        setCompareEnd(e.target.value);
                        setComparePreset('custom');
                      }}
                      className="w-full text-xs font-medium px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Optional Client / Campaign Dropdown Filter */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="text-xs font-semibold text-[#64748B]">Filter Tambahan:</div>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A]"
              >
                <option value="">Semua Client</option>
                {data.entities.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A]"
              >
                <option value="">Semua Campaign</option>
                {data.entities.campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Toolbar for Instant Exports */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-950 text-white shadow-md">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-300 block">
                Hasil Analisis & Persiapan Report Siap
              </span>
              <h3 className="text-base font-bold text-white">
                Siap diekspor ke format eksekutif presentasi & dokumen
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPrintModal(true)}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold gap-1.5"
              >
                <Printer size={15} /> Cetak / PDF
              </Button>

              <Button
                onClick={handleExportPPTX}
                disabled={isExportingPpt}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold gap-1.5 shadow-sm"
              >
                <Download size={15} />
                {isExportingPpt ? 'Menyiapkan PPTX...' : 'Download PPTX'}
              </Button>

              <Button
                variant="secondary"
                onClick={handleSaveReport}
                disabled={isSaving}
                className="text-xs font-semibold gap-1.5"
              >
                <Check size={15} />
                {isSaving ? 'Menyimpan...' : 'Simpan ke Arsip'}
              </Button>
            </div>
          </div>

          {/* KPI Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* GMV Card */}
            <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#64748B]">Total Affiliate GMV</span>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    gmvGrowth >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {gmvGrowth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {gmvGrowth >= 0 ? '+' : ''}
                  {gmvGrowth.toFixed(1)}%
                </span>
              </div>
              <div className="text-xl font-bold text-[#0F172A]">{money(metricsA.gmv)}</div>
              <div className="flex items-center justify-between text-xs text-[#64748B] pt-1 border-t border-[#F1F5F9]">
                <span>Periode Lalu: {money(metricsB.gmv)}</span>
                <span className={gmvDiff >= 0 ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
                  {gmvDiff >= 0 ? '+' : ''}
                  {money(gmvDiff)}
                </span>
              </div>
            </div>

            {/* Orders Card */}
            <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#64748B]">Pesanan (Orders)</span>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    ordersGrowth >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {ordersGrowth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {ordersGrowth >= 0 ? '+' : ''}
                  {ordersGrowth.toFixed(1)}%
                </span>
              </div>
              <div className="text-xl font-bold text-[#0F172A]">{metricsA.orders.toLocaleString()}</div>
              <div className="flex items-center justify-between text-xs text-[#64748B] pt-1 border-t border-[#F1F5F9]">
                <span>Periode Lalu: {metricsB.orders.toLocaleString()}</span>
                <span className={ordersDiff >= 0 ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
                  {ordersDiff >= 0 ? '+' : ''}
                  {ordersDiff.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Creators Card */}
            <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#64748B]">Kreator Menghasilkan Sales</span>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    creatorDiff >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {creatorDiff >= 0 ? '+' : ''}
                  {creatorDiff} kreator
                </span>
              </div>
              <div className="text-xl font-bold text-[#0F172A]">{metricsA.activeCreators}</div>
              <div className="flex items-center justify-between text-xs text-[#64748B] pt-1 border-t border-[#F1F5F9]">
                <span>Periode Lalu: {metricsB.activeCreators}</span>
                <span className="text-blue-600 font-medium">{metricsA.units} unit terjual</span>
              </div>
            </div>

            {/* AOV Card */}
            <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#64748B]">Average Order Value (AOV)</span>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    aovGrowth >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {aovGrowth >= 0 ? '+' : ''}
                  {aovGrowth.toFixed(1)}%
                </span>
              </div>
              <div className="text-xl font-bold text-[#0F172A]">{money(aovA)}</div>
              <div className="flex items-center justify-between text-xs text-[#64748B] pt-1 border-t border-[#F1F5F9]">
                <span>Periode Lalu: {money(aovB)}</span>
                <span className="text-[#64748B]">Komisi: {money(metricsA.commission)}</span>
              </div>
            </div>
          </div>

          {/* Comparison Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Channel Performance Breakdown */}
            <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                  <Layers size={16} className="text-blue-600" />
                  Perbandingan Performa Marketplace
                </h4>
                <span className="text-xs text-[#64748B]">Shopee vs TikTok Shop</span>
              </div>

              <div className="space-y-3">
                {/* Shopee Row */}
                <div className="p-3 rounded-xl bg-orange-50/50 border border-orange-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-orange-950 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                      Shopee Affiliate
                    </span>
                    <span className="text-xs font-bold text-orange-700">{money(shopeeA.gmv)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] text-[#64748B] pt-1 border-t border-orange-100">
                    <div>
                      Periode Lalu: <span className="font-semibold text-[#0F172A]">{money(shopeeB.gmv)}</span>
                    </div>
                    <div>
                      Orders: <span className="font-semibold text-[#0F172A]">{shopeeA.orders}</span>
                    </div>
                    <div>
                      Growth:{' '}
                      <span
                        className={`font-semibold ${
                          shopeeB.gmv > 0 && shopeeA.gmv >= shopeeB.gmv ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {shopeeB.gmv > 0 ? (((shopeeA.gmv - shopeeB.gmv) / shopeeB.gmv) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* TikTok Row */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                      TikTok Shop Creator
                    </span>
                    <span className="text-xs font-bold text-slate-900">{money(tiktokA.gmv)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] text-[#64748B] pt-1 border-t border-slate-200">
                    <div>
                      Periode Lalu: <span className="font-semibold text-[#0F172A]">{money(tiktokB.gmv)}</span>
                    </div>
                    <div>
                      Orders: <span className="font-semibold text-[#0F172A]">{tiktokA.orders}</span>
                    </div>
                    <div>
                      Growth:{' '}
                      <span
                        className={`font-semibold ${
                          tiktokB.gmv > 0 && tiktokA.gmv >= tiktokB.gmv ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {tiktokB.gmv > 0 ? (((tiktokA.gmv - tiktokB.gmv) / tiktokB.gmv) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Contributing Campaigns */}
            <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-600" />
                  Top Campaign Pendorong Sales
                </h4>
                <span className="text-xs text-[#64748B]">Periode Utama</span>
              </div>

              <div className="space-y-2">
                {campaignsWithGmv.map((camp) => (
                  <div
                    key={camp.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="text-xs font-semibold text-[#0F172A] block truncate">{camp.name}</span>
                      <span className="text-[10px] text-[#64748B]">{camp.marketplace}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-[#0F172A] block">{money(camp.primaryGmv)}</span>
                      <span
                        className={`text-[10px] font-semibold ${
                          camp.growth >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {camp.growth >= 0 ? '+' : ''}
                        {camp.growth.toFixed(1)}% vs prev
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Executive Narrative & Highlights */}
          <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" />
                Catatan Eksekutif & Temuan Kunci (Otomatis Disusun)
              </h4>
              <span className="text-xs text-blue-600 font-medium">Included in PPTX & PDF</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 space-y-2">
                <span className="font-bold text-blue-900 block">Temuan Utama</span>
                <ul className="space-y-1.5 text-blue-950">
                  {reportHighlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-blue-500 shrink-0">•</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-2">
                <span className="font-bold text-emerald-900 block">Pencapaian Positif (Wins)</span>
                <ul className="space-y-1.5 text-emerald-950">
                  {whatWentWell.map((w, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-500 shrink-0">•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 block">Rekomendasi Langkah Berikutnya</span>
                <ul className="space-y-1.5 text-slate-800">
                  {nextActions.map((a, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-slate-500 shrink-0">•</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Saved Reports Archive Table */}
      {activeTab === 'saved' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Daftar Report & Snapshot Arsip</h3>
              <p className="text-xs text-[#64748B]">
                Semua report mingguan, bulanan, dan perbandingan yang tersimpan dalam sistem.
              </p>
            </div>
          </div>

          <OperationsTable
            table="reports"
            hideCreate
            rows={savedReports}
            render={(key, r) => (key === 'name' ? <Link href={'/reports/' + r.id} className="font-semibold text-blue-600 hover:underline">{r.name}</Link> : undefined)}
            actions={(r) => (
              <div className="flex items-center gap-2">
                <Link href={'/reports/' + r.id} className="ops-text-link">
                  Buka Detail →
                </Link>
              </div>
            )}
          />
        </div>
      )}

      {/* Print / PDF Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <Printer className="text-blue-600" size={20} />
                <h3 className="text-lg font-bold text-[#0F172A]">Executive Report Print / PDF Preview</h3>
              </div>
              <Button variant="ghost" onClick={() => setShowPrintModal(false)}>
                Tutup
              </Button>
            </div>

            <div className="p-6 border border-[#E2E8F0] rounded-xl bg-white space-y-5" id="printable-report">
              <div className="border-b border-[#CBD5E1] pb-3">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-600">AffiliateOS Executive Summary</div>
                <h2 className="text-2xl font-bold text-[#0F172A]">
                  Affiliate Performance Comparison ({formatDateID(primaryStart)} vs {formatDateID(compareStart)})
                </h2>
                <div className="text-xs text-[#64748B] mt-1">
                  Marketplace: {marketplace} · Filter: {selectedClient ? 'Filtered Client' : 'All Clients'}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Affiliate GMV</div>
                  <div className="text-base font-bold text-slate-900">{money(metricsA.gmv)}</div>
                  <div className="text-[10px] text-emerald-600 font-semibold">
                    {gmvGrowth >= 0 ? '+' : ''}{gmvGrowth.toFixed(1)}% vs prev
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Total Orders</div>
                  <div className="text-base font-bold text-slate-900">{metricsA.orders}</div>
                  <div className="text-[10px] text-emerald-600 font-semibold">
                    {ordersGrowth >= 0 ? '+' : ''}{ordersGrowth.toFixed(1)}% vs prev
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Selling Creators</div>
                  <div className="text-base font-bold text-slate-900">{metricsA.activeCreators}</div>
                  <div className="text-[10px] text-blue-600 font-semibold">{metricsA.units} units</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Avg Order Value</div>
                  <div className="text-base font-bold text-slate-900">{money(aovA)}</div>
                  <div className="text-[10px] text-slate-500 font-medium">Prev: {money(aovB)}</div>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-900 uppercase">Channel Distribution</h5>
                <table className="w-full text-xs text-left border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="p-2 border border-slate-200">Marketplace</th>
                      <th className="p-2 border border-slate-200">Current GMV</th>
                      <th className="p-2 border border-slate-200">Compare GMV</th>
                      <th className="p-2 border border-slate-200">Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border border-slate-200 font-medium">Shopee Affiliate</td>
                      <td className="p-2 border border-slate-200">{money(shopeeA.gmv)}</td>
                      <td className="p-2 border border-slate-200">{money(shopeeB.gmv)}</td>
                      <td className="p-2 border border-slate-200">{shopeeA.orders}</td>
                    </tr>
                    <tr>
                      <td className="p-2 border border-slate-200 font-medium">TikTok Shop Creator</td>
                      <td className="p-2 border border-slate-200">{money(tiktokA.gmv)}</td>
                      <td className="p-2 border border-slate-200">{money(tiktokB.gmv)}</td>
                      <td className="p-2 border border-slate-200">{tiktokA.orders}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 text-xs">
                <h5 className="font-bold text-slate-900 uppercase">Executive Findings & Next Action</h5>
                <ul className="list-disc list-inside space-y-1 text-slate-700">
                  {reportHighlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                  {nextActions.map((a, i) => (
                    <li key={'a' + i}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
              <Button variant="outline" onClick={() => setShowPrintModal(false)}>
                Batal
              </Button>
              <Button
                onClick={() => {
                  window.print();
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white gap-1.5"
              >
                <Printer size={15} /> Cetak / Simpan sebagai PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Reports({ id, monthly = false }: { id?: string; monthly?: boolean }) {
  const { data, role, finalize, mutate } = useWorkspace();
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [aiNarrativeModal, setAiNarrativeModal] = useState(false);
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [aiNarrativeDraft, setAiNarrativeDraft] = useState<{
    key_highlights: string[];
    what_went_well: string[];
    issues: string[];
    next_actions: string[];
    limitations: string[];
  } | null>(null);
  const activeStep = 3;

  const report = id ? records(data, 'reports').find((r) => r.id === id) : undefined;

  if (id && !report)
    return (
      <div className="panel ops-empty">
        <h2>Report not found</h2>
        <Link href="/reports">Back to reports</Link>
      </div>
    );

  if (!report) return <CompareReportStudio monthly={monthly} />;

  const snapshot = records(data, 'report_snapshots').find((s) => s.report_id === id);
  const frozen = snapshot ? JSON.parse(String(snapshot.snapshot_json)) : null;

  const dataset: ReportDataset = frozen?.reportDataset || buildReportDataset({ report, data });

  const period = {
    start: String(report.period_start),
    end: String(report.period_end) < String(report.cutoff_date) ? String(report.period_end) : String(report.cutoff_date),
    cutoff: String(report.cutoff_date),
  };
  const filter = {
    campaign_id: report.campaign_id ? String(report.campaign_id) : undefined,
    client_id: report.client_id ? String(report.client_id) : undefined,
  };

  const m = frozen?.metrics || metrics(data, period, String(report.marketplace), filter);
  const sources: SourceLineage[] = frozen?.sources || data.imports.filter((job) => m.sourceImportIds.includes(job.id));
  const template = templateFor(String(report.report_type), String(report.marketplace));
  const rules = records(data, 'business_rules');

  async function handleGenerateNarrative() {
    setAiDraftLoading(true);
    try {
      const res = await fetch('/api/ai/report-narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: id, language: 'id' }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        data?: {
          key_highlights: string[];
          what_went_well: string[];
          issues: string[];
          next_actions: string[];
          limitations: string[];
        };
      };
      if (!res.ok) throw new Error(json.error || 'Failed to draft narratives');
      if (json.data) {
        setAiNarrativeDraft(json.data);
        setAiNarrativeModal(true);
        toast.success('Generated AI report narrative draft');
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAiDraftLoading(false);
    }
  }

  async function handleApplyNarrativeDraft() {
    if (!aiNarrativeDraft || !report) return;
    setBusy(true);
    try {
      await mutate([
        {
          table: 'reports',
          record: {
            ...report,
            what_went_well: aiNarrativeDraft.what_went_well.join('\n'),
            issues: aiNarrativeDraft.issues.join('\n'),
            next_action: aiNarrativeDraft.next_actions.join('\n'),
          },
        },
      ]);
      toast.success('Applied AI draft to report narratives');
      setAiNarrativeModal(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const shopeeCoverage = getWorkspaceDataCoverage(data, 'Shopee', period.cutoff);
  const tiktokCoverage = getWorkspaceDataCoverage(data, 'TikTok', period.cutoff);

  const isMarketplaceH2Ready =
    report.marketplace === 'Shopee'
      ? shopeeCoverage.isH2Ready
      : report.marketplace === 'TikTok'
        ? tiktokCoverage.isH2Ready
        : shopeeCoverage.isH2Ready && tiktokCoverage.isH2Ready;

  const ruleStatus = (metricId: string) =>
    frozen
      ? snapshotMetricStatus(frozen, metricId)
      : metricConfirmationStatus(rules, {
          canonicalMetricId: metricId,
          marketplace: String(report.marketplace),
          clientId: report.client_id ? String(report.client_id) : undefined,
          templateId: template.id,
          asOf: period.end,
        });

  const gmvMetric =
    report.marketplace === 'Shopee'
      ? 'shopee.affiliate_gmv'
      : report.marketplace === 'TikTok'
        ? 'tiktok.affiliate_gmv'
        : 'common.affiliate_gmv';

  const isFinal = Boolean(snapshot);
  const canFinalize = canOperate(role, 'reports') && !isFinal;

  const previewSlides = [
    { slideIndex: 16, title: 'Affiliate KPI Summary', classification: 'SUPPORTED' },
    { slideIndex: 17, title: 'Funnel Split', classification: 'PARTIALLY_SUPPORTED' },
    { slideIndex: 18, title: 'Brand Performance', classification: 'SUPPORTED' },
    { slideIndex: 19, title: 'Rank-Up Program', classification: 'SOURCE_UNAVAILABLE' },
    { slideIndex: 20, title: 'Peak Day Comparison', classification: 'SUPPORTED' },
    { slideIndex: 21, title: 'Snapshot & Narratives', classification: 'SUPPORTED' },
    { slideIndex: 31, title: 'Q4 Activation Plan', classification: 'PARTIALLY_SUPPORTED' },
  ];

  const supportedSlidesCount = previewSlides.filter((s) => s.classification === 'SUPPORTED').length;
  const totalSlidesCount = previewSlides.length;

  return (
    <>
      <Heading title={report.name} description={`${report.report_type} · ${report.marketplace} · ${formatDateID(period.start)} to ${formatDateID(period.end)}`}>
        <div className="flex items-center gap-2">
          {canOperate(role, 'reports') && (
            <Button variant="outline" onClick={() => setEdit(true)}>
              Edit details
            </Button>
          )}
          {!isFinal && (
            <a href={`/api/reports/${id}/export?format=xlsx`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-700 hover:bg-slate-800 transition-colors">
              <FileSpreadsheet size={14} /> Download Excel
            </a>
          )}
          {!isFinal && (
            <a href={`/api/reports/${id}/export?format=pptx`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-700 hover:bg-slate-800 transition-colors">
              <Download size={14} /> Download PPTX
            </a>
          )}
          {canFinalize && (
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await finalize(String(id));
                  toast.success('Report finalized · frozen snapshot created');
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Finalization failed');
                } finally {
                  setBusy(false);
                }
              }}
            >
              Finalize report
            </Button>
          )}
        </div>
      </Heading>

      {/* Streamlined Report Preparation Flow Indicator */}
      <div className="panel p-3 mb-6 bg-slate-900/40 border border-slate-800">
        <div className="flex items-center justify-between text-xs overflow-x-auto gap-2">
          {[
            '1. Select Profile',
            '2. Define Period',
            '3. Coverage Check',
            '4. Draft Dataset',
            '5. Review Metrics',
            '6. Add Narratives',
            '7. PPT Preview',
            '8. Finalize',
            '9. Export',
          ].map((stepName, i) => (
            <div
              key={stepName}
              className={`flex items-center gap-1 font-semibold px-2 py-1 rounded transition-colors ${
                i + 1 === activeStep
                  ? 'bg-blue-500 text-white'
                  : i + 1 < activeStep || isFinal
                    ? 'text-emerald-400'
                    : 'text-slate-400'
              }`}
            >
              <span>{stepName}</span>
              {i < 8 && <span className="text-slate-600 font-normal">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Report Readiness Summary Widget */}
      <section className="panel ops-panel mb-6">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-blue-400" />
            <h2 className="text-base font-semibold">Report Readiness Summary</h2>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              isFinal
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : isMarketplaceH2Ready
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}
          >
            {isFinal
              ? 'FINALIZED SNAPSHOT'
              : isMarketplaceH2Ready
                ? 'READY FOR REVIEW'
                : 'DATA INCOMPLETE (H-2 Missing)'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="panel p-3 bg-muted/20">
            <div className="text-muted-foreground mb-1">Shopee Data Status</div>
            <div className="font-semibold flex items-center gap-1.5">
              <PlatformIcon market="Shopee" />
              {shopeeCoverage.isH2Ready ? (
                <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12} /> H-2 Ready ({shopeeCoverage.coverageEnd})</span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1"><AlertTriangle size={12} /> Incomplete ({shopeeCoverage.coverageEnd || 'No data'})</span>
              )}
            </div>
          </div>

          <div className="panel p-3 bg-muted/20">
            <div className="text-muted-foreground mb-1">TikTok Data Status</div>
            <div className="font-semibold flex items-center gap-1.5">
              <PlatformIcon market="TikTok" />
              {tiktokCoverage.isH2Ready ? (
                <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12} /> H-2 Ready ({tiktokCoverage.coverageEnd})</span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1"><AlertTriangle size={12} /> Incomplete ({tiktokCoverage.coverageEnd || 'No data'})</span>
              )}
            </div>
          </div>

          <div className="panel p-3 bg-muted/20">
            <div className="text-muted-foreground mb-1">Report Dataset Schema</div>
            <div className="font-semibold text-emerald-400 flex items-center gap-1 font-mono">
              <CheckCircle2 size={12} /> Schema {dataset.schemaVersion}
            </div>
          </div>

          <div className="panel p-3 bg-muted/20">
            <div className="text-muted-foreground mb-1">PPT Slide Readiness</div>
            <div className="font-semibold text-slate-200">
              {supportedSlidesCount} / {totalSlidesCount} Supported Slides
            </div>
          </div>
        </div>
      </section>

      {/* Snapshot / Metrics Overview */}
      <MetricCards
        items={[
          {
            label: 'Affiliate GMV',
            value: money(m.gmv),
            detail: `Metric status: ${ruleStatus(gmvMetric)}`,
          },
          {
            label: 'Orders',
            value: m.orders.toLocaleString(),
            detail: `Units: ${m.units.toLocaleString()}`,
          },
          {
            label: 'Active Affiliates',
            value: m.affiliates.toLocaleString(),
            detail: `Coverage: ${formatDateID(period.start)} to ${formatDateID(period.end)}`,
          },
          {
            label: 'Commission',
            value: money(m.commission),
            detail: `Cutoff: ${formatDateID(period.cutoff)}`,
          },
        ]}
      />

      {/* Slide Preview & PowerPoint Template Specification */}
      <section className="panel ops-panel mb-6">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Eye size={17} className="text-blue-400" />
              PPT Slide Preview & Template Integration
            </h2>
            <p className="text-xs text-muted-foreground">
              {template.name} ({template.id}) · 16:9 widescreen · Slide 19 is SOURCE_UNAVAILABLE
            </p>
          </div>
          {!isFinal && (
            <a href={`/api/reports/${id}/export?format=pptx`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-700 hover:bg-slate-800 transition-colors">
              <Download size={13} /> Export PowerPoint
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {previewSlides.map((s) => (
            <div key={s.slideIndex} className="panel p-4 flex flex-col justify-between border-slate-800 bg-slate-900/50">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-semibold text-blue-400">Slide {s.slideIndex}</span>
                  <span
                    className="demo-badge"
                    style={{
                      backgroundColor:
                        s.classification === 'SUPPORTED'
                          ? '#E6F4EA'
                          : s.classification === 'PARTIALLY_SUPPORTED'
                            ? '#FEF7E0'
                            : '#FCE8E6',
                      color:
                        s.classification === 'SUPPORTED'
                          ? '#137333'
                          : s.classification === 'PARTIALLY_SUPPORTED'
                            ? '#B06000'
                            : '#C5221F',
                    }}
                  >
                    {s.classification}
                  </span>
                </div>
                <h3 className="text-sm font-semibold mb-1 text-slate-200">{s.title}</h3>
                {s.slideIndex === 19 && (
                  <p className="text-xs text-red-400 mt-2">
                    Rank-Up Program data is not imported in AffiliateOS. Marked SOURCE_UNAVAILABLE and omitted from export.
                  </p>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-muted-foreground">
                <span>Frozen values ready</span>
                <span className="text-blue-400">Preview →</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Data Lineage & Source Imports */}
      <section className="panel ops-table-panel mb-6">
        <div className="ops-panel-heading">
          <div>
            <h2>Data Lineage & Source Evidence</h2>
            <p>{sources.length} source import{sources.length === 1 ? '' : 's'} contribute to this frozen report period.</p>
          </div>
          <Link href="/imports" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
            Open Import Center →
          </Link>
        </div>
        <div className="ops-scroll">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Marketplace</th>
                <th>Source File</th>
                <th>Sales Metric</th>
                <th>Covered Period</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr key={source.id}>
                  <td>{source.marketplace}</td>
                  <td>
                    <Link href="/imports" className="font-semibold hover:underline flex items-center gap-1.5">
                      <FileSpreadsheet size={14} />
                      {source.filename || source.source_type || 'Payment Order'}
                    </Link>
                  </td>
                  <td>{source.sales_metric || 'Processed affiliate sales'}</td>
                  <td>
                    {source.period_start && source.period_end
                      ? `${formatDateID(source.period_start)} — ${formatDateID(source.period_end)}`
                      : 'All dates in file'}
                  </td>
                  <td>
                    <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      {source.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!sources.length && <div className="ops-empty">No imported rows contribute to this period.</div>}
        </div>
      </section>

      {/* Executive Narratives */}
      <div className="flex items-center justify-between mt-6 mb-2">
        <h2 className="text-sm font-semibold">Executive Narratives</h2>
        {!isFinal && canOperate(role, 'reports') && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateNarrative}
            disabled={aiDraftLoading}
            className="text-xs h-7 gap-1 border-blue-800 text-blue-300 hover:bg-blue-950/40"
          >
            <span>✨</span> {aiDraftLoading ? 'Drafting...' : 'Draft with Gemini'}
          </Button>
        )}
      </div>

      <div className="ops-narratives">
        {[
          ['what_went_well', 'What went well'],
          ['issues', 'Issues'],
          ['next_action', 'Next action'],
        ].map(([key, label]) => (
          <section className="panel ops-panel" key={key}>
            <h2>{label}</h2>
            <p className="ops-narrative">
              {String((frozen?.narrative || report)[key] || 'No narrative added yet.')}
            </p>
          </section>
        ))}
      </div>

      {aiNarrativeModal && aiNarrativeDraft && (
        <Sheet open onOpenChange={setAiNarrativeModal}>
          <SheetContent className="entity-sheet sm:max-w-[560px] overflow-y-auto">
            <SheetHeader>
              <div className="flex items-center gap-2">
                <SheetTitle>AI Report Narrative Draft</SheetTitle>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-900/60 text-blue-300 border border-blue-800">
                  AI Draft
                </span>
              </div>
              <SheetDescription>
                Generated from official structured report metrics. Review and approve before updating report fields.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 text-xs mt-4">
              <div>
                <span className="font-semibold text-slate-300 block mb-1">Key Highlights</span>
                <ul className="list-disc list-inside space-y-1 text-slate-200 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                  {aiNarrativeDraft.key_highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="font-semibold text-slate-300 block mb-1">What Went Well</span>
                <ul className="list-disc list-inside space-y-1 text-slate-200 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                  {aiNarrativeDraft.what_went_well.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="font-semibold text-slate-300 block mb-1">Issues & Bottlenecks</span>
                <ul className="list-disc list-inside space-y-1 text-slate-200 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                  {aiNarrativeDraft.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="font-semibold text-slate-300 block mb-1">Next Actions</span>
                <ul className="list-disc list-inside space-y-1 text-slate-200 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                  {aiNarrativeDraft.next_actions.map((act, i) => (
                    <li key={i}>{act}</li>
                  ))}
                </ul>
              </div>

              {aiNarrativeDraft.limitations.length > 0 && (
                <div className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800">
                  Limitations: {aiNarrativeDraft.limitations.join(' · ')}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <Button variant="ghost" onClick={() => setAiNarrativeModal(false)}>
                  Discard
                </Button>
                <Button variant="outline" onClick={handleGenerateNarrative} disabled={aiDraftLoading}>
                  Regenerate
                </Button>
                <Button onClick={handleApplyNarrativeDraft} disabled={busy}>
                  Use Draft
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {edit && <OpForm table="reports" record={report} onClose={() => setEdit(false)} />}
    </>
  );
}

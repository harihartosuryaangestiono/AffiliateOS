'use client';
import Link from 'next/link';
import { PackageX, ArrowRight, ShieldAlert } from 'lucide-react';
import type { StockPerformanceItem } from '@/lib/analytics/types';
import { money, number } from '@/lib/data/metrics';

interface Props {
  items: StockPerformanceItem[];
}

export function StockCorrelationSection({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-2xs space-y-2">
        <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
          <ShieldAlert size={16} />
          <span>Stock × Performance: Healthy</span>
        </div>
        <p className="text-xs text-[#64748B]">
          No high-velocity or fast-growing SKUs currently have Low or Critical stock in the latest imported snapshot.
        </p>
      </div>
    );
  }

  const riskBadge = (type: StockPerformanceItem['riskType']) => {
    switch (type) {
      case 'HIGH_GMV_CRITICAL_STOCK':
        return { label: 'High GMV + Critical Stock', bg: 'bg-rose-100 text-rose-800 border-rose-300' };
      case 'HIGH_GMV_LOW_STOCK':
        return { label: 'High GMV + Low Stock', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'STRONG_GROWTH_LOW_STOCK':
        return { label: 'Fast Growth + Low Stock', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'HSL_HERO_CRITICAL_STOCK':
        return { label: 'HSL Hero SKU + Stock Risk', bg: 'bg-purple-100 text-purple-800 border-purple-300' };
      case 'PEAK_DAY_SKU_LOW_STOCK':
        return { label: 'Peak Day SKU + Low Stock', bg: 'bg-red-100 text-red-800 border-red-300' };
      default:
        return { label: 'Stock Warning', bg: 'bg-slate-100 text-slate-800 border-slate-300' };
    }
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-2xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <PackageX size={16} />
          </span>
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">
              Stock × Performance Risks
            </h3>
            <p className="text-xs text-[#64748B]">
              Identifies revenue-driving SKUs facing supply constraints (Latest Imported Stock)
            </p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          {items.length} SKUs at risk
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((sku) => {
          const badge = riskBadge(sku.riskType);
          return (
            <div
              key={sku.productId}
              className="p-4 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg}`}>
                  {badge.label}
                </span>
                <div className="font-bold text-xs text-[#0F172A] line-clamp-2">
                  {sku.productName}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#FEB2B2]/60">
                <div>
                  <div className="text-[10px] font-semibold text-[#64748B]">Period GMV</div>
                  <div className="font-extrabold text-[#0F172A]">{money(sku.gmv)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-[#64748B]">Snapshot Stock</div>
                  <div className="font-extrabold text-rose-700">
                    {sku.stockQuantity !== null ? `${number(sku.stockQuantity)} units` : 'OOS'}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-[#64748B]">
                  {sku.hslCreatorsCount > 0 ? `${sku.hslCreatorsCount} HSL creators` : 'Catalog SKU'}
                </span>
                <Link
                  href={sku.actionCenterHref || `/hsl/stock?product_id=${sku.productId}`}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2563EB] hover:text-[#1D4ED8]"
                >
                  Manage Stock <ArrowRight size={11} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

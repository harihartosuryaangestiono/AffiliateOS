'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, TrendingUp, TrendingDown, Package, AlertTriangle } from 'lucide-react';
import type { ProductContributionRow } from '@/lib/analytics/types';
import { money, number } from '@/lib/data/metrics';

interface Props {
  items: ProductContributionRow[];
}

export function ProductAnalyticsTable({ items }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<keyof ProductContributionRow>('currentGmv');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const filteredItems = useMemo(() => {
    let res = items;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      res = res.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brandName.toLowerCase().includes(q),
      );
    }

    return [...res].sort((a, b) => {
      const valA = a[sortBy] ?? 0;
      const valB = b[sortBy] ?? 0;
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return sortOrder === 'asc'
        ? Number(valA) - Number(valB)
        : Number(valB) - Number(valA);
    });
  }, [items, searchTerm, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const displayedItems = filteredItems.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const handleSort = (field: keyof ProductContributionRow) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-2xs space-y-4">
      {/* Header: Title and Search Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
            <Package size={16} />
          </span>
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">
              Product Performance & Contribution
            </h3>
            <p className="text-xs text-[#64748B]">
              Granular SKU-level performance, growth rates, and stock correlation
            </p>
          </div>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
          />
          <input
            type="text"
            placeholder="Search products or brands..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#CBD5E1] text-xs font-medium bg-[#F8FAFC] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
        <table className="w-full text-left text-xs min-w-[750px]">
          <thead>
            <tr className="border-b border-[#F1F5F9] text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
              <th className="pb-3 font-semibold text-center w-12">#</th>
              <th
                className="pb-3 font-semibold cursor-pointer hover:text-[#0F172A]"
                onClick={() => handleSort('name')}
              >
                PRODUCT / BRAND
              </th>
              <th
                className="pb-3 font-semibold text-right cursor-pointer hover:text-[#0F172A]"
                onClick={() => handleSort('currentGmv')}
              >
                GMV
              </th>
              <th
                className="pb-3 font-semibold text-right cursor-pointer hover:text-[#0F172A]"
                onClick={() => handleSort('absoluteDelta')}
              >
                DELTA
              </th>
              <th
                className="pb-3 font-semibold text-center cursor-pointer hover:text-[#0F172A]"
                onClick={() => handleSort('units')}
              >
                UNITS
              </th>
              <th
                className="pb-3 font-semibold text-right cursor-pointer hover:text-[#0F172A]"
                onClick={() => handleSort('asp')}
              >
                ASP
              </th>
              <th
                className="pb-3 font-semibold text-right cursor-pointer hover:text-[#0F172A]"
                onClick={() => handleSort('contributionPct')}
              >
                CONTRIB %
              </th>
              <th className="pb-3 font-semibold text-right">CUMUL %</th>
              <th className="pb-3 font-semibold text-center">CREATORS</th>
              <th className="pb-3 font-semibold text-right">STOCK SNAPSHOT</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#F8FAFC]">
            {displayedItems.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-[#94A3B8]">
                  No products found matching the criteria.
                </td>
              </tr>
            ) : (
              displayedItems.map((p) => {
                const isRiskStock = ['Critical', 'Low', 'OOS'].includes(p.stockStatus);

                return (
                  <tr key={p.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 text-center font-bold text-[#64748B]">
                      {p.rank}
                    </td>

                    <td className="py-3 pr-3" aria-label="Product">
                      <div className="min-w-0">
                        <span className="font-bold text-[#0F172A] block truncate max-w-xs">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-[#64748B] block truncate">
                          {p.brandName}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 text-right font-bold text-[#0F172A]">
                      {money(p.currentGmv)}
                    </td>

                    <td className="py-3 text-right font-semibold">
                      {p.absoluteDelta > 0 ? (
                        <span className="text-emerald-600 inline-flex items-center gap-0.5 justify-end">
                          <TrendingUp size={11} />
                          +{money(p.absoluteDelta)}
                        </span>
                      ) : p.absoluteDelta < 0 ? (
                        <span className="text-rose-600 inline-flex items-center gap-0.5 justify-end">
                          <TrendingDown size={11} />
                          {money(p.absoluteDelta)}
                        </span>
                      ) : (
                        <span className="text-slate-400">Rp 0</span>
                      )}
                    </td>

                    <td className="py-3 text-center text-[#475569]">
                      {number(p.units)}
                    </td>

                    <td className="py-3 text-right text-[#64748B]">
                      {p.asp !== null ? money(p.asp) : '—'}
                    </td>

                    <td className="py-3 text-right font-bold text-[#0F172A]">
                      {p.contributionPct}%
                    </td>

                    <td className="py-3 text-right text-[#6366F1] font-semibold">
                      {p.cumulativePct}%
                    </td>

                    <td className="py-3 text-center text-[#475569]">
                      {p.creatorsCount}
                    </td>

                    <td className="py-3 text-right">
                      {isRiskStock ? (
                        <Link
                          href={`/hsl/stock?product_id=${p.id}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                        >
                          <AlertTriangle size={11} />
                          <span>{p.stockStatus} ({number(p.stockQuantity || 0)})</span>
                        </Link>
                      ) : (
                        <span className="text-[11px] text-[#64748B]">
                          {p.stockQuantity !== null
                            ? `${number(p.stockQuantity)} units`
                            : 'Unrecorded'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-xs text-[#64748B]">
          <div>
            Showing {(page - 1) * pageSize + 1} to{' '}
            {Math.min(page * pageSize, filteredItems.length)} of {filteredItems.length} products
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F8FAFC]"
            >
              Previous
            </button>
            <span className="px-2 font-semibold text-[#0F172A]">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F8FAFC]"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

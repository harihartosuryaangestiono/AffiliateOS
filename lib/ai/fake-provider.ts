import type { AIProvider, AIProviderOptions, AIProviderResult } from './types.ts';

export class FakeAIProvider implements AIProvider {
  readonly name = 'FakeAIProvider (Deterministic)';

  isConfigured(): boolean {
    return true;
  }

  async generateStructured<T>(options: AIProviderOptions<T>): Promise<AIProviderResult<T>> {
    const startTime = Date.now();
    const { feature, context } = options;

    let resultData: unknown;

    switch (feature) {
      case 'OUTREACH_DRAFT': {
        const creatorName = (context.creator_display_name as string) || 'Creator';
        const brand = (context.brand_name as string) || 'Haleon';
        const campaign = (context.campaign_name as string) || 'Affiliate Collaboration';

        resultData = {
          message: `Halo Kak ${creatorName}! Kami dari ${brand} ingin mengajak kolaborasi untuk ${campaign}. Apakah Kakak tertarik untuk bergabung dan menerima sample produk hero kami?`,
          tone: (context.tone as string) || 'FRIENDLY',
          reasoning_summary: `Draft references the creator's profile and ${brand} collaboration terms.`,
          warnings: context.campaign_name ? [] : ['Campaign name was not specified in context'],
        };
        break;
      }

      case 'CREATOR_INSIGHT': {
        const perf = (context.performance_summary as Record<string, unknown>) || {};
        const gmvChange = (perf.gmv_change_percentage as string) || '0%';
        const recentGmv = (perf.recent_7d_gmv_formatted as string) || 'Rp 0';
        const orders = Number(perf.recent_7d_orders || 0);

        resultData = {
          summary: `Creator generated ${recentGmv} across ${orders} orders in the last 7 days with a ${gmvChange} performance trend.`,
          positive_signals: orders > 0 ? [`Generated ${orders} orders in recent 7-day period`] : ['Active creator record'],
          risk_signals: gmvChange.startsWith('-') ? [`Performance declined ${gmvChange} compared to previous 7 days`] : [],
          suggested_next_steps: ['Review upcoming campaign alignment and lock Hero SKU assignment.'],
          data_limitations: ['Aggregated strictly from imported daily performance records.'],
        };
        break;
      }

      case 'DAILY_BRIEF': {
        const actionCenter = (context.action_center as Record<string, unknown>) || {};
        const p0Count = Number(actionCenter.p0_critical_count || 0);
        const p1Count = Number(actionCenter.p1_high_count || 0);
        const topP0 = (actionCenter.top_p0_items as Array<{ title: string; reason: string; entity_type: string; entity_id: string }>) || [];

        resultData = {
          headline: `${p0Count} Critical & ${p1Count} High Priority Items Require Attention Today`,
          summary: `Operations team should prioritize ${p0Count} critical P0 items and ${p1Count} follow-ups. Shopee and TikTok data are ready through H-2.`,
          priorities: topP0.slice(0, 3).map(p => ({
            title: p.title,
            reason: p.reason,
            related_entity_type: p.entity_type,
            related_entity_id: p.entity_id,
          })),
          watchlist: ['Monitor stock availability on Hero SKUs for upcoming Peak Days.'],
          data_limitations: ['Coverage evaluated through official H-2 data cutoff.'],
        };
        break;
      }

      case 'REPORT_NARRATIVE': {
        const kpis = (context.executive_kpis as Record<string, unknown>) || {};
        const gmv = (kpis.affiliate_gmv_formatted as string) || 'Rp 450.000.000';
        const orders = Number(kpis.orders || 1250);

        resultData = {
          key_highlights: [
            `Total affiliate GMV reached ${gmv} across ${orders} orders during the reporting period.`,
            'Oral Care brand Sensodyne contributed the largest sales share.',
          ],
          what_went_well: [
            'Top performing creators drove sustained daily conversion above baseline.',
            'Hero SKU stock coverage remained stable throughout major promotional pushes.',
          ],
          issues: [
            'Second-tier creators experienced slight order deceleration post-campaign.',
          ],
          next_actions: [
            'Re-engage inactive micro-affiliates with targeted sample packages.',
            'Finalize creator locks for upcoming Peak Day activation.',
          ],
          limitations: [
            'Rank-Up Program data SOURCE_UNAVAILABLE (excluded from report evaluation).',
            'Metrics computed strictly through official H-2 cutoff date.',
          ],
        };
        break;
      }

      case 'ASK_AFFILIATEOS': {
        const domain = (context.domain as string) || 'GENERAL';

        if (domain === 'OUTREACH') {
          const due = (context.due_creators as Array<{ creator_id: string; creator_name: string }>) || [];
          resultData = {
            answer: `Terdapat ${due.length} creator yang perlu di-follow up hari ini berdasarkan jadwal outreach workspace.`,
            references: due.slice(0, 3).map(d => ({
              entity_type: 'creator',
              entity_id: d.creator_id,
              label: d.creator_name,
            })),
            limitations: ['Berdasarkan data outreach yang tersimpan di database workspace.'],
          };
        } else if (domain === 'ACTION_CENTER') {
          const actions = (context.actions as Array<{ id: string; title: string }>) || [];
          resultData = {
            answer: `Saat ini terdapat ${actions.length} action item aktif di Action Center yang membutuhkan perhatian.`,
            references: actions.slice(0, 3).map(a => ({
              entity_type: 'action',
              entity_id: a.id,
              label: a.title,
            })),
            limitations: ['Diperbarui dari mesin sinyal operasional deterministik.'],
          };
        } else {
          resultData = {
            answer: `AffiliateOS memantau creator, kampanye, dan operasional workspace. Silakan ajukan pertanyaan seputar follow-up, Action Center, atau performa kampanye.`,
            references: [],
            limitations: ['Pertanyaan di luar cakupan operasional workspace tidak dapat dijawab.'],
          };
        }
        break;
      }

      case 'ANALYTICS_INSIGHT': {
        const marketplace = (context.marketplace as string) || 'Shopee';
        const gmv = (context.current_gmv as string) || 'Rp 0';
        const delta = (context.delta_gmv as string) || 'Rp 0';
        const growth = (context.growth_percentage as string) || '0%';
        const topDriver = (context.top_growth_driver as string) || 'Top Product';

        resultData = {
          summary: `${marketplace} affiliate performance recorded ${gmv} (${growth}, ${delta}) during the selected period. Growth was anchored by strong engagement from key creators and top SKU velocity.`,
          growth_drivers: [
            `${topDriver} contributed the largest incremental GMV movement.`,
            'Top performing affiliates sustained conversion velocity across peak promotional hours.',
          ],
          decline_drivers: [
            'Dormant affiliates without recent sample seedings experienced expected order drop-offs.',
          ],
          risks: [
            'Creator concentration: Top 5 creators contribute a significant share of revenue.',
            'Monitor stock levels for high-velocity SKUs to prevent out-of-stock scenarios.',
          ],
          opportunities: [
            'Reactivate warm creators through personalized outreach with new sample bundles.',
            'Lock high-performing creator schedules ahead of upcoming Peak Days.',
          ],
          recommended_checks: [
            'Audit SKU stock status in the Stock & HSL workspace.',
            'Review pending follow-ups in the Outreach queue for top creators.',
          ],
          limitations: [
            'All metrics are computed deterministically from imported marketplace transaction files.',
            'Cancellation and refund details are subject to BQ-01 business rules confirmation.',
          ],
        };
        break;
      }

      default:
        throw new Error('Unsupported AI feature');
    }

    // Validate structured output with schema
    const parsed = options.schema.parse(resultData);

    return {
      data: parsed,
      usage: {
        inputTokens: 120,
        outputTokens: 85,
      },
      latencyMs: Date.now() - startTime + 5,
      model: 'fake-deterministic-model',
    };
  }
}

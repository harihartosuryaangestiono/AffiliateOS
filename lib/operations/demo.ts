import type { WorkspaceData, RecordData } from '../../types/domain.ts';
import { uid } from '../../types/domain.ts';
import { defaultThresholds } from './config.ts';

export function upgradeDemo(data: WorkspaceData): WorkspaceData {
  if (data.operations?.hsl_activations) return data;

  const row = (n: number, name: string, values: Partial<RecordData>): RecordData => ({
    id: uid(n),
    name,
    status: 'Draft',
    created_at: '2026-09-08T08:00:00Z',
    ...values,
  });

  const creators = data.entities.creators.map((c, i) => ({
    ...c,
    name: c.email?.toString().endsWith('@example.com') ? 'Demo Creator ' + String(i + 1).padStart(2, '0') : c.name,
    relationship_status: i < 15 ? 'Existing' : 'Prospect',
    acquisition_stage: i < 12 ? 'Affiliate With Sales' : i < 15 ? 'Activated' : 'Prospect',
    acquisition_source: 'Manual',
  }));

  const c = creators[0];
  const campaign = data.entities.campaigns.find((cmp) => cmp.marketplace === 'Shopee');
  const account = data.shopee_accounts.find((a) => a.creator_id === c?.id);
  const product =
    data.entities.products.find((p) => p.brand_id === campaign?.brand_id) || data.entities.products[0];

  const operations: Record<string, RecordData[]> = {
    workspace_preferences: [row(9000, 'Workspace thresholds', { ...defaultThresholds })],
    outreach_templates: [
      row(9001, 'Activation invitation', {
        marketplace: 'Shopee',
        activation_type: 'HSL',
        message: 'Hi {creator_name}, would you be interested in joining {campaign_name} for {brand_name}? Happy to share the activation details.',
      }),
      row(9002, 'Follow-up', {
        marketplace: 'Multi-platform',
        activation_type: 'Follow-up',
        message: 'Hi {creator_name}, checking in on our activation discussion. Is there anything you need from our team?',
      }),
    ],
    recurring_task_templates: [
      row(9010, 'Prepare internal weekly report', { recurrence_type: 'Weekly', weekly_day: 'Monday' }),
      row(9011, 'Review Shopee weekly performance', { recurrence_type: 'Weekly', weekly_day: 'Tuesday' }),
      row(9012, 'Plan upcoming activations', { recurrence_type: 'Weekly', weekly_day: 'Wednesday' }),
      row(9013, 'Lock campaign creators', { recurrence_type: 'Weekly', weekly_day: 'Thursday' }),
      row(9014, 'Monitor active campaigns', { recurrence_type: 'Weekly', weekly_day: 'Friday' }),
      row(9015, 'Prepare monthly recap', { recurrence_type: 'Monthly', monthly_week: 1 }),
      row(9016, 'Plan next month activation', { recurrence_type: 'Monthly', monthly_week: 3 }),
    ],
  };

  if (c && campaign && account && product) {
    operations.hsl_activations = [
      row(9020, 'HSL · ' + c.name, {
        creator_id: c.id,
        campaign_id: campaign.id,
        shopee_account_id: account.id,
        status: 'Confirmed',
        start_date: '2026-09-19',
        end_date: '2026-09-30',
      }),
    ];
    operations.hsl_creator_products = [
      row(9021, 'Hero SKU', {
        hsl_activation_id: uid(9020),
        product_id: product.id,
        priority: 'Hero',
        reason: 'Manual demo assignment',
      }),
    ];
    operations.product_stock_snapshots = [
      row(9022, 'Demo stock snapshot', {
        product_id: product.id,
        marketplace: 'Shopee',
        stock_quantity: 8,
        snapshot_at: '2026-09-19',
        source: 'Manual',
      }),
    ];
    operations.peak_days = [
      row(9030, 'September Payday · Demo', {
        event_type: 'Payday',
        event_date: '2026-09-25',
        campaign_id: campaign.id,
        target_creators: 6,
        target_gmv: 15000000,
        status: 'Planning',
      }),
    ];
    operations.peak_day_creators = [
      row(9031, 'Payday creator', {
        peak_day_id: uid(9030),
        creator_id: c.id,
        format: 'Live',
        status: 'Unconfirmed',
      }),
    ];
    operations.sample_seedings = [
      row(9040, 'Demo sample', {
        creator_id: c.id,
        campaign_id: campaign.id,
        product_id: product.id,
        purpose: 'Live',
        status: 'Received',
        requested_at: '2026-09-08',
        shipped_at: '2026-09-09',
        received_at: '2026-09-11',
        expected_activation_at: '2026-09-17',
      }),
    ];
    operations.creator_outreach = [
      row(9050, 'Activation follow-up', {
        creator_id: c.id,
        campaign_id: campaign.id,
        channel: 'WhatsApp',
        reason: 'Confirm Payday live schedule',
        status: 'Follow Up',
        follow_up_at: '2026-09-19',
      }),
    ];
  }

  return {
    ...data,
    entities: { ...data.entities, creators },
    operations: { ...operations, ...data.operations },
  };
}

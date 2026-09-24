import { uid, type RecordData, type WorkspaceData } from '../../types/domain.ts';
const row = (
  n: number,
  name: string,
  values: Partial<RecordData> = {},
): RecordData => ({
  id: uid(n),
  name,
  status: 'Active',
  created_at: '2026-09-01T08:00:00Z',
  ...values,
});
const names = Array.from({length:20}, (_,i)=>'Demo Creator '+String(i+1).padStart(2,'0'));

const clients = [
  row(1, 'Haleon', {
    industry: 'Consumer healthcare',
    owner: 'Demo Operator',
  }),
  row(2, 'Paragon Technology', {
    industry: 'Beauty & personal care',
    owner: 'Demo Analyst',
  }),
  row(3, 'Unilever Indonesia', {
    industry: 'Consumer goods',
    owner: 'Demo Manager',
  }),
  row(4, 'Mayora Indah', {
    industry: 'Food & beverages',
    owner: 'Demo Analyst',
  }),
];
const brands = [
  row(11, 'Sensodyne', { client_id: uid(1), category: 'Oral care' }),
  row(12, 'Wardah', { client_id: uid(2), category: 'Beauty' }),
  row(13, 'Vaseline', { client_id: uid(3), category: 'Personal care' }),
  row(14, 'Scott’s', { client_id: uid(1), category: 'Wellness' }),
  row(15, 'Kopiko', { client_id: uid(4), category: 'Food & beverages' }),
  row(16, 'Emina', { client_id: uid(2), category: 'Beauty' }),
];
const campaigns = [
  'September Affiliate Growth',
  'Payday Creator Activation',
  'Always-On Affiliate Program',
  'Healthy Families, Happy Days',
  '9.9 Super Shopping Day',
  'Beauty in Every Day',
  'September Wellness Edit',
  'Creator Discovery Program',
].map((name, i) =>
  row(30 + i, name, {
    brand_id: brands[i % 6].id,
    marketplace:
      i % 3 === 0 ? 'Multi-platform' : i % 3 === 1 ? 'TikTok' : 'Shopee',
    start_date: '2026-09-01',
    end_date: i === 4 ? '2026-09-09' : '2026-09-30',
    target_gmv: [150, 100, 80, 65, 75, 60, 45, 40][i] * 1000000,
    target_orders: 1500,
    owner: i % 2 ? 'Demo Analyst' : 'Demo Operator',
    objective:
      'Grow attributable affiliate sales through consistent creator activation.',
  }),
);
const creators = names.map((name, i) =>
  row(100 + i, name, {
    category: ['Beauty', 'Lifestyle', 'Wellness', 'Family', 'Food & beverages'][
      i % 5
    ],
    email: name.toLowerCase().replaceAll(' ', '.') + '@example.com',
    tags: i % 3 ? 'Rising creator' : 'Top performer',
    notes: '',
    status: i === 11 ? 'Watchlist' : 'Active',
    last_activity: '2026-09-08',
  }),
);
const products = [
  'Sensodyne Repair & Protect 100g',
  'Wardah UV Shield SPF 50',
  'Vaseline Gluta-Hya Serum',
  'Scott’s Emulsion Orange 200ml',
  'Kopiko Coffee Candy 150g',
  'Emina Bright Stuff Moisturizer',
].map((name, i) =>
  row(200 + i, name, {
    brand_id: brands[i].id,
    sku: `${['SEN', 'WRD', 'VAS', 'SCT', 'KOP', 'EMN'][i]}-00${i + 1}`,
    category: brands[i].category,
  }),
);
const tasks = [
  'Review September creator deliverables',
  'Complete Demo Creator 02 campaign brief',
  'Validate Shopee 9.9 report',
  'Follow up on missing creator handles',
  'Prepare Haleon weekly performance review',
  'Confirm payday campaign product selection',
  'Review TikTok content approvals',
  'Update Wardah campaign targets',
].map((name, i) =>
  row(300 + i, name, {
    campaign_id: campaigns[i].id,
    creator_id: creators[i].id,
    client_id: brands[i % 6].client_id,
    due_date: i < 3 ? '2026-09-07' : '2026-09-12',
    priority: i < 2 ? 'High' : 'Medium',
    owner: i % 2 ? 'Demo Analyst' : 'Demo Operator',
    status: i === 5 ? 'Done' : i % 3 === 0 ? 'In Progress' : 'To Do',
  }),
);
const tiktok_accounts = creators.map((c, i) => ({
  id: uid(400 + i),
  creator_id: c.id,
  username: '@' + c.name.toLowerCase().replaceAll(' ', ''),
  followers: Math.round(28000 + Math.pow(20 - i, 2) * 860),
  status: 'Active',
}));
const shopee_accounts = creators
  .filter((_, i) => i % 3 !== 2)
  .map((c, i) => ({
    id: uid(500 + i),
    creator_id: c.id,
    username: c.name.toLowerCase().replaceAll(' ', '') + '.store',
    followers: 1500 + i * 1270,
    status: 'Active',
  }));
const trends = [
  22, 29, 25, 37, 31, 45, 38, 48, 36, 43, 57, 51, 46, 65, 57, 73, 63, 71, 60,
  83, 75, 87, 80, 101, 88, 97, 84, 104, 95, 116,
];
const weights = trends.reduce((s, n) => s + n, 0);
const tt = trends.flatMap((v, d) =>
  tiktok_accounts.map((a, i) => ({
    id: uid(1000 + d * 20 + i),
    date: `2026-09-${String(d + 1).padStart(2, '0')}`,
    account_id: a.id,
    campaign_id: campaigns.filter((c) => c.marketplace !== 'Shopee')[
      i % campaigns.filter((c) => c.marketplace !== 'Shopee').length
    ].id,
    gmv: Math.round((((351200000 * v) / weights) * (20 - i)) / 210),
    orders: Math.round((((5518 * v) / weights) * (20 - i)) / 210),
    units_sold: Math.round((((7140 * v) / weights) * (20 - i)) / 210),
    commission: Math.round((((35120000 * v) / weights) * (20 - i)) / 210),
    video_count: d < 8 && i < 12 ? 1 : 0,
    live_count: 0,
    source_import_id: uid(800),
  })),
);
const sp = trends.flatMap((v, d) =>
  shopee_accounts.map((a, i) => ({
    id: uid(3000 + d * 14 + i),
    date: `2026-09-${String(d + 1).padStart(2, '0')}`,
    account_id: a.id,
    campaign_id: campaigns.filter((c) => c.marketplace !== 'TikTok')[
      i % campaigns.filter((c) => c.marketplace !== 'TikTok').length
    ].id,
    gmv: Math.round((((77300000 * v) / weights) * (14 - i)) / 105),
    orders: Math.round((((1303 * v) / weights) * (14 - i)) / 105),
    units_sold: Math.round((((1842 * v) / weights) * (14 - i)) / 105),
    commission: Math.round((((7730000 * v) / weights) * (14 - i)) / 105),
    clicks: Math.round((((78000 * v) / weights) * (14 - i)) / 105),
    conversion_rate: 0.017,
    source_import_id: uid(801),
  })),
);
export const seed: WorkspaceData = {
  entities: { clients, brands, campaigns, creators, products, tasks },
  tiktok_accounts,
  shopee_accounts,
  tiktok_performance: tt,
  shopee_performance: sp,
  imports: [
    {
      id: uid(800),
      marketplace: 'TikTok',
      filename: 'tiktok_september_performance.csv',
      created_at: '2026-09-08T07:30:00Z',
      rows: 600,
      successful_rows: 600,
      failed_rows: 0,
      status: 'Completed',
    },
    {
      id: uid(801),
      marketplace: 'Shopee',
      filename: 'shopee_affiliate_september.xlsx',
      created_at: '2026-09-08T06:15:00Z',
      rows: 420,
      successful_rows: 420,
      failed_rows: 0,
      status: 'Completed',
    },
  ],
  activity: [
    {
      id: uid(900),
      action: 'TikTok performance imported',
      entity_type: 'imports',
      entity_id: uid(800),
      created_at: '2026-09-08T07:30:00Z',
      user: 'Demo Analyst',
    },
    {
      id: uid(901),
      action: 'September Affiliate Growth created',
      entity_type: 'campaigns',
      entity_id: uid(30),
      created_at: '2026-09-01T08:00:00Z',
      user: 'Demo Operator',
    },
  ],
  campaign_creators: creators.map((c, i) => ({
    id: uid(700 + i),
    campaign_id: campaigns[i % 8].id,
    creator_id: c.id,
  })),
  operations: {
    communication_templates: [
      {
        id: uid(950),
        name: '[DRAFT] First Outreach — Shopee',
        status: 'Active',
        category: 'FIRST_OUTREACH',
        channel: 'WHATSAPP',
        marketplace: 'Shopee',
        body: 'Halo Kak {{creator_name}}, aku dari tim {{brand_name}} untuk campaign {{campaign_name}} di {{marketplace}}. Kami tertarik untuk kolaborasi affiliate dengan Kakak untuk produk {{product_name}}. Apakah Kakak berkenan untuk diskusi detailnya?',
        is_active: true,
        current_version: 1,
        created_by: 'System',
        updated_by: 'System',
        created_at: '2026-09-01T08:00:00Z',
      },
      {
        id: uid(951),
        name: '[DRAFT] H+3 Follow-Up — General',
        status: 'Active',
        category: 'FOLLOW_UP_1',
        channel: 'WHATSAPP',
        marketplace: 'Multi-platform',
        body: 'Halo Kak {{creator_name}}, izin follow up pesan kami 3 hari lalu terkait kolaborasi {{brand_name}} di {{campaign_name}}. Mohon infonya ya Kak jika ada pertanyaan. Terima kasih!',
        is_active: true,
        current_version: 1,
        created_by: 'System',
        updated_by: 'System',
        created_at: '2026-09-01T08:00:00Z',
      },
      {
        id: uid(952),
        name: '[DRAFT] H+7 Second Follow-Up',
        status: 'Active',
        category: 'FOLLOW_UP_2',
        channel: 'WHATSAPP',
        marketplace: 'Multi-platform',
        body: 'Halo Kak {{creator_name}}, menyambung tawaran kolaborasi {{brand_name}} untuk campaign {{campaign_name}}. Kami masih membuka slot untuk Kakak sampai tanggal {{deadline}}.',
        is_active: true,
        current_version: 1,
        created_by: 'System',
        updated_by: 'System',
        created_at: '2026-09-01T08:00:00Z',
      },
      {
        id: uid(953),
        name: '[DRAFT] Sample Delivery Follow-Up',
        status: 'Active',
        category: 'SAMPLE_FOLLOW_UP',
        channel: 'WHATSAPP',
        marketplace: 'Multi-platform',
        body: 'Halo Kak {{creator_name}}, produk sampel {{product_name}} dari {{brand_name}} sudah sampai ya Kak. Mohon bantuannya untuk info rencana penayangan konten / live session. Terima kasih!',
        is_active: true,
        current_version: 1,
        created_by: 'System',
        updated_by: 'System',
        created_at: '2026-09-01T08:00:00Z',
      },
      {
        id: uid(954),
        name: '[DRAFT] HSL Hero SKU Confirmation',
        status: 'Active',
        category: 'HSL',
        channel: 'WHATSAPP',
        marketplace: 'Shopee',
        body: 'Halo Kak {{creator_name}}, untuk program HSL campaign {{campaign_name}} di {{marketplace}}, kami merekomendasikan hero SKU {{product_name}}. Mohon konfirmasinya ya Kak.',
        is_active: true,
        current_version: 1,
        created_by: 'System',
        updated_by: 'System',
        created_at: '2026-09-01T08:00:00Z',
      },
    ],
  },
};

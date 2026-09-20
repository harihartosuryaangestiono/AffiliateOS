export type Role = 'Admin' | 'Affiliate Manager' | 'Analyst' | 'Viewer';
export type Marketplace = 'TikTok' | 'Shopee' | 'Multi-platform';
export type Entity =
  | 'clients'
  | 'brands'
  | 'campaigns'
  | 'creators'
  | 'products'
  | 'tasks';
export type RecordData = {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at?: string;
  [key: string]: string | number | null | undefined;
};
export type Account = {
  id: string;
  creator_id: string;
  username: string;
  followers: number;
  status: string;
};
export type Performance = {
  id: string;
  date: string;
  account_id: string;
  campaign_id: string;
  product_id?: string;
  gmv: number;
  orders: number;
  units_sold: number;
  commission: number;
  source_import_id: string;
};
export type TikTokPerformance = Performance & {
  video_count: number;
  live_count: number;
};
export type ShopeePerformance = Performance & {
  clicks: number;
  conversion_rate: number;
};
export type ImportJob = {
  id: string;
  marketplace: 'TikTok' | 'Shopee';
  filename: string;
  created_at: string;
  rows: number;
  successful_rows: number;
  failed_rows: number;
  status: string;
  mapping?: Record<string, string>;
  raw_rows?: Record<string, string>[];
  errors?: string[];
  warnings?: string[];
  file_hash?: string;
  source_type?: string;
  sales_metric?: string;
  sheet_name?: string;
  period_start?: string;
  period_end?: string;
};
export type Activity = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  user: string;
};
export type WorkspaceData = {
  entities: Record<Entity, RecordData[]>;
  operations?: Record<string, RecordData[]>;
  tiktok_accounts: Account[];
  shopee_accounts: Account[];
  tiktok_performance: TikTokPerformance[];
  shopee_performance: ShopeePerformance[];
  imports: ImportJob[];
  activity: Activity[];
  campaign_creators: { id: string; campaign_id: string; creator_id: string; status?: string; locked_at?: string | null; locked_by?: string | null; format?: string }[];
};
export const entities: Entity[] = [
  'clients',
  'brands',
  'campaigns',
  'creators',
  'products',
  'tasks',
];
export const uid = (n: number) =>
  `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

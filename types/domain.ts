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
  [key: string]: string | number | boolean | null | undefined;
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

export type CommunicationChannel =
  | 'WHATSAPP'
  | 'INSTAGRAM_DM'
  | 'TIKTOK_DM'
  | 'EMAIL'
  | 'OTHER'
  | 'WhatsApp'
  | 'Email'
  | 'Shopee Chat'
  | 'TikTok Chat';

export type TemplateCategory =
  | 'FIRST_OUTREACH'
  | 'FOLLOW_UP_1'
  | 'FOLLOW_UP_2'
  | 'NO_RESPONSE'
  | 'REAPPROACH'
  | 'INTERESTED'
  | 'SAMPLE_FOLLOW_UP'
  | 'HSL'
  | 'CAMPAIGN_INVITE'
  | 'CUSTOM'
  | 'First Outreach'
  | 'Follow-Up'
  | 'Sample Seed'
  | 'HSL Activation'
  | 'Peak Day'
  | 'Re-Approach';

export type CommunicationTemplate = RecordData & {
  id: string;
  name: string;
  category: TemplateCategory;
  channel: CommunicationChannel;
  marketplace: Marketplace;
  campaign_id?: string | null;
  client_id?: string | null;
  body: string;
  is_active?: boolean;
  is_default?: boolean;
  current_version: number;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at?: string;
  status: string;
};

export type CommunicationTemplateVersion = RecordData & {
  id: string;
  name: string;
  status: string;
  template_id: string;
  version: number;
  body: string;
  created_by: string;
  created_at: string;
};

export type CommunicationEvent = {
  id: string;
  creator_id: string;
  marketplace_account_id?: string | null;
  channel: CommunicationChannel;
  template_id?: string | null;
  template_version?: number | null;
  event_type: 'CONTACTED' | 'RESPONDED' | 'FOLLOW_UP' | 'NOTE' | 'PREPARATION';
  contacted_at: string;
  actor: string;
  campaign_id?: string | null;
  outreach_state?: string | null;
  response_state?: string | null;
  note?: string | null;
  next_action?: string | null;
  next_action_date?: string | null;
  created_at: string;
};

export type CommunicationPreparation = {
  id: string;
  batch_id: string;
  creator_id: string;
  channel: CommunicationChannel;
  template_id: string;
  template_version: number;
  prepared_body: string;
  unresolved_variables: string[];
  status: 'READY' | 'NEEDS_REVIEW' | 'SKIPPED' | 'CONTACTED';
  created_by: string;
  created_at: string;
};

export type OutreachQueueItem = {
  id: string;
  creator_id: string;
  creator_name: string;
  marketplace: Marketplace;
  phone?: string | null;
  email?: string | null;
  profile_url?: string | null;
  current_outreach_state: string;
  campaign_id?: string | null;
  campaign_name?: string | null;
  last_contact_at?: string | null;
  days_since_contact: number | null;
  reason: string;
  recommended_category: TemplateCategory;
  recommended_channel: CommunicationChannel;
  next_action: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  recent_gmv: number;
  hsl_status?: string | null;
  sample_status?: string | null;
  is_blacklisted: boolean;
  contacted_recently: boolean;
  days_since_recent_contact: number | null;
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

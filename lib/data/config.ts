import type { Entity } from '../../types/domain.ts';
export type Field = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'email' | 'textarea';
  options?: string[];
  relation?: Entity;
  required?: boolean;
  section?: string;
};
export const config: Record<
  Entity,
  {
    title: string;
    singular: string;
    description: string;
    fields: Field[];
    columns: string[];
  }
> = {
  clients: {
    title: 'Clients',
    singular: 'Client',
    description: 'Strong partnerships, organized from the start.',
    fields: [
      { key: 'name', label: 'Client name', required: true },
      { key: 'industry', label: 'Industry', required: true },
      { key: 'owner', label: 'Account owner' },
      { key: 'status', label: 'Status', options: ['Active', 'Inactive'] },
    ],
    columns: [
      'name',
      'industry',
      'status',
      'owner',
      'brands',
      'campaigns',
      'created_at',
    ],
  },
  brands: {
    title: 'Brands',
    singular: 'Brand',
    description: 'Every brand, connected to the bigger picture.',
    fields: [
      { key: 'name', label: 'Brand name', required: true },
      {
        key: 'client_id',
        label: 'Client',
        relation: 'clients',
        required: true,
      },
      { key: 'category', label: 'Category' },
      { key: 'status', label: 'Status', options: ['Active', 'Inactive'] },
    ],
    columns: [
      'name',
      'client_id',
      'category',
      'status',
      'campaigns',
      'products',
    ],
  },
  campaigns: {
    title: 'Campaigns',
    singular: 'Campaign',
    description: 'Turn creator partnerships into measurable growth.',
    fields: [
      {
        key: 'name',
        label: 'Campaign name',
        required: true,
        section: 'Campaign information',
      },
      { key: 'brand_id', label: 'Brand', relation: 'brands', required: true },
      {
        key: 'marketplace',
        label: 'Marketplace',
        options: ['TikTok', 'Shopee', 'Multi-platform'],
        required: true,
      },
      { key: 'campaign_type', label: 'Campaign type (custom allowed)' },
      { key: 'objective', label: 'Objective', type: 'textarea' },
      { key: 'target_affiliates', label: 'Target affiliates with sales', type: 'number' },
      { key: 'target_creators', label: 'Target creators', type: 'number' },
      { key: 'target_live_creators', label: 'Target live creators', type: 'number' },
      { key: 'target_video_creators', label: 'Target video creators', type: 'number' },
      { key: 'target_content', label: 'Target content', type: 'number' },
      {
        key: 'start_date',
        label: 'Start date',
        type: 'date',
        required: true,
        section: 'Timeline & targets',
      },
      { key: 'end_date', label: 'End date', type: 'date', required: true },
      { key: 'target_gmv', label: 'Target GMV (IDR)', type: 'number' },
      { key: 'target_orders', label: 'Target orders', type: 'number' },
      { key: 'owner', label: 'Person in charge', section: 'Ownership' },
      {
        key: 'status',
        label: 'Status',
        options: ['Draft', 'Upcoming', 'Active', 'Completed', 'Archived'],
      },
    ],
    columns: [
      'name',
      'brand_id',
      'marketplace',
      'start_date',
      'end_date',
      'status',
      'creators',
      'target_gmv',
      'actual_gmv',
      'owner',
    ],
  },
  creators: {
    title: 'Creators',
    singular: 'Creator',
    description: 'The people behind your performance.',
    fields: [
      { key: 'name', label: 'Creator name', required: true },
      { key: 'phone', label: 'WhatsApp number (country code, digits only)' },
      { key: 'relationship_status', label: 'Relationship', options: ['Prospect','New','Existing','Lost','Reactivation','Inactive'] },
      { key: 'acquisition_stage', label: 'Acquisition stage', options: ['Prospect','Contacted','Responded','Interested','Locked','Activated','Affiliate With Sales'] },
      { key: 'acquisition_source', label: 'Acquisition source', options: ['Manual','Shopee Discovery','TikTok Discovery','Competitor Creator','Existing Database','Referral','Campaign'] },
      { key: 'email', label: 'Contact email', type: 'email' },
      {
        key: 'category',
        label: 'Category',
        options: [
          'Beauty',
          'Lifestyle',
          'Wellness',
          'Family',
          'Food & beverages',
          'Technology',
        ],
      },
      { key: 'tags', label: 'Tags (comma separated)' },
      {
        key: 'status',
        label: 'Status',
        options: ['Active', 'Inactive', 'Watchlist'],
      },
      { key: 'notes', label: 'Internal notes', type: 'textarea' },
    ],
    columns: [
      'name',
      'tiktok_account',
      'shopee_account',
      'category',
      'followers',
      'campaigns',
      'tiktok_gmv',
      'shopee_gmv',
      'total_gmv',
      'status',
      'last_activity',
    ],
  },
  products: {
    title: 'Products',
    singular: 'Product',
    description: 'A connected catalog for every campaign.',
    fields: [
      { key: 'name', label: 'Product name', required: true },
      { key: 'sku', label: 'SKU', required: true },
      { key: 'tiktok_product_id', label: 'TikTok product ID' },
      { key: 'shopee_item_id', label: 'Shopee item ID' },
      { key: 'brand_id', label: 'Brand', relation: 'brands', required: true },
      { key: 'category', label: 'Category' },
      { key: 'status', label: 'Status', options: ['Active', 'Inactive'] },
    ],
    columns: ['name', 'sku', 'brand_id', 'category', 'status'],
  },
  tasks: {
    title: 'Tasks',
    singular: 'Task',
    description: 'Make the next step clear. Keep work moving.',
    fields: [
      { key: 'name', label: 'Task title', required: true },
      { key: 'recurrence_type', label: 'Recurrence', options: ['None','Weekly','Monthly','Campaign event'] },
      { key: 'weekly_day', label: 'Weekly day' },
      { key: 'monthly_week', label: 'Monthly week', type: 'number' },
      { key: 'relative_campaign_event', label: 'Relative campaign event' },
      { key: 'client_id', label: 'Client', relation: 'clients' },
      { key: 'campaign_id', label: 'Campaign', relation: 'campaigns' },
      { key: 'creator_id', label: 'Creator', relation: 'creators' },
      { key: 'due_date', label: 'Due date', type: 'date', required: true },
      {
        key: 'priority',
        label: 'Priority',
        options: ['Low', 'Medium', 'High', 'Urgent'],
      },
      { key: 'owner', label: 'Assignee' },
      {
        key: 'status',
        label: 'Status',
        options: ['To Do', 'In Progress', 'Done'],
      },
    ],
    columns: ['name', 'campaign_id', 'due_date', 'priority', 'owner', 'status'],
  },
};
export const columnLabels: Record<string, string> = {
  name: 'Name',
  industry: 'Industry',
  owner: 'Owner',
  client_id: 'Client',
  brand_id: 'Brand',
  category: 'Category',
  campaign_id: 'Campaign',
  creator_id: 'Creator',
  status: 'Status',
  created_at: 'Created',
  brands: 'Brands',
  campaigns: 'Campaigns',
  products: 'Products',
  creators: 'Creators',
  marketplace: 'Marketplace',
  start_date: 'Start date',
  end_date: 'End date',
  target_gmv: 'Target GMV',
  actual_gmv: 'Actual GMV',
  tiktok_account: 'TikTok account',
  shopee_account: 'Shopee account',
  followers: 'TikTok followers',
  tiktok_gmv: 'TikTok GMV',
  shopee_gmv: 'Shopee GMV',
  total_gmv: 'Historical GMV',
  last_activity: 'Last activity',
  sku: 'SKU',
  due_date: 'Due date',
  priority: 'Priority',
};

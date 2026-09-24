import type { z } from 'zod';

export type AIFeature = 
  | 'OUTREACH_DRAFT'
  | 'CREATOR_INSIGHT'
  | 'DAILY_BRIEF'
  | 'REPORT_NARRATIVE'
  | 'ASK_AFFILIATEOS'
  | 'ANALYTICS_INSIGHT';

export type OutreachTone =
  | 'FRIENDLY'
  | 'PROFESSIONAL'
  | 'CASUAL'
  | 'CONCISE'
  | 'FOLLOW_UP';

export type AIRequestStatus =
  | 'SUCCESS'
  | 'FAILED'
  | 'RATE_LIMITED'
  | 'TIMED_OUT'
  | 'REJECTED';

export type AIFeedbackRating = 'HELPFUL' | 'NOT_HELPFUL';

// 1. Creator Outreach
export interface OutreachDraftRequest {
  creatorId: string;
  tone?: OutreachTone;
  customInstructions?: string;
  language?: 'id' | 'en';
}

export interface OutreachDraftResponse {
  message: string;
  tone: string;
  reasoning_summary: string;
  warnings: string[];
}

// 2. Creator Performance Insight
export interface CreatorInsightRequest {
  creatorId: string;
  language?: 'id' | 'en';
}

export interface CreatorInsightResponse {
  summary: string;
  positive_signals: string[];
  risk_signals: string[];
  suggested_next_steps: string[];
  data_limitations: string[];
}

// 3. Operational Daily Brief
export interface DailyBriefRequest {
  language?: 'id' | 'en';
}

export interface DailyBriefPriority {
  title: string;
  reason: string;
  related_entity_type: string;
  related_entity_id: string;
}

export interface DailyBriefResponse {
  headline: string;
  summary: string;
  priorities: DailyBriefPriority[];
  watchlist: string[];
  data_limitations: string[];
}

// 4. Report Narrative Assistant
export interface ReportNarrativeRequest {
  reportId?: string;
  language?: 'id' | 'en';
  focusArea?: string;
}

export interface ReportNarrativeResponse {
  key_highlights: string[];
  what_went_well: string[];
  issues: string[];
  next_actions: string[];
  limitations: string[];
}

// 5. Ask AffiliateOS
export interface AskAffiliateOSRequest {
  query: string;
  language?: 'id' | 'en';
}

export interface EntityReference {
  entity_type: string;
  entity_id: string;
  label: string;
}

export interface AskAffiliateOSResponse {
  answer: string;
  references: EntityReference[];
  limitations: string[];
}

// AI Provider Interface
export interface AIProviderResult<T> {
  data: T;
  usage: {
    inputTokens?: number;
    outputTokens?: number;
  };
  latencyMs: number;
  model: string;
}

export interface AIProviderOptions<T> {
  feature: AIFeature;
  promptVersion: string;
  systemPrompt: string;
  context: Record<string, unknown>;
  userPrompt: string;
  schema: z.ZodType<T>;
  temperature?: number;
  timeoutMs?: number;
}

export interface AIProvider {
  readonly name: string;
  isConfigured(): boolean;
  generateStructured<T>(options: AIProviderOptions<T>): Promise<AIProviderResult<T>>;
}

export interface AIStatusInfo {
  provider: string;
  isConfigured: boolean;
  model: string;
  features: {
    outreachDraft: boolean;
    creatorInsight: boolean;
    dailyBrief: boolean;
    reportNarrative: boolean;
    askAffiliateOS: boolean;
  };
  usage: {
    requestsToday: number;
    requestsThisMonth: number;
    estimatedTokens: number;
  };
}

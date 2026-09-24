import { z } from 'zod';

// 1. Creator Outreach Draft Schema
export const OutreachDraftSchema = z.object({
  message: z.string().min(5, 'Outreach message must be at least 5 characters'),
  tone: z.string(),
  reasoning_summary: z.string(),
  warnings: z.array(z.string()).default([]),
});

// 2. Creator Performance Insight Schema
export const CreatorInsightSchema = z.object({
  summary: z.string().min(5, 'Summary must not be empty'),
  positive_signals: z.array(z.string()).default([]),
  risk_signals: z.array(z.string()).default([]),
  suggested_next_steps: z.array(z.string()).default([]),
  data_limitations: z.array(z.string()).default([]),
});

// 3. Operational Daily Brief Schema
export const DailyBriefPrioritySchema = z.object({
  title: z.string(),
  reason: z.string(),
  related_entity_type: z.string(),
  related_entity_id: z.string(),
});

export const DailyBriefSchema = z.object({
  headline: z.string().min(3, 'Headline must not be empty'),
  summary: z.string().min(5, 'Summary must not be empty'),
  priorities: z.array(DailyBriefPrioritySchema).default([]),
  watchlist: z.array(z.string()).default([]),
  data_limitations: z.array(z.string()).default([]),
});

// 4. Report Narrative Schema
export const ReportNarrativeSchema = z.object({
  key_highlights: z.array(z.string()).default([]),
  what_went_well: z.array(z.string()).default([]),
  issues: z.array(z.string()).default([]),
  next_actions: z.array(z.string()).default([]),
  limitations: z.array(z.string()).default([]),
});

// 5. Ask AffiliateOS Schema
export const EntityReferenceSchema = z.object({
  entity_type: z.string(),
  entity_id: z.string(),
  label: z.string(),
});

export const AskAffiliateOSSchema = z.object({
  answer: z.string().min(5, 'Answer must not be empty'),
  references: z.array(EntityReferenceSchema).default([]),
  limitations: z.array(z.string()).default([]),
});

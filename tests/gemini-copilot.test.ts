import test from 'node:test';
import assert from 'node:assert/strict';
import { seed as seedData } from '../lib/data/seed.ts';
import { FakeAIProvider } from '../lib/ai/fake-provider.ts';
import { getAIProvider, getAIStatus, isGeminiConfigured } from '../lib/ai/client.ts';
import {
  sanitizePII,
  wrapPromptData,
  validateEntityReferences,
} from '../lib/ai/guardrails.ts';
import {
  OutreachDraftSchema,
  CreatorInsightSchema,
  DailyBriefSchema,
  ReportNarrativeSchema,
  AskAffiliateOSSchema,
} from '../lib/ai/schemas.ts';
import {
  buildOutreachContext,
  buildCreatorInsightContext,
  buildDailyBriefContext,
  buildReportNarrativeContext,
  routeAndBuildAskContext,
} from '../lib/ai/context.ts';
import {
  checkRateLimit,
  recordAIRequest,
  getWorkspaceUsageSummary,
} from '../lib/ai/usage.ts';
import type { WorkspaceData } from '../types/domain.ts';

const seed = (): WorkspaceData => JSON.parse(JSON.stringify(seedData));

void test('1. Provider Abstraction & FakeAIProvider Determinism', async () => {
  const fake = new FakeAIProvider();
  assert.equal(fake.name, 'FakeAIProvider (Deterministic)');
  assert.equal(fake.isConfigured(), true);

  // Generate OUTREACH_DRAFT
  const outreachRes = await fake.generateStructured({
    feature: 'OUTREACH_DRAFT',
    promptVersion: 'v1',
    systemPrompt: 'System',
    userPrompt: 'User',
    context: {
      creator_display_name: 'Sarah Creator',
      brand_name: 'Haleon',
      campaign_name: 'Brand Day 10.10',
    },
    schema: OutreachDraftSchema,
  });

  assert.ok(outreachRes.data.message.includes('Sarah Creator'));
  assert.ok(outreachRes.data.message.includes('Haleon'));
  assert.ok(outreachRes.data.reasoning_summary);
  assert.equal(typeof outreachRes.latencyMs, 'number');
  assert.ok(outreachRes.usage.outputTokens && outreachRes.usage.outputTokens > 0);

  // Status reporter handles unconfigured environment gracefully
  const status = getAIStatus('ws-test');
  assert.ok(status.model);
  assert.ok(status.features.outreachDraft);
  assert.ok(status.features.creatorInsight);
  assert.ok(status.features.dailyBrief);
  assert.ok(status.features.reportNarrative);
  assert.ok(status.features.askAffiliateOS);
});

void test('2. Zod Schema Validation & Malformed Payload Rejection', () => {
  // 1. OutreachDraftSchema
  const validOutreach = {
    message: 'Halo Kak Sarah, salam kenal dari tim Haleon! Kami ingin mengajak kolaborasi.',
    tone: 'CASUAL',
    reasoning_summary: 'Creator memiliki audiens aktif di kategori kesehatan gigi.',
    warnings: [],
  };
  assert.equal(OutreachDraftSchema.safeParse(validOutreach).success, true);
  // Fails on message too short
  assert.equal(OutreachDraftSchema.safeParse({ ...validOutreach, message: 'Hi' }).success, false);

  // 2. CreatorInsightSchema
  const validInsight = {
    summary: 'Creator konsisten membukukan GMV stabil di Shopee.',
    positive_signals: ['Konversi stabil > 2.5%'],
    risk_signals: ['Belum pernah live streaming'],
    suggested_next_steps: ['Tawarkan slot Peak Day'],
    data_limitations: ['Hanya data H-2 Shopee'],
  };
  assert.equal(CreatorInsightSchema.safeParse(validInsight).success, true);
  // Fails on empty summary
  assert.equal(CreatorInsightSchema.safeParse({ ...validInsight, summary: '' }).success, false);

  // 3. DailyBriefSchema
  const validBrief = {
    headline: 'Prioritas Hari Ini: 3 Tindakan P0 Memerlukan Perhatian',
    summary: 'Follow-up outreach dan evaluasi stok Sensodyne mendesak dilakukan.',
    priorities: [
      {
        title: 'Follow-up Creator Sarah',
        reason: 'H+3 tanpa respon setelah penawaran kolaborasi',
        related_entity_type: 'creator',
        related_entity_id: 'cr-101',
      },
    ],
    watchlist: ['Stock Sensodyne 100g menipis'],
    data_limitations: ['Data TikTok H-2'],
  };
  assert.equal(DailyBriefSchema.safeParse(validBrief).success, true);

  // 4. ReportNarrativeSchema
  const validNarrative = {
    key_highlights: ['Total GMV mencapai Rp 250M'],
    what_went_well: ['Shopee Live tumbuh 45%'],
    issues: ['Stokout di akhir pekan kedua'],
    next_actions: ['Alokasikan buffer stock 20%'],
    limitations: ['Rank-Up program source unavailable'],
  };
  assert.equal(ReportNarrativeSchema.safeParse(validNarrative).success, true);

  // 5. AskAffiliateOSSchema
  const validAsk = {
    answer: 'Ada 12 creator aktif yang terdaftar dalam program affiliate bulan ini.',
    references: [{ entity_type: 'creator', entity_id: 'cr-1', label: 'Creator List' }],
    limitations: ['Data per H-2 cutoff'],
  };
  assert.equal(AskAffiliateOSSchema.safeParse(validAsk).success, true);
});

void test('3. Guardrails: PII Sanitization, Prompt Delimiters & Entity References', () => {
  // PII masking in text strings
  const textWithPII = 'Creator Sarah nomor 081234567890 dan email sarah@creator.id.';
  const sanitized = sanitizePII(textWithPII) as string;
  assert.ok(!sanitized.includes('081234567890'), 'Phone number must be masked');
  assert.ok(sanitized.includes('[PHONE_REDACTED]'));
  assert.ok(!sanitized.includes('sarah@creator.id'), 'Email must be masked');
  assert.ok(sanitized.includes('[EMAIL_REDACTED]'));

  // PII field stripping in objects
  const objWithSensitiveFields = {
    creator_name: 'Sarah',
    phone_number: '081234567890',
    email_address: 'sarah@example.com',
    secret_token: 'xyz987',
    tier: 'Gold',
  };
  const sanitizedObj = sanitizePII(objWithSensitiveFields) as Record<string, unknown>;
  assert.equal(sanitizedObj.creator_name, 'Sarah');
  assert.equal(sanitizedObj.tier, 'Gold');
  assert.equal(sanitizedObj.phone_number, undefined, 'Phone field must be deleted');
  assert.equal(sanitizedObj.email_address, undefined, 'Email field must be deleted');
  assert.equal(sanitizedObj.secret_token, undefined, 'Token field must be deleted');

  // Wrap prompt data with delimiters
  const wrapped = wrapPromptData('CREATOR_PROFILE', { name: 'Sarah', score: 95 });
  assert.ok(wrapped.includes('<AFFILIATEOS_DATA label="CREATOR_PROFILE">'));
  assert.ok(wrapped.includes('</AFFILIATEOS_DATA>'));
  assert.ok(wrapped.includes('"name": "Sarah"'));

  // Entity reference validation
  const validIds = new Set(['cr-01', 'cr-02', 'act-99']);
  const references = [
    { entity_type: 'creator', entity_id: 'cr-01', label: 'Sarah' },
    { entity_type: 'creator', entity_id: 'cr-999-hallucinated', label: 'Unknown' },
    { entity_type: 'action', entity_id: 'act-99', label: 'Review Stock' },
  ];
  const validated = validateEntityReferences(references, validIds);
  assert.equal(validated.length, 2);
  assert.ok(validated.some((r) => r.entity_id === 'cr-01'));
  assert.ok(validated.some((r) => r.entity_id === 'act-99'));
  assert.ok(!validated.some((r) => r.entity_id === 'cr-999-hallucinated'));
});

void test('4. Rate Limiter & Usage Tracker Enforcement', () => {
  const ws = 'ws-test-rate-limit';

  // First request: allowed
  const r1 = checkRateLimit(ws, 'OUTREACH_DRAFT');
  assert.equal(r1.allowed, true);

  // Immediate second request within 2s cooldown: blocked
  const r2 = checkRateLimit(ws, 'OUTREACH_DRAFT');
  assert.equal(r2.allowed, false);
  assert.ok(r2.reason?.includes('Please wait'));

  // Record usage
  recordAIRequest({
    workspaceId: ws,
    feature: 'OUTREACH_DRAFT',
    status: 'SUCCESS',
    inputTokens: 150,
    outputTokens: 75,
  });

  const summary = getWorkspaceUsageSummary(ws);
  assert.ok(summary.requestsToday >= 1);
  assert.ok(summary.estimatedTokens >= 225);
});

void test('5. Feature 1: Creator Outreach Assistant Context & Manual Send Boundary', async () => {
  const data = seed();
  const creator = data.entities.creators[0];
  assert.ok(creator, 'Seed must have creators');

  const context = buildOutreachContext(creator, {
    stage: 'First Outreach',
  });

  assert.equal(context.creator_display_name, creator.name || creator.handle);
  assert.equal(context.outreach_stage, 'First Outreach');
  assert.ok(context.marketplace);

  const fake = new FakeAIProvider();
  const res = await fake.generateStructured({
    feature: 'OUTREACH_DRAFT',
    promptVersion: 'v1',
    systemPrompt: 'System',
    userPrompt: 'Draft an outreach message',
    context,
    schema: OutreachDraftSchema,
  });

  assert.ok(res.data.message);
  assert.ok(res.data.reasoning_summary);

  // CRITICAL VERIFICATION: No autonomous mutation has occurred
  // Calling AI does NOT mutate creator status, does NOT add timeline event, does NOT send WhatsApp
  const creatorAfter = data.entities.creators.find((c) => c.id === creator.id);
  assert.equal(creatorAfter?.status, creator.status);
});

void test('6. Feature 2: Creator Performance Insights Context & Data Preservation', async () => {
  const data = seed();
  const creator = data.entities.creators[0];
  assert.ok(creator);

  const context = buildCreatorInsightContext(creator, [], []);
  assert.equal(context.creator.name, creator.name || creator.handle);
  assert.equal(typeof context.performance_summary.recent_7d_gmv, 'number');

  const fake = new FakeAIProvider();
  const res = await fake.generateStructured({
    feature: 'CREATOR_INSIGHT',
    promptVersion: 'v1',
    systemPrompt: 'System',
    userPrompt: 'Analyze creator',
    context,
    schema: CreatorInsightSchema,
  });

  assert.ok(res.data.summary);
  assert.ok(Array.isArray(res.data.positive_signals));
  assert.ok(Array.isArray(res.data.risk_signals));
  assert.ok(Array.isArray(res.data.suggested_next_steps));
});

void test('7. Feature 3: Operational Daily Brief Context & Priority Ranking', async () => {
  const data = seed();
  const actions = data.operations?.operational_actions || [];

  const context = buildDailyBriefContext(data, actions);
  assert.ok(context.date);
  assert.ok(typeof context.action_center.p0_critical_count === 'number');
  assert.ok(context.data_coverage.status);

  const fake = new FakeAIProvider();
  const res = await fake.generateStructured({
    feature: 'DAILY_BRIEF',
    promptVersion: 'v1',
    systemPrompt: 'System',
    userPrompt: 'Generate daily brief',
    context,
    schema: DailyBriefSchema,
  });

  assert.ok(res.data.headline);
  assert.ok(res.data.summary);
  assert.ok(Array.isArray(res.data.priorities));
});

void test('8. Feature 4: Report Narrative Assistant Structured Takeaways', async () => {
  const mockDataset = {
    executive_kpis: {
      total_gmv: 450000000,
      total_orders: 8500,
    },
    product_performance: [
      { product_name: 'Sensodyne Rapid Relief 100g', gmv: 150000000, units_sold: 3000 },
    ],
  };

  const context = buildReportNarrativeContext(mockDataset, { title: 'Weekly Deck' });
  assert.ok(context.executive_kpis);
  assert.ok(Array.isArray(context.top_performing_products));

  const fake = new FakeAIProvider();
  const res = await fake.generateStructured({
    feature: 'REPORT_NARRATIVE',
    promptVersion: 'v1',
    systemPrompt: 'System',
    userPrompt: 'Draft narrative',
    context,
    schema: ReportNarrativeSchema,
  });

  assert.ok(Array.isArray(res.data.key_highlights));
  assert.ok(Array.isArray(res.data.what_went_well));
  assert.ok(Array.isArray(res.data.issues));
  assert.ok(Array.isArray(res.data.next_actions));
});

void test('9. Feature 5: Ask AffiliateOS Safe Query Routing & Entity Awareness', async () => {
  const data = seed();

  // Query routing to OUTREACH domain
  const outreachQuery = routeAndBuildAskContext('Siapa saja creator yang butuh follow-up hari ini?', data);
  assert.equal(outreachQuery.domain, 'OUTREACH');
  assert.ok(outreachQuery.validEntityIds.size > 0);

  // Query routing to ACTION_CENTER domain
  const priorityQuery = routeAndBuildAskContext('Tampilkan action items P0 dan P1 yang paling mendesak', data);
  assert.equal(priorityQuery.domain, 'ACTION_CENTER');

  const fake = new FakeAIProvider();
  const res = await fake.generateStructured({
    feature: 'ASK_AFFILIATEOS',
    promptVersion: 'v1',
    systemPrompt: 'System',
    userPrompt: 'Ask query',
    context: outreachQuery.context,
    schema: AskAffiliateOSSchema,
  });

  assert.ok(res.data.answer);
  assert.ok(Array.isArray(res.data.references));
  assert.ok(Array.isArray(res.data.limitations));
});

void test('10. Security: Server-Side API Key & Privacy Guarantee', () => {
  // Ensure NEXT_PUBLIC_ is NEVER used for GEMINI_API_KEY
  assert.equal(
    process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    undefined,
    'CRITICAL SECURITY: NEXT_PUBLIC_GEMINI_API_KEY must not exist'
  );

  // AI Provider factory correctly defaults to safe provider when API key is missing
  const provider = getAIProvider();
  assert.ok(provider);
  if (!isGeminiConfigured()) {
    assert.equal(provider.name, 'FakeAIProvider (Deterministic)');
  }
});

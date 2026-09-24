import test from 'node:test';
import assert from 'node:assert/strict';
import { seed as seedData } from '../lib/data/seed.ts';
import {
  extractPlaceholders,
  validateTemplateBody,
  interpolateTemplate,
  prepareTemplateUpdate,
} from '../lib/communication/templates.ts';
import {
  generateTodayQueue,
  normalizePhoneNumber,
  generateWhatsAppLink,
} from '../lib/communication/queue.ts';
import { prepareBulkCommunication } from '../lib/communication/bulk.ts';
import type { WorkspaceData, CommunicationTemplate } from '../types/domain.ts';

const seed = (): WorkspaceData => JSON.parse(JSON.stringify(seedData));

void test('1. Template Placeholder Validation & Interpolation', () => {
  const sampleBody = 'Hi {{creator_name}}, join our {{campaign_name}} campaign for {{brand_name}} on {{marketplace}}!';
  const found = extractPlaceholders(sampleBody);
  assert.deepEqual(found, ['{{creator_name}}', '{{campaign_name}}', '{{brand_name}}', '{{marketplace}}']);

  // Valid template body check
  const validCheck = validateTemplateBody(sampleBody);
  assert.equal(validCheck.isValid, true);
  assert.equal(validCheck.errors.length, 0);

  // Invalid placeholder check
  const invalidBody = 'Hi {{creator_name}}, click {{malicious_link}} <script>alert(1)</script>';
  const invalidCheck = validateTemplateBody(invalidBody);
  assert.equal(invalidCheck.isValid, false);
  assert.equal(invalidCheck.errors.length >= 2, true);

  // Clean interpolation
  const interpolated = interpolateTemplate(sampleBody, {
    creator_name: 'Dinda Partner',
    campaign_name: 'Mega Sale 10.10',
    brand_name: 'Haleon',
    marketplace: 'Shopee',
  });

  assert.equal(interpolated.isReady, true);
  assert.equal(interpolated.missingVariables.length, 0);
  assert.equal(interpolated.text, 'Hi Dinda Partner, join our Mega Sale 10.10 campaign for Haleon on Shopee!');

  // Missing variable detection
  const incomplete = interpolateTemplate(sampleBody, {
    creator_name: 'Dinda Partner',
    // campaign_name missing
    brand_name: 'Haleon',
  });
  assert.equal(incomplete.isReady, false);
  assert.equal(incomplete.missingVariables.includes('{{campaign_name}}'), true);
});

void test('2. Template Versioning & Audit Trail', () => {
  const initialTemplate: CommunicationTemplate = {
    id: 'tpl-101',
    name: 'First Outreach Draft',
    category: 'FIRST_OUTREACH',
    channel: 'WHATSAPP',
    marketplace: 'Multi-platform',
    status: 'Active',
    body: 'Hi {{creator_name}}, version 1 text.',
    current_version: 1,
    is_default: true,
    created_by: 'System',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  };

  const newBody = 'Hi {{creator_name}}, version 2 text with {{campaign_name}}.';
  const { updatedTemplate, versionRecord } = prepareTemplateUpdate(initialTemplate, newBody, 'Dinda Manager');

  assert.equal(updatedTemplate.current_version, 2);
  assert.equal(updatedTemplate.body, newBody);
  assert.equal(updatedTemplate.updated_by, 'Dinda Manager');

  assert.equal(versionRecord.template_id, 'tpl-101');
  assert.equal(versionRecord.version, 2);
  assert.equal(versionRecord.body, newBody);
  assert.equal(versionRecord.created_by, 'Dinda Manager');
});

void test('3. Phone Number Normalization & WhatsApp Deep Link Encoding', () => {
  // Indonesian local formats to international E.164 without '+'
  assert.equal(normalizePhoneNumber('0812-3456-7890'), '6281234567890');
  assert.equal(normalizePhoneNumber('+62 812 3456 7890'), '6281234567890');
  assert.equal(normalizePhoneNumber('6281234567890'), '6281234567890');

  // Deep Link construction
  const rawMsg = 'Hi Dinda, open this link!';
  const link = generateWhatsAppLink('081234567890', rawMsg);

  assert.equal(link.startsWith('https://wa.me/6281234567890?text='), true);
  assert.equal(link.includes(encodeURIComponent(rawMsg)), true);
});

void test('4. Today Queue Generator & Rule Prioritization', () => {
  const ws = seed();
  const queue = generateTodayQueue(ws);

  assert.equal(Array.isArray(queue), true);
  assert.equal(queue.length > 0, true);

  // Check structure of queue items
  const first = queue[0];
  assert.notEqual(first.id, undefined);
  assert.notEqual(first.creator_name, undefined);
  assert.notEqual(first.priority, undefined);
  assert.notEqual(first.reason, undefined);

  // Confirm priority sorting (P0, P1, P2, P3)
  const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
  for (let i = 1; i < queue.length; i++) {
    const prevRank = priorityOrder[queue[i - 1].priority] ?? 4;
    const currRank = priorityOrder[queue[i].priority] ?? 4;
    assert.equal(prevRank <= currRank, true);
  }
});

void test('5. Duplicate Contact Guard & Blacklist Safety', () => {
  const ws = seed();
  if (!ws.operations) ws.operations = {};
  if (!ws.operations.creator_outreach) ws.operations.creator_outreach = [];

  // Mark a creator as contacted today
  const creator = ws.entities.creators[0];
  ws.operations.creator_outreach.push({
    id: 'outreach-today',
    name: 'Outreach today',
    creator_id: creator.id,
    channel: 'WhatsApp',
    status: 'Contacted',
    contacted_at: new Date().toISOString().slice(0, 10),
    created_at: new Date().toISOString(),
  });

  const queue = generateTodayQueue(ws);
  const item = queue.find((q) => q.creator_id === creator.id);

  if (item) {
    assert.equal(item.contacted_recently, true);
  }

  // Check blacklisted creator exclusion
  const blacklistedCreator = ws.entities.creators[1];
  blacklistedCreator.relationship_status = 'Blacklisted';

  const updatedQueue = generateTodayQueue(ws);
  const blacklistedInQueue = updatedQueue.find((q) => q.creator_id === blacklistedCreator.id);
  assert.equal(blacklistedInQueue, undefined);
});

void test('6. Bulk Message Preparation Engine', () => {
  const ws = seed();
  const creators = ws.entities.creators.slice(0, 3);
  const templates = ws.operations?.communication_templates || [];
  const template = templates[0] || {
    id: 'test-tpl',
    name: 'Test Tpl',
    category: 'FIRST_OUTREACH',
    channel: 'WHATSAPP',
    body: 'Hi {{creator_name}}, join {{campaign_name}}!',
    current_version: 1,
    is_default: true,
    created_by: 'System',
    created_at: '2026-09-01T00:00:00Z',
  };

  const selectedCampaign = ws.entities.campaigns[0];

  const result = prepareBulkCommunication(
    creators.map((c) => c.id),
    template as unknown as CommunicationTemplate,
    ws,
    selectedCampaign?.id
  );

  assert.equal(result.totalSelected, 3);
  assert.equal(result.items.length, 3);

  for (const item of result.items) {
    assert.notEqual(item.creatorId, undefined);
    assert.notEqual(item.status, undefined);
    assert.equal(['READY', 'NEEDS_REVIEW', 'SKIPPED'].includes(item.status), true);
  }
});

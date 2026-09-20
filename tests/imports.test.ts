import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseCSV, validateRows, mappings, detectMapping, sourceSemantics } from '../lib/imports/validation.ts';
void test('CSV preserves commas, escaped quotes, CRLF and multiline fields', () => {
  assert.deepEqual(
    parseCSV('name,note\r\n"Demo Creator","Said ""hello""\nagain"'),
    [{ name: 'Demo Creator', note: 'Said "hello"\nagain' }],
  );
});
void test('CSV rejects malformed records and duplicate headers', () => {
  assert.throws(() => parseCSV('name,name\na,b'));
  assert.throws(() => parseCSV('a,b\n1'));
  assert.throws(() => parseCSV('a\n"unclosed'));
});
const map = Object.fromEntries(mappings.TikTok.filter(f=>f.key!=='order_id').map((f) => [f.key, f.key]));
const good = {
  date: '2026-09-08',
  username: '@demo_creator',
  campaign_id: 'campaign-id',
  gmv: '120000',
  orders: '2',
};
void test('validates mandatory mappings before rows', () => {
  assert.ok(validateRows([good], {}, 'TikTok').errors.length > 0);
});
void test('rejects negative values, impossible dates, duplicate rows and fractional orders', () => {
  for (const changes of [
    { gmv: '-10' },
    { date: '2026-02-30' },
    { orders: '1.5' },
  ])
    assert.equal(
      validateRows([{ ...good, ...changes }], map, 'TikTok').valid.length,
      0,
    );
  assert.equal(validateRows([good, good], map, 'TikTok').errors.length, 1);
});
void test('marketplace-specific metrics remain independent', () => {
  assert.ok(mappings.TikTok.some((f) => f.key === 'video_count'));
  assert.ok(!mappings.TikTok.some((f) => f.key === 'clicks'));
  assert.ok(mappings.Shopee.some((f) => f.key === 'clicks'));
  assert.ok(!mappings.Shopee.some((f) => f.key === 'video_count'));
  assert.equal(validateRows([good], map, 'TikTok').valid.length, 1);
});
void test('actual TikTok Payment Order headers are detected and refunded rows are excluded', async () => {
  const rows=parseCSV(await readFile(new URL('./fixtures/tiktok-payment-order-demo.csv',import.meta.url),'utf8'));
  const mapping={...detectMapping(Object.keys(rows[0]),'TikTok'),__campaign_id:'campaign-id'};
  const result=validateRows(rows,mapping,'TikTok');
  assert.equal(result.valid.length,1);
  assert.equal(result.valid[0].gmv,150000);
  assert.equal(result.valid[0].date,'2026-09-17');
  assert.equal(result.valid[0].video_count,1);
  assert.ok(result.issues.some(i=>i.severity==='WARNING'&&i.field==='refund_status'));
  assert.match(sourceSemantics.TikTok,/Payment Amount/);
});
void test('actual Shopee Payment Order headers use net purchase value and exclude unverified rows', async () => {
  const rows=parseCSV(await readFile(new URL('./fixtures/shopee-payment-order-demo.csv',import.meta.url),'utf8'));
  const mapping={...detectMapping(Object.keys(rows[0]),'Shopee'),__campaign_id:'campaign-id'};
  const result=validateRows(rows,mapping,'Shopee');
  assert.equal(result.valid.length,1);
  assert.equal(result.valid[0].gmv,175000);
  assert.equal(result.valid[0].units_sold,2);
  assert.ok(result.issues.some(i=>i.severity==='WARNING'&&i.field==='verified_status'));
  assert.match(sourceSemantics.Shopee,/less Refund Amount/);
});

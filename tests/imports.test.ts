import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, validateRows, mappings } from '../lib/imports/validation.ts';
void test('CSV preserves commas, escaped quotes, CRLF and multiline fields', () => {
  assert.deepEqual(
    parseCSV('name,note\r\n"Putri, Nadia","Said ""hello""\nagain"'),
    [{ name: 'Putri, Nadia', note: 'Said "hello"\nagain' }],
  );
});
void test('CSV rejects malformed records and duplicate headers', () => {
  assert.throws(() => parseCSV('name,name\na,b'));
  assert.throws(() => parseCSV('a,b\n1'));
  assert.throws(() => parseCSV('a\n"unclosed'));
});
const map = Object.fromEntries(mappings.TikTok.map((f) => [f.key, f.key]));
const good = {
  date: '2026-09-08',
  username: '@nadia',
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

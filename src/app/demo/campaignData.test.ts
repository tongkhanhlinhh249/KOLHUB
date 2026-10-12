import { expect, test } from 'vitest';
import type { Campaign } from '../services';
import { CAMPAIGN_DATA, SURFACES } from './campaignData';

// Every top-level Campaign field the dictionary must cover (compile-time checked against the type).
const CAMPAIGN_KEYS: (keyof Campaign)[] = [
  'id',
  'brandAccountId',
  'name',
  'objective',
  'brief',
  'budget',
  'startDate',
  'endDate',
  'platforms',
  'categories',
  'deliverables',
  'contentRules',
  'visibility',
  'cover',
  'applyDeadline',
  'type',
  'recruitment',
  'draftReview',
  'groups',
  'contract',
  'regions',
  'target',
  'survey',
  'terms',
  'status',
  'publishedAt',
  'closedAt',
];

const fields = CAMPAIGN_DATA.flatMap((g) => g.fields);
/** "recruitment.slots" → recruitment; "startDate · endDate" → startDate, endDate. */
const rootsOf = (key: string) => key.split(' · ').map((k) => k.split('.')[0]);

test('mỗi trường có mã duy nhất, đủ kiểu, bắt buộc, ràng buộc và nhãn cho cả 4 màn hình', () => {
  const keys = fields.map((f) => f.key);
  expect(new Set(keys).size).toBe(keys.length);
  for (const g of CAMPAIGN_DATA) expect(g.fields.length).toBeGreaterThan(0);
  for (const f of fields) {
    expect(f.label && f.type && f.required && f.rules).toBeTruthy();
    expect(Object.keys(f.shown).sort()).toEqual(SURFACES.map((s) => s.key).sort());
  }
});

test('phủ mọi trường của Campaign (trừ thời điểm tạo/sửa)', () => {
  const covered = new Set(fields.flatMap((f) => rootsOf(f.key)));
  for (const k of CAMPAIGN_KEYS) expect(covered, k).toContain(k);
});

test('mọi trường người dùng nhập đều hiện trong form Tạo/Sửa', () => {
  for (const f of CAMPAIGN_DATA.filter((g) => g.group !== 'Hệ thống').flatMap((g) => g.fields)) {
    if (f.key === 'status') continue;
    expect(f.shown.form, f.key).toBeTruthy();
  }
});

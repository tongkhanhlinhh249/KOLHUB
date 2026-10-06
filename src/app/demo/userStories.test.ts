import { expect, test } from 'vitest';
import { ALL_STORIES, EPICS, RELEASES, STORY_ROLES, storiesFor } from './userStories';

test('các đợt đi đúng thứ tự R0 → R5, mỗi đợt có ít nhất một US', () => {
  expect(RELEASES.map((r) => r.key)).toEqual(['R0', 'R1', 'R2', 'R3', 'R4', 'R5']);
  for (const r of RELEASES) expect(r.stories.length).toBeGreaterThan(0);
});

test('mã US duy nhất và mang tiền tố của đợt chứa nó', () => {
  const ids = ALL_STORIES.map((s) => s.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const r of RELEASES) for (const s of r.stories) expect(s.id.startsWith(`${r.key}-`)).toBe(true);
});

test('mỗi US thuộc một Epic có thật, có vai trò, tiêu chí nghiệm thu và nguồn', () => {
  const epics = new Set(EPICS.map((e) => e.key));
  for (const s of ALL_STORIES) {
    expect(epics.has(s.epic)).toBe(true);
    expect(s.roles.length).toBeGreaterThan(0);
    for (const role of s.roles) expect(STORY_ROLES).toContain(role);
    expect(s.criteria.length).toBeGreaterThan(0);
    expect(s.source).not.toBe('');
    expect(s.story.startsWith('Là ')).toBe(true);
  }
});

test('mỗi Epic có ít nhất một US', () => {
  for (const e of EPICS) expect(ALL_STORIES.some((s) => s.epic === e.key)).toBe(true);
});

test('lọc theo vai trò', () => {
  const r0 = RELEASES[0];
  expect(storiesFor(r0, null)).toBe(r0.stories);
  expect(storiesFor(r0, 'Nhãn hàng').map((s) => s.id)).toEqual(['R0-1', 'R0-4', 'R0-5', 'R0-7']);
  expect(storiesFor(r0, 'Khách')).toEqual([]);
});

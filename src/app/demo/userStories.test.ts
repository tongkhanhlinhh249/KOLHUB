import { expect, test } from 'vitest';
import { RELEASE_PLAIN, STORY_STEPS } from './storySteps';
import { ALL_STORIES, EPICS, RELEASES, STORY_ROLES, storiesFor } from './userStories';

test('các đợt đi đúng thứ tự R0 → R6, mỗi đợt có ít nhất một US', () => {
  expect(RELEASES.map((r) => r.key)).toEqual(['R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6']);
  for (const r of RELEASES) expect(r.stories.length).toBeGreaterThan(0);
});

test('mã US duy nhất, mang tiền tố của đợt và đánh số liên tiếp từ 1', () => {
  const ids = ALL_STORIES.map((s) => s.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const r of RELEASES) expect(r.stories.map((s) => s.id)).toEqual(r.stories.map((_, i) => `${r.key}-${i + 1}`));
});

test('mỗi US đủ thông tin cho dev: Epic có thật, vai trò, màn hình, quy tắc, nguồn', () => {
  const epics = new Set(EPICS.map((e) => e.key));
  for (const s of ALL_STORIES) {
    expect(epics.has(s.epic)).toBe(true);
    expect(s.roles.length).toBeGreaterThan(0);
    for (const role of s.roles) expect(STORY_ROLES).toContain(role);
    expect(s.story.startsWith('Là ')).toBe(true);
    expect(s.screens.length).toBeGreaterThan(0);
    expect(s.rules.length).toBeGreaterThan(0);
    expect(s.source).not.toBe('');
  }
});

test('mã lỗi là 4 chữ số, có thông báo hiển thị', () => {
  for (const s of ALL_STORIES)
    for (const e of s.errors ?? []) {
      expect(e.code).toMatch(/^\d{4}$/);
      expect(e.message).not.toBe('');
      expect(e.when).not.toBe('');
    }
});

test('mọi tham chiếu "Rx-y" trong tài liệu trỏ tới US có thật', () => {
  const ids = new Set(ALL_STORIES.map((s) => s.id));
  for (const s of ALL_STORIES) {
    const text = [...s.rules, ...(s.notes ?? []), s.confirm ?? ''].join(' ');
    for (const ref of text.match(/\bR\d-\d+\b/g) ?? []) expect(ids, `${s.id} → ${ref}`).toContain(ref);
  }
});

test('mỗi Epic có ít nhất một US', () => {
  for (const e of EPICS) expect(ALL_STORIES.some((s) => s.epic === e.key)).toBe(true);
});

test('chế độ Dễ hiểu: mọi US có tóm tắt và checklist theo từng màn hình, không thừa mã', () => {
  const ids = ALL_STORIES.map((s) => s.id);
  expect(Object.keys(STORY_STEPS).sort()).toEqual([...ids].sort());
  for (const id of ids) {
    const p = STORY_STEPS[id];
    expect(p.title).not.toBe('');
    expect(p.summary).not.toBe('');
    expect(p.steps.length).toBeGreaterThan(0);
    for (const st of p.steps) expect(st.checks.length).toBeGreaterThan(0);
  }
});

test('chế độ Dễ hiểu không dùng mã lỗi, mã trạng thái hay thuật ngữ kỹ thuật', () => {
  const JARGON = /\b(4[0-9]{3}|APPLIED|ACCEPTED|SENT|NEGOTIATING|VERIFIED|COMPLETED|DRAFT|OPEN|RUNNING|MARKETPLACE|NCC|API|Service)\b|\?[a-z-]+=|<id>/;
  const texts = [
    ...Object.values(STORY_STEPS).flatMap((p) => [p.title, p.summary, ...p.steps.flatMap((st) => [st.screen, ...st.checks])]),
    ...Object.values(RELEASE_PLAIN).flatMap((r) => [r.name, r.goal]),
  ];
  for (const t of texts) expect(t, t).not.toMatch(JARGON);
});

test('lọc theo Epic, và kết hợp vai trò + Epic', () => {
  const r6 = RELEASES[6];
  expect(storiesFor(r6, null, 'E8').map((s) => s.id)).toEqual(['R6-1', 'R6-2', 'R6-3', 'R6-4', 'R6-5']);
  expect(storiesFor(RELEASES[0], null, 'E8')).toEqual([]);
  expect(storiesFor(RELEASES[0], 'Nhãn hàng', 'E1').map((s) => s.id)).toEqual(['R0-1', 'R0-9', 'R0-10']);
});

test('lọc theo vai trò', () => {
  const r0 = RELEASES[0];
  expect(storiesFor(r0, null)).toBe(r0.stories);
  expect(storiesFor(r0, 'Khách').map((s) => s.id)).toEqual(['R0-11']);
  expect(storiesFor(RELEASES[3], 'Khách')).toEqual([]);
});

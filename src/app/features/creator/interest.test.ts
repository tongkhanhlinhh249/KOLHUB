import { expect, test } from 'vitest';
import type { AppliedCampaign, MarketplaceCampaign } from '../../services';
import {
  appliedCounts,
  filterApplied,
  filterSaved,
  INTEREST_TABS,
  interestPath,
  legacySanTabRedirect,
  parseInterestFilter,
  parseInterestTab,
  savedCounts,
} from './interest';

const camp = (id: string, accepting?: boolean) => ({ id, accepting }) as MarketplaceCampaign;
const applied = (id: string, accepting?: boolean) => ({ booking: { id: `bk-${id}` }, campaign: camp(id, accepting) }) as AppliedCampaign;

test('tab và bộ lọc trên URL (mặc định Đã lưu / Tất cả)', () => {
  expect(INTEREST_TABS.map((t) => t.label)).toEqual(['Đã lưu', 'Đã ứng tuyển']);
  expect(parseInterestTab(new URLSearchParams())).toBe('da-luu');
  expect(parseInterestTab(new URLSearchParams('tab=da-ung-tuyen'))).toBe('da-ung-tuyen');
  expect(parseInterestTab(new URLSearchParams('tab=x'))).toBe('da-luu');
  expect(parseInterestFilter(new URLSearchParams('trang-thai=dang-mo'))).toBe('open');
  expect(parseInterestFilter(new URLSearchParams('trang-thai=da-dong'))).toBe('closed');
  expect(parseInterestFilter(new URLSearchParams('trang-thai=x'))).toBe('all');
  expect(interestPath()).toBe('/chien-dich-da-luu');
  expect(interestPath('da-ung-tuyen')).toBe('/chien-dich-da-luu?tab=da-ung-tuyen');
});

test('lọc còn nhận ứng tuyển / đã đóng (không có cờ accepting = còn nhận) và đếm', () => {
  const list = [camp('a', true), camp('b', false), camp('c')];
  expect(filterSaved(list, 'all').map((c) => c.id)).toEqual(['a', 'b', 'c']);
  expect(filterSaved(list, 'open').map((c) => c.id)).toEqual(['a', 'c']);
  expect(filterSaved(list, 'closed').map((c) => c.id)).toEqual(['b']);
  expect(savedCounts(list)).toEqual({ all: 3, open: 2, closed: 1 });
  const apps = [applied('a', false), applied('b', true)];
  expect(filterApplied(apps, 'closed').map((a) => a.campaign.id)).toEqual(['a']);
  expect(filterApplied(apps, 'open').map((a) => a.campaign.id)).toEqual(['b']);
  expect(appliedCounts(apps)).toEqual({ all: 2, open: 1, closed: 1 });
});

test('tab cũ của Sàn chuyển sang Chiến dịch yêu thích', () => {
  expect(legacySanTabRedirect('?tab=da-luu&q=tra')).toBe('/chien-dich-da-luu');
  expect(legacySanTabRedirect('?tab=da-ung-tuyen')).toBe('/chien-dich-da-luu?tab=da-ung-tuyen');
  expect(legacySanTabRedirect('?tab=tat-ca')).toBeNull();
  expect(legacySanTabRedirect('?q=a')).toBeNull();
  expect(legacySanTabRedirect('')).toBeNull();
});

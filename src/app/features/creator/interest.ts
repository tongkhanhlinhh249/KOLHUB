// Pure helpers of "Chiến dịch yêu thích" (/chien-dich-da-luu): tabs Đã lưu / Đã ứng tuyển, the "còn nhận ứng tuyển /
// đã đóng" filter and the redirect of the Sàn's old tabs (/san?tab=da-luu | da-ung-tuyen).
import type { AppliedCampaign, InterestFilter, MarketplaceCampaign } from '../../services';
import { INTERESTED_PATH } from '../../auth/roles';

export type InterestTab = 'da-luu' | 'da-ung-tuyen';
export const INTEREST_TABS: { key: InterestTab; label: string }[] = [
  { key: 'da-luu', label: 'Đã lưu' },
  { key: 'da-ung-tuyen', label: 'Đã ứng tuyển' },
];
export const INTEREST_FILTERS: { key: InterestFilter; param: string | null; label: string }[] = [
  { key: 'all', param: null, label: 'Tất cả' },
  { key: 'open', param: 'dang-mo', label: 'Còn nhận ứng tuyển' },
  { key: 'closed', param: 'da-dong', label: 'Đã đóng' },
];
export const INTEREST_FILTER_PARAM = 'trang-thai';

/** ?tab=da-ung-tuyen (default "Đã lưu"). */
export function parseInterestTab(p: URLSearchParams): InterestTab {
  return p.get('tab') === 'da-ung-tuyen' ? 'da-ung-tuyen' : 'da-luu';
}

/** ?trang-thai=dang-mo | da-dong (default all). */
export function parseInterestFilter(p: URLSearchParams): InterestFilter {
  const v = p.get(INTEREST_FILTER_PARAM);
  return INTEREST_FILTERS.find((f) => f.param && f.param === v)?.key ?? 'all';
}

/** A campaign still takes applications unless the card says otherwise (`accepting` false). */
const isOpen = (c: Pick<MarketplaceCampaign, 'accepting'>) => c.accepting !== false;

export function filterSaved(list: MarketplaceCampaign[], f: InterestFilter): MarketplaceCampaign[] {
  return f === 'all' ? list : list.filter((c) => isOpen(c) === (f === 'open'));
}

export function filterApplied(list: AppliedCampaign[], f: InterestFilter): AppliedCampaign[] {
  return f === 'all' ? list : list.filter((a) => isOpen(a.campaign) === (f === 'open'));
}

export function interestCounts<T>(list: T[], open: (x: T) => boolean): Record<InterestFilter, number> {
  const o = list.filter(open).length;
  return { all: list.length, open: o, closed: list.length - o };
}
export const savedCounts = (list: MarketplaceCampaign[]) => interestCounts(list, isOpen);
export const appliedCounts = (list: AppliedCampaign[]) => interestCounts(list, (a) => isOpen(a.campaign));

/** /chien-dich-da-luu[?tab=da-ung-tuyen]. */
export const interestPath = (tab: InterestTab = 'da-luu') => (tab === 'da-luu' ? INTERESTED_PATH : `${INTERESTED_PATH}?tab=${tab}`);

/**
 * Old Sàn tabs: /san?tab=da-luu → /chien-dich-da-luu, /san?tab=da-ung-tuyen → /chien-dich-da-luu?tab=da-ung-tuyen
 * (other Sàn params are list filters and are dropped). Null when the URL has no such tab.
 */
export function legacySanTabRedirect(search: string): string | null {
  const t = new URLSearchParams(search).get('tab');
  if (t === 'da-luu') return interestPath('da-luu');
  if (t === 'da-ung-tuyen') return interestPath('da-ung-tuyen');
  return null;
}

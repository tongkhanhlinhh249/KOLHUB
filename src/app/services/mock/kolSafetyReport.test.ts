import { describe, expect, test } from 'vitest';
import { makeHarness } from './testHarness';
import { VERIFIED_KOL_EMAIL, VERIFIED_MCN_EMAIL } from './seed';
import {
  buildChannelReport,
  CATEGORY_LABEL,
  channelsOf,
  CONTENT_CATEGORIES,
  createKolSafetyReportService,
  csvCell,
  CSV_HEADER,
  defaultFirstScanAt,
  filterContents,
  formatTimestamp,
  REPORT_SIZE,
  reportCsv,
  summarizeReport,
} from './kolSafetyReport';
import type { ScannedContent } from '../kol-safety-report-types';

const NOW = new Date(2026, 9, 6, 10, 0).getTime();
const CH = { id: 'ch-demo-1', platform: 'tiktok' as const, url: 'tiktok.com/@demo.kenh', followers: 120_000 };

function item(over: Partial<ScannedContent>): ScannedContent {
  return {
    id: 'x',
    seq: 0,
    title: 'Video',
    thumbnail: '',
    url: 'https://tiktok.com/@a/video/1',
    publishedAt: 0,
    durationSec: 60,
    views: 100,
    verdict: 'SAFE',
    score: 90,
    findings: [],
    ...over,
  };
}

describe('buildChannelReport (deterministic generator)', () => {
  test('exactly 30 contents, newest first, deterministic by channel id', () => {
    const a = buildChannelReport(CH, undefined, NOW);
    const b = buildChannelReport(CH, undefined, NOW);
    expect(a.items).toHaveLength(REPORT_SIZE);
    expect(a).toEqual(b);
    for (let i = 1; i < a.items.length; i++) expect(a.items[i - 1].publishedAt).toBeGreaterThan(a.items[i].publishedAt);
    expect(new Set(a.items.map((i) => i.id)).size).toBe(30);
    const other = buildChannelReport({ ...CH, id: 'ch-demo-2' }, undefined, NOW);
    expect(other.items.map((i) => i.score)).not.toEqual(a.items.map((i) => i.score));
  });

  test('mostly An toàn, some Cần xem lại, a few Vi phạm; score bands match the verdict', () => {
    for (const id of ['ch-a', 'ch-b', 'ch-c', 'ch-d', 'ch-e']) {
      const { items } = buildChannelReport({ ...CH, id }, undefined, NOW);
      const { counts } = summarizeReport(items);
      expect(counts.safe).toBeGreaterThan(counts.gray + counts.violation);
      expect(counts.gray).toBeGreaterThanOrEqual(5);
      expect(counts.violation).toBeGreaterThanOrEqual(2);
      expect(counts.violation).toBeLessThanOrEqual(6);
      for (const it of items) {
        if (it.verdict === 'SAFE') expect(it.score).toBeGreaterThanOrEqual(80);
        if (it.verdict === 'GRAY') expect(it.score).toBeGreaterThanOrEqual(50);
        if (it.verdict === 'VIOLATION') expect(it.score).toBeLessThan(50);
        if (it.verdict !== 'SAFE') expect(it.findings.length).toBeGreaterThan(0);
        for (const f of it.findings) {
          expect(f.atSec).toBeLessThan(it.durationSec);
          expect(CONTENT_CATEGORIES).toContain(f.category);
        }
        expect(it.publishedAt).toBeLessThan(NOW);
      }
    }
  });

  test('re-scan keeps contents stable: one new content on top, the oldest drops', () => {
    const first = defaultFirstScanAt(NOW);
    const before = buildChannelReport(CH, undefined, NOW);
    const after = buildChannelReport(
      CH,
      { accountId: 'a', channelId: CH.id, firstScanAt: first, rescans: [NOW + 1000], shared: false },
      NOW + 1000,
    );
    expect(after.scanNo).toBe(2);
    expect(after.scannedAt).toBe(NOW + 1000);
    expect(after.items).toHaveLength(30);
    expect(after.items.slice(1)).toEqual(before.items.slice(0, 29));
    expect(after.items[0].publishedAt).toBeGreaterThan(before.items[0].publishedAt);
    expect(after.items[0].publishedAt).toBeLessThan(NOW + 1000);
  });

  test('defaultFirstScanAt: 06:00 today, or yesterday before 06:00', () => {
    expect(new Date(defaultFirstScanAt(NOW)).getHours()).toBe(6);
    expect(defaultFirstScanAt(NOW)).toBeLessThanOrEqual(NOW);
    const early = new Date(2026, 9, 6, 5, 0).getTime();
    expect(new Date(defaultFirstScanAt(early)).getDate()).toBe(5);
  });
});

describe('summarizeReport', () => {
  test('score, counts, category totals, range, trend and recommendations', () => {
    const items = [
      item({ id: 'a', publishedAt: 3, verdict: 'SAFE', score: 90 }),
      item({
        id: 'b',
        publishedAt: 1,
        verdict: 'GRAY',
        score: 60,
        findings: [
          { atSec: 5, category: 'music_copyright', severity: 'warning', reason: 'r', excerpt: 'e', recommendation: 'x' },
          { atSec: 9, category: 'profanity', severity: 'warning', reason: 'r', excerpt: 'e', recommendation: 'x' },
        ],
      }),
      item({
        id: 'c',
        publishedAt: 2,
        verdict: 'VIOLATION',
        score: 30,
        findings: [{ atSec: 1, category: 'undisclosed_ad', severity: 'violation', reason: 'r', excerpt: 'e', recommendation: 'x' }],
      }),
    ];
    const s = summarizeReport(items);
    // avg 60 − 2 × 1 violation
    expect(s.score).toBe(58);
    expect(s.counts).toEqual({ safe: 1, gray: 1, violation: 1 });
    expect(s.categoryTotals.music_copyright).toBe(1);
    expect(s.categoryTotals.profanity).toBe(1);
    expect(s.categoryTotals.undisclosed_ad).toBe(1);
    expect(s.categoryTotals.child_safety).toBe(0);
    expect(Object.keys(s.categoryTotals)).toHaveLength(8);
    expect(s.from).toBe(1);
    expect(s.to).toBe(3);
    expect(s.trend.map((t) => t.id)).toEqual(['b', 'c', 'a']);
    expect(s.recommendations).toHaveLength(3);
    // The violation (weight 3) leads.
    expect(s.recommendations[0]).toMatch(/#QuangCao/);
  });

  test('empty report: 100 points, no range, general advice', () => {
    const s = summarizeReport([]);
    expect(s.score).toBe(100);
    expect(s.from).toBeNull();
    expect(s.recommendations).toHaveLength(3);
  });

  test('category totals of a generated report equal its findings', () => {
    const { items } = buildChannelReport(CH, undefined, NOW);
    const s = summarizeReport(items);
    const total = Object.values(s.categoryTotals).reduce((a, b) => a + b, 0);
    expect(total).toBe(items.reduce((n, it) => n + it.findings.length, 0));
    expect(s.counts.safe + s.counts.gray + s.counts.violation).toBe(30);
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.score).toBeLessThanOrEqual(100);
  });
});

describe('filterContents', () => {
  const items = [
    item({ id: 'a', title: 'Mở hộp bộ dưỡng da', publishedAt: 3, score: 90 }),
    item({
      id: 'b',
      title: 'Thử thách nấu ăn',
      publishedAt: 1,
      verdict: 'GRAY',
      score: 60,
      findings: [{ atSec: 5, category: 'music_copyright', severity: 'warning', reason: 'Nhạc nền', excerpt: '', recommendation: '' }],
    }),
    item({ id: 'c', title: 'Review quán', publishedAt: 2, verdict: 'VIOLATION', score: 20 }),
  ];
  test('by verdict, category and accent-insensitive search', () => {
    expect(filterContents(items, { verdict: 'GRAY' }).map((i) => i.id)).toEqual(['b']);
    expect(filterContents(items, { category: 'music_copyright' }).map((i) => i.id)).toEqual(['b']);
    expect(filterContents(items, { query: 'mo hop' }).map((i) => i.id)).toEqual(['a']);
    expect(filterContents(items, { query: 'NHẠC' }).map((i) => i.id)).toEqual(['b']);
    expect(filterContents(items, { verdict: 'ALL', category: 'ALL' })).toHaveLength(3);
  });
  test('sort by date and score', () => {
    expect(filterContents(items).map((i) => i.id)).toEqual(['a', 'c', 'b']);
    expect(filterContents(items, { sort: 'date_asc' }).map((i) => i.id)).toEqual(['b', 'c', 'a']);
    expect(filterContents(items, { sort: 'score_asc' }).map((i) => i.id)).toEqual(['c', 'b', 'a']);
    expect(filterContents(items, { sort: 'score_desc' }).map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });
  test('does not mutate the input', () => {
    const copy = items.map((i) => i.id);
    filterContents(items, { sort: 'score_asc' });
    expect(items.map((i) => i.id)).toEqual(copy);
  });
});

describe('CSV', () => {
  test('escapes commas, quotes and line breaks', () => {
    expect(csvCell('abc')).toBe('abc');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('nói "xin chào"')).toBe('"nói ""xin chào"""');
    expect(csvCell('dòng 1\ndòng 2')).toBe('"dòng 1\ndòng 2"');
    expect(csvCell(42)).toBe('42');
  });

  test('UTF-8 BOM, Vietnamese header, one row per content, CRLF', () => {
    const { items } = buildChannelReport(CH, undefined, NOW);
    const csv = reportCsv(items);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe(CSV_HEADER.join(','));
    expect(lines[0]).toContain('Tiêu đề');
    expect(lines.filter(Boolean)).toHaveLength(31);
    const bytes = new TextEncoder().encode(csv);
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });

  test('row content: verdict label, categories, timestamps, quoted title', () => {
    const csv = reportCsv([
      item({
        title: 'Review "siêu" rẻ, đáng mua',
        publishedAt: new Date(2026, 8, 3).getTime(),
        verdict: 'GRAY',
        score: 61,
        findings: [{ atSec: 42, category: 'music_copyright', severity: 'warning', reason: 'Nhạc nền', excerpt: '', recommendation: '' }],
      }),
    ]);
    const row = csv.slice(1).split('\r\n')[1];
    expect(row).toBe(
      `1,"Review ""siêu"" rẻ, đáng mua",03/09/2026,100,Cần xem lại,61,${CATEGORY_LABEL.music_copyright},00:42,Nhạc nền,https://tiktok.com/@a/video/1`,
    );
  });

  test('formatTimestamp', () => {
    expect(formatTimestamp(42)).toBe('00:42');
    expect(formatTimestamp(754)).toBe('12:34');
  });
});

describe('service', () => {
  function setup() {
    const h = makeHarness();
    const svc = createKolSafetyReportService({ db: h.db, now: h.now, delay: false });
    const idOf = (email: string) => h.db.read().accounts.find((a) => a.email === email)!.id;
    return { ...h, svc, newKolId: h.kolId, kolId: idOf(VERIFIED_KOL_EMAIL), mcnId: idOf(VERIFIED_MCN_EMAIL) };
  }

  test('KOL lists own channels; MCN channels are grouped by KOL ("Kênh riêng MCN" last)', async () => {
    const { svc, kolId, mcnId, db, newKolId } = setup();
    expect(await svc.listChannels(newKolId)).toEqual([]);
    const kol = await svc.listChannels(kolId);
    expect(kol.length).toBeGreaterThan(0);
    expect(kol.every((c) => c.group === undefined && c.followers > 0 && !c.handle.startsWith('@'))).toBe(true);
    const mcn = channelsOf(db.read(), mcnId);
    expect(mcn.length).toBeGreaterThan(0);
    expect(mcn.every((c) => !!c.group)).toBe(true);
    const own = mcn.findIndex((c) => c.group === 'Kênh riêng MCN');
    if (own >= 0) expect(mcn.slice(own).every((c) => c.group === 'Kênh riêng MCN')).toBe(true);
  });

  test('report of another account’s channel → KOLHUB-4508', async () => {
    const { svc, kolId, mcnId } = setup();
    const [mcnChannel] = await svc.listChannels(mcnId);
    await expect(svc.getReport(kolId, mcnChannel.id)).rejects.toMatchObject({ code: 'KOLHUB-4508' });
  });

  test('getReport does not write; rescan and share persist', async () => {
    const { svc, kolId, db, clock } = setup();
    const [ch] = await svc.listChannels(kolId);
    const r1 = await svc.getReport(kolId, ch.id);
    expect(r1.items).toHaveLength(30);
    expect(db.read().kolSafetyReports ?? []).toHaveLength(0);
    clock.t += 60_000;
    const r2 = await svc.rescan(kolId, ch.id);
    expect(r2.scanNo).toBe(2);
    expect(r2.items.slice(1)).toEqual(r1.items.slice(0, 29));
    expect((await svc.getReport(kolId, ch.id)).items).toEqual(r2.items);
    const shared = await svc.setShared(kolId, ch.id, true);
    expect(shared.shared).toBe(true);
    expect(shared.sharedAt).toBe(clock.t);
    expect(db.read().kolSafetyReports).toHaveLength(1);
    expect((await svc.setShared(kolId, ch.id, false)).shared).toBe(false);
  });
});

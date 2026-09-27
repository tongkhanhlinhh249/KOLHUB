import { expect, test } from 'vitest';
import type { KolProfile, StoredFile } from '../profile-types';
import { findProfile } from './profileRules';
import { createReviewService } from './review';
import { createSearchService } from './search';
import { makeHarness } from './testHarness';

// Phase 2 → phase 3: a KOL approved by the admin simulator must become
// searchable by brands (BR-54), and must disappear again when its badge expires.
const png: StoredFile = { name: 'p.png', type: 'image/png', size: 100 };

test('KOL được duyệt ở Đợt 2 xuất hiện trong tìm kiếm của Nhãn hàng, hết hạn dấu thì biến mất', async () => {
  const h = makeHarness();
  const review = createReviewService({ db: h.db, now: h.now, notify: () => {}, delay: false });
  const search = createSearchService({ db: h.db, now: h.now, delay: false });

  h.db.update((s) => {
    const p = findProfile(s, h.kolId) as KolProfile;
    Object.assign(p.contact, { displayName: 'Mai Anh Test', province: 'Hà Nội', address: '1 Tràng Tiền', category: 'Giáo dục' });
    p.staff = { staffName: 'Lan', staffPhone: '0987654321', staffEmail: '' };
    p.ekycStatus = 'PASSED';
    s.identities.push({ accountId: h.kolId, fullName: 'MAI ANH TEST', dob: '01/01/1996', idNoMasked: '079*******45', issueDate: '10/08/2021', ekycSessionId: 'x', verifiedAt: h.clock.t });
    s.channels.push({ id: 'c1', ownerType: 'KOL', ownerId: h.kolId, platform: 'tiktok', url: 'https://tiktok.com/@maianhtest', handle: '@maianhtest', proofImage: png, status: 'PENDING_REVIEW', active: true, createdAt: 0, updatedAt: 0 });
  });
  await review.submit(h.kolId, [true, true, true]);
  await review.approve(h.kolId, { c1: { verdict: 'PASS' } });

  const bizId = h.db.read().accounts.find((a) => a.type === 'BIZ')!.id;
  h.db.update((s) => { s.sessionAccountId = bizId; });

  const found = await search.search({ keyword: 'Mai Anh Test' });
  expect(found.items.map((k) => k.displayName)).toContain('Mai Anh Test');

  h.clock.t += 366 * 86_400_000;
  const later = await search.search({ keyword: 'Mai Anh Test' });
  expect(later.items.map((k) => k.displayName)).not.toContain('Mai Anh Test');
});

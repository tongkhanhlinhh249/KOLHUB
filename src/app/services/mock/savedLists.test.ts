import { beforeEach, expect, test } from 'vitest';
import type { Db } from './db';
import { createSavedListService, normalizeListName } from './savedLists';
import { bizState, DAY, iso, kolChannels, NOW, switchSession } from './testing/bizFixtures';

let clock: number;
let db: Db;
let svc: ReturnType<typeof createSavedListService>;
let seq: number;

beforeEach(() => {
  clock = NOW;
  seq = 0;
  db = bizState({ session: 'biz' });
  svc = createSavedListService({ db, now: () => clock, delay: false, genId: () => `list-${++seq}` });
});

test('normalizeListName: NFC, trim, gộp khoảng trắng', () =>
  expect(normalizeListName('  Tết   2027 '.normalize('NFD'))).toBe('Tết 2027'));

test('tạo danh sách: trim, gộp khoảng trắng, count 0', async () =>
  expect(await svc.createList('  Tết   2027 ')).toMatchObject({ id: 'list-1', name: 'Tết 2027', count: 0 }));

test.each([' tết  2027 ', 'TẾT 2027', 'Tết 2027'.normalize('NFD')])('BR-60: "%s" trùng → 4401', async (dup) => {
  await svc.createList('Tết 2027');
  await expect(svc.createList(dup)).rejects.toMatchObject({ code: 'KOLHUB-4401' });
});

test('BR-60: 100 ký tự được, 101 ký tự hoặc rỗng → 4402', async () => {
  await expect(svc.createList('ệ'.repeat(100))).resolves.toBeTruthy();
  await expect(svc.createList('a'.repeat(101))).rejects.toMatchObject({ code: 'KOLHUB-4402' });
  await expect(svc.createList('   ')).rejects.toMatchObject({ code: 'KOLHUB-4402' });
});

test('đổi tên chính nó khác hoa thường được; trùng danh sách khác → 4401', async () => {
  const a = await svc.createList('Tết 2027');
  await svc.createList('Hè 2027');
  await expect(svc.renameList(a.id, 'TẾT 2027')).resolves.toMatchObject({ name: 'TẾT 2027' });
  await expect(svc.renameList(a.id, 'hè 2027')).rejects.toMatchObject({ code: 'KOLHUB-4401' });
  await expect(svc.renameList(a.id, '')).rejects.toMatchObject({ code: 'KOLHUB-4402' });
});

test('cùng tên ở tài khoản khác không tính trùng', async () => {
  await svc.createList('A');
  switchSession(db, 'biz2');
  await expect(svc.createList('A')).resolves.toMatchObject({ name: 'A' });
});

test('listLists theo thứ tự tạo', async () => {
  await svc.createList('B');
  clock += 1000;
  await svc.createList('A');
  expect((await svc.listLists()).map((l) => l.name)).toEqual(['B', 'A']);
});

test('BR-61: một KOL ở nhiều danh sách; bỏ chọn thì rời danh sách, giữ ghi chú ở danh sách còn lại', async () => {
  const a = await svc.createList('A');
  const b = await svc.createList('B');
  expect(await svc.setMembership('KOL-T-0001', [a.id, b.id])).toEqual({ added: 2, removed: 0 });
  await svc.updateNote(a.id, 'KOL-T-0001', 'Gọi lại thứ Hai');
  expect(await svc.setMembership('KOL-T-0001', [a.id])).toEqual({ added: 0, removed: 1 });
  expect((await svc.getMembership('KOL-T-0001')).map((m) => [m.name, m.checked])).toEqual([
    ['A', true],
    ['B', false],
  ]);
  expect((await svc.getList(a.id)).rows[0].note).toBe('Gọi lại thứ Hai');
  expect((await svc.listLists()).map((l) => l.count)).toEqual([1, 0]);
});

test('ghi chú 501 ký tự → 4405; 500 được', async () => {
  const a = await svc.createList('A');
  await svc.setMembership('KOL-T-0001', [a.id]);
  await expect(svc.updateNote(a.id, 'KOL-T-0001', 'x'.repeat(501))).rejects.toMatchObject({ code: 'KOLHUB-4405' });
  await expect(svc.updateNote(a.id, 'KOL-T-0001', 'x'.repeat(500))).resolves.toBeUndefined();
});

test('BR-62: KOL mất dấu / ngừng hoạt động sau khi lưu vẫn ở trong danh sách, hiện trạng thái mới', async () => {
  const a = await svc.createList('A');
  await svc.setMembership('KOL-T-0001', [a.id]);
  await svc.setMembership('KOL-T-0002', [a.id]);
  db.update((s) => {
    kolChannels(s, 'KOL-T-0001').forEach((c) => {
      c.badgeExpiresAt = NOW - 1;
    });
    kolChannels(s, 'KOL-T-0002').forEach((c) => {
      c.active = false;
    });
  });
  const rows = (await svc.getList(a.id)).rows;
  expect(rows.map((r) => [r.kolId, r.status]).sort()).toEqual([
    ['KOL-T-0001', 'BADGE_EXPIRED'],
    ['KOL-T-0002', 'INACTIVE'],
  ]);
});

test('dòng: thông tin công khai, nền tảng của kênh tìm được, mới lưu xếp trước', async () => {
  const a = await svc.createList('A');
  await svc.setMembership('KOL-T-0006', [a.id]);
  clock += DAY;
  await svc.setMembership('KOL-T-0001', [a.id]);
  const rows = (await svc.getList(a.id)).rows;
  expect(rows.map((r) => r.kolId)).toEqual(['KOL-T-0001', 'KOL-T-0006']);
  expect(rows[1]).toEqual({
    kolId: 'KOL-T-0006',
    displayName: 'Kênh Trộn',
    handle: expect.stringMatching(/^ch\d+$/), // nickname = first public channel handle, no "@"
    category: 'Gaming',
    fields: [{ name: 'Gaming', medal: 'none' }],
    platforms: ['facebook'],
    channels: [{ platform: 'facebook', followers: 20_000 }],
    totalFollowers: 20_000,
    status: 'VISIBLE',
    note: '',
    addedAt: iso(NOW),
  });
  expect(JSON.stringify(rows)).not.toContain('0909000001');
});

test('chỉ lưu được KOL đang hiện trong tìm kiếm; KOL không tồn tại → 4404', async () => {
  const a = await svc.createList('A');
  await expect(svc.setMembership('KOL-T-0004', [a.id])).rejects.toMatchObject({ code: 'KOLHUB-4404' });
  await expect(svc.setMembership('KOL-T-9999', [a.id])).rejects.toMatchObject({ code: 'KOLHUB-4404' });
});

test('KOL đã lưu rồi mất dấu vẫn bỏ chọn / đổi danh sách được', async () => {
  const a = await svc.createList('A');
  const b = await svc.createList('B');
  await svc.setMembership('KOL-T-0001', [a.id]);
  db.update((s) => {
    kolChannels(s, 'KOL-T-0001').forEach((c) => {
      c.badgeExpiresAt = NOW - 1;
    });
  });
  await expect(svc.setMembership('KOL-T-0001', [b.id])).resolves.toEqual({ added: 1, removed: 1 });
  await expect(svc.setMembership('KOL-T-0001', [])).resolves.toEqual({ added: 0, removed: 1 });
});

test('KOL biến mất khỏi danh bạ → dòng UNAVAILABLE, không bị xoá', async () => {
  const a = await svc.createList('A');
  await svc.setMembership('KOL-T-0003', [a.id]);
  db.update((s) => {
    s.kolProfiles = s.kolProfiles.filter((k) => k.kolId !== 'KOL-T-0003');
  });
  const [row] = (await svc.getList(a.id)).rows;
  expect(row).toMatchObject({ kolId: 'KOL-T-0003', displayName: 'KOL-T-0003', platforms: [], status: 'UNAVAILABLE' });
});

test('BR-59: tài khoản khác không đọc/sửa được danh sách → 4403', async () => {
  const a = await svc.createList('A');
  switchSession(db, 'biz2');
  expect(await svc.listLists()).toEqual([]);
  for (const call of [
    () => svc.getList(a.id),
    () => svc.renameList(a.id, 'X'),
    () => svc.deleteList(a.id),
    () => svc.setMembership('KOL-T-0001', [a.id]),
    () => svc.removeFromList(a.id, 'KOL-T-0001'),
    () => svc.updateNote(a.id, 'KOL-T-0001', 'x'),
  ])
    await expect(call()).rejects.toMatchObject({ code: 'KOLHUB-4403' });
});

test('xoá danh sách; bỏ khỏi danh sách; getSavedKolIds cập nhật', async () => {
  const a = await svc.createList('A');
  const b = await svc.createList('B');
  await svc.setMembership('KOL-T-0001', [a.id, b.id]);
  await svc.setMembership('KOL-T-0002', [b.id]);
  expect((await svc.getSavedKolIds()).sort()).toEqual(['KOL-T-0001', 'KOL-T-0002']);
  await svc.deleteList(b.id);
  expect(await svc.getSavedKolIds()).toEqual(['KOL-T-0001']);
  await svc.removeFromList(a.id, 'KOL-T-0001');
  expect(await svc.getSavedKolIds()).toEqual([]);
  expect((await svc.listLists()).map((l) => l.name)).toEqual(['A']);
});

test('phiên KOL → 4016', async () => {
  switchSession(db, 'kol');
  await expect(svc.listLists()).rejects.toMatchObject({ code: 'KOLHUB-4016' });
  await expect(svc.createList('A')).rejects.toMatchObject({ code: 'KOLHUB-4016' });
});

test('BR-62: hoàn tác bỏ KOL đã mất dấu (không ở danh sách nào khác) khôi phục đúng mục cũ', async () => {
  const a = await svc.createList('A');
  await svc.setMembership('KOL-T-0006', [a.id]);
  clock += DAY;
  await svc.setMembership('KOL-T-0001', [a.id]);
  clock += DAY;
  await svc.setMembership('KOL-T-0002', [a.id]);
  await svc.updateNote(a.id, 'KOL-T-0001', 'Gọi lại thứ Hai');
  const before = (await svc.getList(a.id)).rows;
  const itemsBefore = db.read().savedLists.find((l) => l.id === a.id)!.items.map((i) => ({ ...i }));

  const removed = await svc.removeFromList(a.id, 'KOL-T-0001');
  expect(removed).toEqual({ listId: a.id, index: 1, item: { kolId: 'KOL-T-0001', note: 'Gọi lại thứ Hai', addedAt: iso(NOW + DAY) } });
  db.update((s) => {
    kolChannels(s, 'KOL-T-0001').forEach((c) => {
      c.badgeExpiresAt = NOW - 1;
    });
  });
  // Re-saving through the normal flow is still blocked for a KOL no longer visible.
  await expect(svc.setMembership('KOL-T-0001', [a.id])).rejects.toMatchObject({ code: 'KOLHUB-4404' });

  clock += DAY;
  await svc.restoreItem(removed!);
  expect(db.read().savedLists.find((l) => l.id === a.id)!.items).toEqual(itemsBefore);
  const after = (await svc.getList(a.id)).rows;
  expect(after.map((r) => r.kolId)).toEqual(before.map((r) => r.kolId));
  expect(after.find((r) => r.kolId === 'KOL-T-0001')).toMatchObject({
    note: 'Gọi lại thứ Hai',
    addedAt: iso(NOW + DAY),
    status: 'BADGE_EXPIRED',
  });

  // Idempotent: restoring twice does not duplicate.
  await svc.restoreItem(removed!);
  expect((await svc.listLists())[0].count).toBe(3);
});

test('restoreItem: danh sách của tài khoản khác → 4403; danh sách đã xoá → 4403', async () => {
  const a = await svc.createList('A');
  await svc.setMembership('KOL-T-0001', [a.id]);
  const removed = (await svc.removeFromList(a.id, 'KOL-T-0001'))!;
  switchSession(db, 'biz2');
  await expect(svc.restoreItem(removed)).rejects.toMatchObject({ code: 'KOLHUB-4403' });
  switchSession(db, 'biz');
  await svc.deleteList(a.id);
  await expect(svc.restoreItem(removed)).rejects.toMatchObject({ code: 'KOLHUB-4403' });
});

test('removeFromList KOL không có trong danh sách → null', async () => {
  const a = await svc.createList('A');
  await expect(svc.removeFromList(a.id, 'KOL-T-0001')).resolves.toBeNull();
});

test('getList: updatedAt của danh sách; kênh + người theo dõi từng kênh', async () => {
  const a = await svc.createList('A');
  clock += DAY;
  await svc.setMembership('KOL-T-0001', [a.id]);
  const d = await svc.getList(a.id);
  expect(d.updatedAt).toBe(iso(NOW + DAY));
  expect(d.rows[0]).toMatchObject({
    handle: 'chaubui',
    channels: [
      { platform: 'tiktok', followers: 3_200_000 },
      { platform: 'facebook', followers: 1_000_000 },
    ],
    totalFollowers: 4_200_000,
  });
  expect(d.rows[0].fields.map((f) => f.name)).toEqual(['Thời trang', 'Làm đẹp', 'Lifestyle']);
});

test('BR-62: KOL hết hạn dấu vẫn hiện kênh và người theo dõi', async () => {
  const a = await svc.createList('A');
  await svc.setMembership('KOL-T-0002', [a.id]);
  db.update((s) => {
    kolChannels(s, 'KOL-T-0002').forEach((c) => {
      c.badgeExpiresAt = NOW - 1;
    });
  });
  const [row] = (await svc.getList(a.id)).rows;
  expect(row).toMatchObject({ status: 'BADGE_EXPIRED', channels: [{ platform: 'youtube', followers: 2_800_000 }], totalFollowers: 2_800_000 });
});

test('KOL biến mất: dòng UNAVAILABLE có kênh rỗng, lĩnh vực rỗng, 0 người theo dõi', async () => {
  const a = await svc.createList('A');
  await svc.setMembership('KOL-T-0003', [a.id]);
  db.update((s) => {
    s.kolProfiles = s.kolProfiles.filter((k) => k.kolId !== 'KOL-T-0003');
  });
  const [row] = (await svc.getList(a.id)).rows;
  expect(row).toMatchObject({ channels: [], fields: [], totalFollowers: 0 });
});

test('moveItems: chuyển giữ ghi chú, ngày lưu mới ở đích; đã có ở đích thì chỉ bỏ khỏi nguồn', async () => {
  const a = await svc.createList('A');
  const b = await svc.createList('B');
  await svc.setMembership('KOL-T-0001', [a.id]);
  await svc.setMembership('KOL-T-0002', [a.id, b.id]);
  await svc.setMembership('KOL-T-0003', [a.id]);
  await svc.updateNote(a.id, 'KOL-T-0001', 'Báo giá 20tr');
  await svc.updateNote(b.id, 'KOL-T-0002', 'Ghi chú B');
  clock += DAY;
  expect(await svc.moveItems(a.id, b.id, ['KOL-T-0001', 'KOL-T-0002', 'KOL-T-9999'])).toEqual({ moved: 1, alreadyInTarget: 1 });
  expect((await svc.getList(a.id)).rows.map((r) => r.kolId)).toEqual(['KOL-T-0003']);
  const rowsB = (await svc.getList(b.id)).rows;
  expect(rowsB.find((r) => r.kolId === 'KOL-T-0001')).toMatchObject({ note: 'Báo giá 20tr', addedAt: iso(NOW + DAY) });
  expect(rowsB.find((r) => r.kolId === 'KOL-T-0002')).toMatchObject({ note: 'Ghi chú B' });
  const lists = await svc.listLists();
  expect(lists.map((l) => [l.count, l.updatedAt])).toEqual([
    [1, iso(NOW + DAY)],
    [2, iso(NOW + DAY)],
  ]);
});

test('moveItems: cùng danh sách → không đổi; danh sách của người khác → 4403', async () => {
  const a = await svc.createList('A');
  await svc.setMembership('KOL-T-0001', [a.id]);
  expect(await svc.moveItems(a.id, a.id, ['KOL-T-0001'])).toEqual({ moved: 0, alreadyInTarget: 0 });
  expect((await svc.listLists())[0].count).toBe(1);
  switchSession(db, 'biz2');
  const other = await svc.createList('X');
  await expect(svc.moveItems(a.id, other.id, ['KOL-T-0001'])).rejects.toMatchObject({ code: 'KOLHUB-4403' });
  await expect(svc.moveItems(other.id, a.id, ['KOL-T-0001'])).rejects.toMatchObject({ code: 'KOLHUB-4403' });
});

test('removeItems + restoreItems: bỏ nhiều KOL rồi hoàn tác đúng vị trí, ghi chú, ngày lưu', async () => {
  const a = await svc.createList('A');
  for (const id of ['KOL-T-0001', 'KOL-T-0002', 'KOL-T-0003', 'KOL-T-0006']) {
    await svc.setMembership(id, [a.id]);
    clock += 1000;
  }
  await svc.updateNote(a.id, 'KOL-T-0003', 'N3');
  const before = db.read().savedLists.find((l) => l.id === a.id)!.items.map((i) => ({ ...i }));
  const removed = await svc.removeItems(a.id, ['KOL-T-0003', 'KOL-T-0001', 'KOL-T-9999']);
  expect(removed.map((r) => r.item.kolId)).toEqual(['KOL-T-0003', 'KOL-T-0001']);
  expect((await svc.getList(a.id)).rows.map((r) => r.kolId).sort()).toEqual(['KOL-T-0002', 'KOL-T-0006']);
  await svc.restoreItems(removed);
  expect(db.read().savedLists.find((l) => l.id === a.id)!.items).toEqual(before);
  await svc.restoreItems(removed);
  expect((await svc.listLists())[0].count).toBe(4);
});

test('removeItems: danh sách của người khác → 4403', async () => {
  const a = await svc.createList('A');
  switchSession(db, 'biz2');
  await expect(svc.removeItems(a.id, ['KOL-T-0001'])).rejects.toMatchObject({ code: 'KOLHUB-4403' });
});

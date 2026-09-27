import type {
  ListMembership,
  SavedList,
  SavedListDetail,
  SavedListItem,
  SavedListRow,
  SavedListSummary,
} from '../bizTypes';
import { KolhubError } from '../types';
import type { Db, DemoState } from './db';
import { delay as fakeDelay } from './delay';
import { currentBizAccount } from './bizSession';
import { findPublicKol, listPublicKols } from './directory';

export const LIST_NAME_MAX = 100;
export const NOTE_MAX = 500;

/** NFC, trim, collapse inner whitespace (BR-60). */
export function normalizeListName(name: string): string {
  return (name ?? '').normalize('NFC').trim().replace(/\s+/g, ' ');
}

const nameKey = (name: string) => normalizeListName(name).toLocaleLowerCase('vi');

/** Snapshot of an item removed from a list, used to undo the removal exactly. */
export interface RemovedListItem {
  listId: string;
  /** Position of the item in the list's stored items at removal time. */
  index: number;
  item: SavedListItem;
}

export interface SavedListServiceDeps {
  db: Db;
  now: () => number;
  /** Pass false in tests to skip the fake network latency. */
  delay?: false;
  genId?: () => string;
}

function summary(l: SavedList): SavedListSummary {
  return { id: l.id, name: l.name, count: l.items.length, updatedAt: l.updatedAt };
}

/** Mock saved lists of the signed-in Brand/Agency account (FR-17, BR-59..62). */
export function createSavedListService(deps: SavedListServiceDeps) {
  const { db, now } = deps;
  const wait = () => (deps.delay === false ? Promise.resolve() : fakeDelay());
  const newId = () => deps.genId?.() ?? crypto.randomUUID();

  function ownLists(state: DemoState): SavedList[] {
    const acc = currentBizAccount(state);
    return state.savedLists
      .filter((l) => l.accountId === acc.id)
      .map((l, i) => ({ l, i }))
      .sort((a, b) => Date.parse(a.l.createdAt) - Date.parse(b.l.createdAt) || a.i - b.i)
      .map((x) => x.l);
  }

  function ownList(state: DemoState, listId: string): SavedList {
    const list = ownLists(state).find((l) => l.id === listId);
    if (!list) throw new KolhubError('KOLHUB-4403');
    return list;
  }

  function validName(state: DemoState, raw: string, exceptId?: string): string {
    const name = normalizeListName(raw);
    const len = [...name].length;
    if (len < 1 || len > LIST_NAME_MAX) throw new KolhubError('KOLHUB-4402', { field: 'name' });
    const key = nameKey(name);
    if (ownLists(state).some((l) => l.id !== exceptId && nameKey(l.name) === key)) {
      throw new KolhubError('KOLHUB-4401', { field: 'name' });
    }
    return name;
  }

  async function listLists(): Promise<SavedListSummary[]> {
    await wait();
    return ownLists(db.read()).map(summary);
  }

  async function createList(raw: string): Promise<SavedListSummary> {
    await wait();
    const state = db.read();
    const acc = currentBizAccount(state);
    const name = validName(state, raw);
    const at = new Date(now()).toISOString();
    const list: SavedList = { id: newId(), accountId: acc.id, name, createdAt: at, updatedAt: at, items: [] };
    db.update((s) => {
      s.savedLists.push(list);
    });
    return summary(list);
  }

  async function renameList(listId: string, raw: string): Promise<SavedListSummary> {
    await wait();
    const state = db.read();
    ownList(state, listId);
    const name = validName(state, raw, listId);
    const at = new Date(now()).toISOString();
    let out!: SavedList;
    db.update((s) => {
      const l = s.savedLists.find((x) => x.id === listId)!;
      l.name = name;
      l.updatedAt = at;
      out = l;
    });
    return summary(out);
  }

  async function deleteList(listId: string): Promise<void> {
    await wait();
    ownList(db.read(), listId);
    db.update((s) => {
      s.savedLists = s.savedLists.filter((l) => l.id !== listId);
    });
  }

  async function getList(listId: string): Promise<SavedListDetail> {
    await wait();
    const state = db.read();
    const list = ownList(state, listId);
    const t = now();
    const dir = listPublicKols(state, t);
    const rows: SavedListRow[] = list.items
      .map((it) => {
        const k = dir.find((x) => x.kolId === it.kolId);
        if (!k) {
          return { kolId: it.kolId, displayName: it.kolId, platforms: [], status: 'UNAVAILABLE' as const, note: it.note, addedAt: it.addedAt };
        }
        const row: SavedListRow = {
          kolId: k.kolId,
          displayName: k.displayName,
          platforms: [...k.platforms],
          status: k.listingStatus,
          note: it.note,
          addedAt: it.addedAt,
        };
        if (k.avatar) row.avatar = k.avatar;
        if (k.category) row.category = k.category;
        return row;
      })
      .sort((a, b) => Date.parse(b.addedAt) - Date.parse(a.addedAt));
    return { id: list.id, name: list.name, rows };
  }

  async function getMembership(kolId: string): Promise<ListMembership[]> {
    await wait();
    return ownLists(db.read()).map((l) => ({
      listId: l.id,
      name: l.name,
      count: l.items.length,
      checked: l.items.some((i) => i.kolId === kolId),
    }));
  }

  async function setMembership(kolId: string, listIds: string[]): Promise<{ added: number; removed: number }> {
    await wait();
    const state = db.read();
    const lists = ownLists(state);
    const own = new Set(lists.map((l) => l.id));
    if (listIds.some((id) => !own.has(id))) throw new KolhubError('KOLHUB-4403');

    const alreadySaved = lists.some((l) => l.items.some((i) => i.kolId === kolId));
    if (!alreadySaved) {
      // Only KOLs currently visible in search can be saved; once saved they may stay (BR-62).
      const k = findPublicKol(state, kolId, now());
      if (!k || k.listingStatus !== 'VISIBLE') throw new KolhubError('KOLHUB-4404');
    }

    const want = new Set(listIds);
    const at = new Date(now()).toISOString();
    let added = 0;
    let removed = 0;
    db.update((s) => {
      for (const l of s.savedLists) {
        if (!own.has(l.id)) continue;
        const has = l.items.some((i) => i.kolId === kolId);
        if (want.has(l.id) && !has) {
          l.items.push({ kolId, note: '', addedAt: at });
          l.updatedAt = at;
          added += 1;
        } else if (!want.has(l.id) && has) {
          l.items = l.items.filter((i) => i.kolId !== kolId);
          l.updatedAt = at;
          removed += 1;
        }
      }
    });
    return { added, removed };
  }

  async function removeFromList(listId: string, kolId: string): Promise<RemovedListItem | null> {
    await wait();
    ownList(db.read(), listId);
    const at = new Date(now()).toISOString();
    let removed: RemovedListItem | null = null;
    db.update((s) => {
      const l = s.savedLists.find((x) => x.id === listId)!;
      const index = l.items.findIndex((i) => i.kolId === kolId);
      if (index < 0) return;
      removed = { listId, index, item: { ...l.items[index] } };
      l.items.splice(index, 1);
      l.updatedAt = at;
    });
    return removed;
  }

  /**
   * Undo of removeFromList: puts back the exact previous item (note, addedAt, position).
   * Skips the "only visible KOLs can be newly saved" rule on purpose — a KOL that lost its
   * badge after being saved stays in lists with its new status (BR-62). No-op if already present.
   */
  async function restoreItem(removed: RemovedListItem): Promise<void> {
    await wait();
    const { listId, index, item } = removed;
    ownList(db.read(), listId);
    const at = new Date(now()).toISOString();
    db.update((s) => {
      const l = s.savedLists.find((x) => x.id === listId)!;
      if (l.items.some((i) => i.kolId === item.kolId)) return;
      l.items.splice(Math.min(Math.max(index, 0), l.items.length), 0, { ...item });
      l.updatedAt = at;
    });
  }

  async function updateNote(listId: string, kolId: string, note: string): Promise<void> {
    await wait();
    const list = ownList(db.read(), listId);
    const text = (note ?? '').trim();
    if ([...text].length > NOTE_MAX) throw new KolhubError('KOLHUB-4405', { field: 'note' });
    if (!list.items.some((i) => i.kolId === kolId)) throw new KolhubError('KOLHUB-4404');
    const at = new Date(now()).toISOString();
    db.update((s) => {
      const l = s.savedLists.find((x) => x.id === listId)!;
      const item = l.items.find((i) => i.kolId === kolId)!;
      item.note = text;
      l.updatedAt = at;
    });
  }

  async function getSavedKolIds(): Promise<string[]> {
    await wait();
    const ids = new Set<string>();
    for (const l of ownLists(db.read())) for (const i of l.items) ids.add(i.kolId);
    return [...ids];
  }

  return {
    listLists,
    createList,
    renameList,
    deleteList,
    getList,
    getMembership,
    setMembership,
    removeFromList,
    restoreItem,
    updateNote,
    getSavedKolIds,
  };
}

export type SavedListService = ReturnType<typeof createSavedListService>;

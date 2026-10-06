import { describe, expect, test } from 'vitest';
import {
  ariaSortOf,
  listViewValue,
  parseListView,
  selectionState,
  toggleAllSelection,
  toggleSelection,
  withListView,
} from './tableView';

describe('list view param (?xem=)', () => {
  test('URL value wins, otherwise table on desktop and cards below', () => {
    expect(parseListView('bang', false)).toBe('table');
    expect(parseListView('the', true)).toBe('cards');
    expect(parseListView(null, true)).toBe('table');
    expect(parseListView(null, false)).toBe('cards');
    expect(parseListView('xyz', true)).toBe('table');
    expect(parseListView('', false)).toBe('cards');
  });
  test('writing keeps the other params', () => {
    expect(listViewValue('table')).toBe('bang');
    expect(listViewValue('cards')).toBe('the');
    const sp = withListView(new URLSearchParams('trang-thai=dang-mo&xem=bang'), 'cards');
    expect(sp.toString()).toBe('trang-thai=dang-mo&xem=the');
    expect(parseListView(sp.get('xem'), true)).toBe('cards');
  });
});

describe('column sort → aria-sort', () => {
  const cols = { a: { sort: 'x', dir: 'ascending' }, b: { sort: 'y', dir: 'descending' } } as const;
  test('active column reads its direction, the others none', () => {
    expect(ariaSortOf(cols, 'a', 'x')).toBe('ascending');
    expect(ariaSortOf(cols, 'b', 'y')).toBe('descending');
    expect(ariaSortOf(cols, 'b', 'x')).toBe('none');
  });
});

describe('row selection', () => {
  test('header state and toggle all', () => {
    const ids = ['a', 'b', 'c'];
    expect(selectionState(new Set(), ids)).toBe('none');
    expect(selectionState(new Set(['a', 'z']), ids)).toBe('some');
    expect(selectionState(new Set(ids), ids)).toBe('all');
    expect(selectionState(new Set(), [])).toBe('none');
    // some → all (rows hidden by a filter stay selected)
    expect([...toggleAllSelection(new Set(['a', 'z']), ids)].sort()).toEqual(['a', 'b', 'c', 'z']);
    // all → none of the visible ones
    expect([...toggleAllSelection(new Set(['a', 'b', 'c', 'z']), ids)]).toEqual(['z']);
  });
  test('toggle one row', () => {
    expect([...toggleSelection(new Set(['a']), 'b')]).toEqual(['a', 'b']);
    expect([...toggleSelection(new Set(['a']), 'a')]).toEqual([]);
  });
});

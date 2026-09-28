import { expect, test } from 'vitest';
import { KOL_CATEGORIES } from '../../services/bizTypes';
import { DEFAULT_FIELD_ICON, fieldIcon } from './fieldIcons';

test('mỗi lĩnh vực chính có icon riêng, không trùng nhau', () => {
  const icons = KOL_CATEGORIES.filter((c) => c !== 'Khác').map((c) => fieldIcon(c));
  expect(icons.every((i) => i !== DEFAULT_FIELD_ICON)).toBe(true);
  expect(new Set(icons).size).toBe(icons.length);
});

test('không phân biệt hoa thường; lĩnh vực phụ dùng icon gần nghĩa; tên lạ dùng icon mặc định', () => {
  expect(fieldIcon('Du Lịch')).toBe(fieldIcon('Du lịch'));
  expect(fieldIcon('Ẩm Thực')).toBe(fieldIcon('Ẩm thực'));
  expect(fieldIcon('Fashion')).toBe(fieldIcon('Thời trang'));
  expect(fieldIcon('Beauty')).toBe(fieldIcon('Làm đẹp'));
  expect(fieldIcon('Family')).toBe(fieldIcon('Gia đình'));
  expect(fieldIcon('Esports')).toBe(fieldIcon('Gaming'));
  expect(fieldIcon('Khác')).toBe(DEFAULT_FIELD_ICON);
  expect(fieldIcon('Một lĩnh vực mới')).toBe(DEFAULT_FIELD_ICON);
});

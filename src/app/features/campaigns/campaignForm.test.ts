import { describe, expect, test } from 'vitest';
import type { Campaign } from '../../services';
import {
  COVER_ERROR,
  coverFileError,
  EMPTY_FORM,
  fieldErrorText,
  formFromCampaign,
  formToInput,
  isFormField,
  newDeliverable,
  recruitBudget,
  suggestTimeline,
  toggle,
  deliverablePlatforms,
  ADVANCED_FIELDS,
  bookingBudget,
} from './campaignForm';

const campaign: Campaign = {
  id: 'c1',
  brandAccountId: 'b',
  name: 'Ra mắt sữa hạt',
  objective: 'Nhận biết',
  brief: 'Brief',
  budget: 300_000_000,
  startDate: '2026-10-01',
  endDate: '2026-10-31',
  platforms: ['tiktok', 'youtube'],
  categories: ['Ẩm thực'],
  deliverables: [{ type: 'VIDEO', platform: 'tiktok', quantity: 3 }],
  groups: [{ platform: 'tiktok', slots: 10, reward: { cash: 30_000_000 } }],
  contentRules: 'Không so sánh',
  visibility: 'MARKETPLACE',
  applyDeadline: '2026-10-10',
  status: 'DRAFT',
  createdAt: 0,
  updatedAt: 0,
};

describe('campaign form', () => {
  test('round-trips a campaign', () => {
    const v = formFromCampaign(campaign);
    expect(v.budget).toBe('300.000.000');
    expect(v.deliverables).toEqual([{ type: 'VIDEO', platform: 'tiktok', quantity: '3' }]);
    expect(v.groups).toEqual([{ platform: 'tiktok', slots: '10', cash: '30.000.000', hasProduct: false, productName: '', productValue: '' }]);
    const input = formToInput(v);
    expect(input).toMatchObject({
      name: 'Ra mắt sữa hạt',
      // Booking 1 KOL: một KOL được chọn → ngân sách = thù lao của nhóm.
      budget: 30_000_000,
      groups: [{ platform: 'tiktok', slots: 1, reward: { cash: 30_000_000 } }],
      startDate: '2026-10-01',
      deliverables: [{ type: 'VIDEO', platform: 'tiktok', quantity: 3 }],
      visibility: 'MARKETPLACE',
      applyDeadline: '2026-10-10',
    });
  });

  test('empty form: budget 0, deadline cleared; private campaigns drop the deadline; bad quantity → 0', () => {
    expect(formToInput(EMPTY_FORM)).toMatchObject({ budget: 0, applyDeadline: null, platforms: [], deliverables: [] });
    const priv = formToInput({ ...formFromCampaign(campaign), visibility: 'PRIVATE' });
    expect(priv.applyDeadline).toBeNull();
    const bad = formToInput({ ...EMPTY_FORM, deliverables: [{ type: 'POST', platform: 'facebook', quantity: '2.5' }] });
    expect(bad.deliverables).toEqual([{ type: 'POST', platform: 'facebook', quantity: 0 }]);
  });

  test('draft without budget shows an empty budget field', () => {
    expect(formFromCampaign({ ...campaign, budget: 0, startDate: undefined, applyDeadline: undefined })).toMatchObject({
      budget: '',
      startDate: '',
      applyDeadline: '',
    });
  });

  test('ảnh chiến dịch: giữ khi sửa, null khi không có; kiểm tra định dạng / dung lượng trước khi đọc', () => {
    const cover = { name: 'bia.jpg', type: 'image/jpeg', size: 1000, thumbnail: 'data:image/jpeg;base64,AA' };
    expect(formFromCampaign({ ...campaign, cover }).cover).toEqual(cover);
    expect(formToInput(formFromCampaign({ ...campaign, cover })).cover).toEqual(cover);
    expect(formFromCampaign(campaign).cover).toBeNull();
    expect(formToInput(EMPTY_FORM).cover).toBeNull();
    expect(coverFileError({ type: 'image/webp', size: 10 * 1024 * 1024 })).toBeUndefined();
    expect(coverFileError({ type: 'image/png', size: 10 * 1024 * 1024 + 1 })).toBe(COVER_ERROR);
    expect(coverFileError({ type: 'image/gif', size: 10 })).toBe(COVER_ERROR);
    expect(isFormField('cover')).toBe(true);
  });

  test('helpers', () => {
    expect(newDeliverable(['youtube'])).toEqual({ type: 'VIDEO', platform: 'youtube', quantity: '1' });
    expect(newDeliverable([]).platform).toBe('tiktok');
    expect(toggle(['a', 'b'], 'a')).toEqual(['b']);
    expect(toggle(['a'], 'b')).toEqual(['a', 'b']);
    expect(isFormField('dates')).toBe(true);
    expect(isFormField('note')).toBe(false);
    expect(fieldErrorText('dates', 'Thời gian không hợp lệ.')).toMatch(/^Thời gian không hợp lệ\. Cần ngày bắt đầu/);
    expect(fieldErrorText('xyz', 'Lỗi.')).toBe('Lỗi.');
  });
});

test('Booking nhiều KOL: form ↔ dữ liệu (suất, phần thưởng, lịch, điều kiện, khảo sát, điều khoản)', () => {
  expect(EMPTY_FORM.terms.length).toBe(2); // điều khoản mặc định
  const v = {
    ...EMPTY_FORM,
    name: 'Tuyển KOL',
    type: 'OPEN_RECRUITMENT' as const,
    slots: '5',
    rewardCash: '2.000.000',
    hasProduct: true,
    productName: 'Bình giữ nhiệt',
    productValue: '450.000',
    timeline: suggestTimeline('2026-10-10'),
    draftReview: false,
    useConditions: true,
    useSurvey: true,
    regions: ['Hà Nội'],
    ageMin: '20',
    gender: 'FEMALE' as const,
    minFollowers: '10.000',
    survey: [
      { text: 'Bạn chạy bộ mấy buổi mỗi tuần?', required: true },
      { text: '   ', required: false },
    ],
    visibility: 'PRIVATE' as const,
    applyDeadline: '2026-10-12',
  };
  expect(recruitBudget(v)).toBe(12_250_000);
  const input = formToInput(v);
  expect(input).toMatchObject({
    type: 'OPEN_RECRUITMENT',
    visibility: 'MARKETPLACE',
    applyDeadline: null,
    draftReview: false,
    regions: ['Hà Nội'],
    target: { ageMin: 20, gender: 'FEMALE', minFollowers: 10_000 },
    survey: [{ text: 'Bạn chạy bộ mấy buổi mỗi tuần?', required: true }],
    recruitment: { slots: 5, reward: { cash: 2_000_000, product: { name: 'Bình giữ nhiệt', value: 450_000 } } },
  });
  expect(input.recruitment!.timeline).toMatchObject({ applyStart: '2026-10-10', applyEnd: '2026-10-16', selectStart: '2026-10-17', reviewEnd: '2026-11-09' });
  // Booking riêng: xoá khối tuyển, giữ điều kiện / khảo sát.
  expect(formToInput({ ...v, type: 'BOOKING' })).toMatchObject({ recruitment: null, visibility: 'PRIVATE' });
  expect(formToInput({ ...v, slots: 'abc' }).recruitment!.slots).toBeNaN();
  expect(isFormField('timeline')).toBe(true);
});

test('Tính năng của chiến dịch: bật/tắt từng thẻ; tắt thì xoá dữ liệu của thẻ đó khi lưu', () => {
  // Mặc định: Hợp đồng, Duyệt nháp bật; Sự tuân thủ, Điều kiện, Khảo sát tắt.
  expect(EMPTY_FORM).toMatchObject({ contract: true, draftReview: true, payCash: true, useContentRules: false, useConditions: false, useSurvey: false });
  const on = {
    ...EMPTY_FORM,
    name: 'X',
    visibility: 'MARKETPLACE' as const,
    contentRules: 'Gắn #QuangCao',
    useContentRules: true,
    regions: ['Hà Nội'],
    useConditions: true,
    survey: [{ text: 'Câu 1', required: true }],
    useSurvey: true,
  };
  expect(formToInput(on)).toMatchObject({ contentRules: 'Gắn #QuangCao', regions: ['Hà Nội'], survey: [{ text: 'Câu 1' }], contract: true });
  expect(formToInput(on).terms).toHaveLength(2);
  const off = formToInput({ ...on, useContentRules: false, useConditions: false, useSurvey: false, contract: false });
  expect(off).toMatchObject({ contentRules: '', regions: [], target: null, survey: [], terms: [], contract: false });
  // Booking riêng Riêng tư (chỉ mời): điều kiện tham gia và khảo sát không áp dụng → bỏ khi lưu.
  expect(formToInput({ ...on, visibility: 'PRIVATE' })).toMatchObject({ regions: [], target: null, survey: [], contentRules: 'Gắn #QuangCao' });
  // Tuyển nhiều KOL: tắt "Đề nghị trả phí" → tiền mặt 0.
  const recruit = { ...on, type: 'OPEN_RECRUITMENT' as const, slots: '3', rewardCash: '1.000.000', payCash: false, hasProduct: true, productName: 'Quà', productValue: '200.000' };
  expect(formToInput(recruit).recruitment!.reward.cash).toBe(0);
  expect(recruitBudget(recruit)).toBe(600_000);
});

test('Tính năng của chiến dịch: đọc trạng thái bật/tắt từ chiến dịch đã lưu', () => {
  const base = formFromCampaign({ ...campaign, contentRules: '', regions: [], target: undefined, survey: [], contract: false });
  expect(base).toMatchObject({ useContentRules: false, useConditions: false, useSurvey: false, contract: false });
  const full = formFromCampaign({ ...campaign, contentRules: 'Quy định', regions: ['Huế'], survey: [{ id: 'q-1', text: 'Câu', required: false }] });
  expect(full).toMatchObject({ useContentRules: true, useConditions: true, useSurvey: true, contract: true });
});

test('Booking 1 KOL: nền tảng lấy theo hạng mục, không có ô chọn nền tảng riêng', () => {
  const v = {
    ...EMPTY_FORM,
    name: 'Book 1 KOL',
    platforms: ['youtube' as const],
    deliverables: [
      { type: 'VIDEO' as const, platform: 'tiktok' as const, quantity: '2' },
      { type: 'POST' as const, platform: 'instagram' as const, quantity: '1' },
      { type: 'VIDEO' as const, platform: 'tiktok' as const, quantity: '1' },
    ],
  };
  expect(deliverablePlatforms(v.deliverables)).toEqual(['tiktok', 'instagram']);
  expect(formToInput(v).platforms).toEqual(['tiktok', 'instagram']);
  expect(formToInput({ ...v, deliverables: [] }).platforms).toEqual([]);
  // Tuyển nhiều KOL giữ ô chọn nền tảng.
  expect(formToInput({ ...v, type: 'OPEN_RECRUITMENT' }).platforms).toEqual(['youtube']);
  expect(ADVANCED_FIELDS).toContain('visibility');
  expect(ADVANCED_FIELDS).not.toContain('brief');
  // Quyền lợi theo nhóm đầu việc: một nhóm mỗi nền tảng của hạng mục; nhóm chưa nhập → 0 ₫ (dịch vụ báo lỗi khi đăng).
  const groups = [
    { platform: 'tiktok' as const, slots: '3', cash: '10.000.000', hasProduct: true, productName: 'Quà', productValue: '500.000' },
    { platform: 'youtube' as const, slots: '9', cash: '99.000.000', hasProduct: false, productName: '', productValue: '' },
  ];
  const withGroups = formToInput({ ...v, groups });
  expect(withGroups.groups).toEqual([
    { platform: 'tiktok', slots: 1, reward: { cash: 10_000_000, product: { name: 'Quà', value: 500_000 } } },
    { platform: 'instagram', slots: 1, reward: { cash: 0 } },
  ]);
  // Booking 1 KOL: ngân sách = quyền lợi của KOL được chọn (10.000.000 + 500.000); nhóm YouTube không còn hạng mục nên không tính.
  expect(bookingBudget({ ...v, groups })).toBe(10_500_000);
  expect(withGroups.budget).toBe(10_500_000);
  expect(formToInput({ ...v, groups, type: 'OPEN_RECRUITMENT' }).groups).toBeNull();
});

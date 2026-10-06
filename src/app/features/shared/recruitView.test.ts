import { expect, test } from 'vitest';
import { milestoneRows, phaseBadge, recruitStage, regionText, rewardShort, rewardText, targetRows, vndShort, workflowLabel } from './recruitView';

const now = new Date(2026, 9, 6, 10).getTime();
const timeline = {
  applyStart: '2026-10-01',
  applyEnd: '2026-10-11',
  selectStart: '2026-10-12',
  selectEnd: '2026-10-14',
  postStart: '2026-10-15',
  postEnd: '2026-10-30',
  reviewStart: '2026-10-31',
  reviewEnd: '2026-11-05',
};

test('nhãn giai đoạn: D-n tới hết Ứng tuyển, Tuyển chọn, Đang đăng bài, Đã kết thúc; Booking riêng theo hạn đề xuất', () => {
  const r = { type: 'OPEN_RECRUITMENT' as const, recruitment: { timeline } };
  expect(phaseBadge({ ...r, phase: 'APPLY' }, now)).toMatchObject({ text: 'D-5', urgent: false });
  expect(phaseBadge({ ...r, phase: 'APPLY', recruitment: { timeline: { ...timeline, applyEnd: '2026-10-06' } } }, now)).toMatchObject({ text: 'D-Day', urgent: true });
  expect(phaseBadge({ ...r, phase: 'SELECT' }, now).text).toBe('Tuyển chọn');
  expect(phaseBadge({ ...r, phase: 'POST' }, now).text).toBe('Đang đăng bài');
  expect(phaseBadge({ ...r, phase: 'ENDED' }, now).text).toBe('Đã kết thúc');
  expect(phaseBadge({ ...r, phase: 'UPCOMING' }, now).text).toBe('Sắp mở');
  expect(phaseBadge({ type: 'BOOKING', applyDeadline: '2026-10-08' }, now)).toMatchObject({ text: 'D-2', urgent: true });
  expect(phaseBadge({ type: 'BOOKING' }, now).text).toBe('Đang nhận đề xuất');
});

test('phần thưởng, khu vực, workflow, điều kiện', () => {
  const r = { cash: 3_000_000, product: { name: 'Máy làm sữa hạt mini', value: 2_500_000 } };
  expect(rewardText(r)).toBe('3.000.000 ₫ + Máy làm sữa hạt mini (trị giá 2.500.000 ₫)');
  expect(rewardShort(r)).toBe('3 triệu ₫ + quà 2,5 triệu ₫');
  expect(rewardShort({ cash: 0, product: { name: 'Bình', value: 450_000 } })).toBe('Quà 450.000 ₫');
  expect(vndShort(25_000_000)).toBe('25 triệu ₫');
  expect(regionText([])).toBe('Toàn quốc');
  expect(regionText(['Hà Nội', 'Huế', 'Cần Thơ', 'Đà Nẵng'])).toBe('Hà Nội, Huế +2');
  expect(workflowLabel(false)).toBe('Đăng trực tiếp');
  expect(targetRows({ ageMin: 20, ageMax: 30, gender: 'FEMALE', minFollowers: 10_000 }, ['Ẩm thực']).map((x) => x.value)).toEqual([
    '20–30 tuổi',
    'Nữ',
    '10K người theo dõi',
    'Ẩm thực',
  ]);
  expect(targetRows(undefined, []).map((x) => x.value)).toEqual(['Không giới hạn', 'Không giới hạn', 'Không yêu cầu', 'Không giới hạn']);
});

test('dòng thời gian 4 mốc và giai đoạn của ứng viên', () => {
  expect(milestoneRows(timeline, 'SELECT').map((m) => m.state)).toEqual(['done', 'current', 'upcoming', 'upcoming']);
  expect(milestoneRows(timeline, 'ENDED').every((m) => m.state === 'done')).toBe(true);
  expect(milestoneRows(timeline, 'UPCOMING')[0]).toMatchObject({ label: 'Ứng tuyển', range: '01/10 – 11/10', state: 'upcoming' });
  expect(recruitStage({ status: 'APPLIED' })).toBe('APPLIED');
  expect(recruitStage({ status: 'ACCEPTED' })).toBe('SELECTED');
  expect(recruitStage({ status: 'PUBLISHED' })).toBe('WORKING');
  expect(recruitStage({ status: 'COMPLETED' })).toBe('DONE');
  expect(recruitStage({ status: 'DECLINED' })).toBe('NOT_SELECTED');
  expect(recruitStage({ status: 'CANCELLED' })).toBe('WITHDRAWN');
  expect(recruitStage({ status: 'CANCELLED', acceptedAt: 1 })).toBe('CANCELLED');
});

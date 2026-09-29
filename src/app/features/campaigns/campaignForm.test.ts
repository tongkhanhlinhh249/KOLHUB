import { describe, expect, test } from 'vitest';
import type { Campaign } from '../../services';
import { EMPTY_FORM, fieldErrorText, formFromCampaign, formToInput, isFormField, newDeliverable, toggle } from './campaignForm';

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
    const input = formToInput(v);
    expect(input).toMatchObject({
      name: 'Ra mắt sữa hạt',
      budget: 300_000_000,
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

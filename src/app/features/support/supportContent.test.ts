import { expect, test } from 'vitest';
import { resolveAccess } from '../../auth/roles';
import { checkSupportRequest, FAQ, guideSteps } from './supportContent';

test('hướng dẫn KOL/MCN: 6 bước từ kết nối kênh tới nhận thanh toán; mọi liên kết mở được với vai trò đó', () => {
  expect(guideSteps('KOL').map((s) => s.title)).toEqual([
    'Kết nối kênh',
    'Xác thực hồ sơ',
    'Tìm chiến dịch trên Sàn',
    'Ứng tuyển hoặc nhận lời mời',
    'Nộp nháp và đăng bài',
    'Nhận thanh toán',
  ]);
  expect(guideSteps('MCN')[0].to).toBe('/ho-so-mcn/kenh');
  const role = { KOL: 'kolhub.user.kol', MCN: 'kolhub.user.mcn', BIZ: 'kolhub.user.biz' } as const;
  for (const t of ['KOL', 'MCN', 'BIZ'] as const)
    for (const s of guideSteps(t)) if (s.to) expect(resolveAccess(role[t], s.to), `${t} ${s.to}`).toEqual({ allow: true });
});

test('FAQ: khoảng 10 câu, đủ chủ đề, id không trùng; không có số điện thoại hay email thật', () => {
  expect(FAQ.length).toBeGreaterThanOrEqual(10);
  expect(new Set(FAQ.map((f) => f.id)).size).toBe(FAQ.length);
  for (const t of ['Chiến dịch', 'Thanh toán', 'Sản phẩm', 'KOL Safety', 'MCN', 'Vi phạm']) expect(FAQ.some((f) => f.topic === t)).toBe(true);
  const text = FAQ.map((f) => `${f.q} ${f.a}`).join(' ');
  expect(text).not.toMatch(/@|\b0\d{9}\b/);
});

test('kiểm tra yêu cầu hỗ trợ: chủ đề, 10–1000 ký tự', () => {
  expect(checkSupportRequest('', 'Nội dung đủ dài rồi')).toMatchObject({ ok: false });
  expect(checkSupportRequest('Khác', '  ngắn  ')).toMatchObject({ ok: false });
  expect(checkSupportRequest('Khác', 'x'.repeat(1001))).toMatchObject({ ok: false });
  expect(checkSupportRequest('Thanh toán, thu nhập', '  Chưa nhận được tiền của booking A  ')).toEqual({ ok: true, text: 'Chưa nhận được tiền của booking A' });
});

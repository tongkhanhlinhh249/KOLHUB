import { beforeEach, describe, expect, test } from 'vitest';
import { createDb } from './db';
import { seedState } from './seed';
import { createOtpService, smsBody, type OtpMessage, type OtpService } from './otp';
import { otpInbox } from '../otpInbox';

let clock: number;
let sent: OtpMessage[];
let otp: OtpService;
const sms = { channel: 'sms', target: '0912345678', purpose: 'register' } as const;

beforeEach(() => {
  clock = 1_800_000_000_000;
  sent = [];
  otp = createOtpService({
    db: createDb(null, seedState),
    now: () => clock,
    notify: (m) => sent.push(m),
    genCode: () => '123456',
    delay: false,
  });
});

describe('OTP service', () => {
  test('gửi và xác thực đúng mã', async () => {
    const r = await otp.send(sms);
    expect(r.expiresAt).toBe(clock + 5 * 60_000);
    expect(r.resendAvailableAt).toBe(clock + 60_000);
    await expect(otp.verify({ requestId: r.requestId, code: '123456' })).resolves.toBeUndefined();
    expect(otp.isVerified(r.requestId, sms)).toBe(true);
  });

  test('mã hết hạn sau 5 phút → 4006', async () => {
    const { requestId } = await otp.send({ channel: 'sms', target: '0912345678', purpose: 'register' });
    clock += 5 * 60_000 + 1;
    await expect(otp.verify({ requestId, code: '123456' })).rejects.toMatchObject({ code: 'KOLHUB-4006' });
  });

  test('sai mã → 4005 kèm số lần còn lại; lần sai thứ 5 → 4009 và huỷ mã', async () => {
    const { requestId } = await otp.send(sms);
    for (let i = 1; i <= 4; i++)
      await expect(otp.verify({ requestId, code: '000000' })).rejects.toMatchObject({
        code: 'KOLHUB-4005',
        meta: { attemptsLeft: 5 - i },
      });
    await expect(otp.verify({ requestId, code: '000000' })).rejects.toMatchObject({ code: 'KOLHUB-4009' });
    await expect(otp.verify({ requestId, code: '123456' })).rejects.toMatchObject({ code: 'KOLHUB-4009' });
    expect(otp.isVerified(requestId, sms)).toBe(false);
  });

  test('gửi lại trong 60 giây → 4007 kèm retryAfterSec', async () => {
    await otp.send(sms);
    clock += 20_000;
    await expect(otp.send(sms)).rejects.toMatchObject({ code: 'KOLHUB-4007', meta: { retryAfterSec: 40 } });
  });

  test('gửi lại dạng SĐT khác (+84) vẫn bị chặn 60 giây', async () => {
    await otp.send(sms);
    await expect(otp.send({ ...sms, target: '+84912345678' })).rejects.toMatchObject({ code: 'KOLHUB-4007' });
  });

  test('gửi mã mới làm mã cũ hết hiệu lực', async () => {
    const a = await otp.send(sms);
    clock += 61_000;
    await otp.send(sms);
    await expect(otp.verify({ requestId: a.requestId, code: '123456' })).rejects.toMatchObject({ code: 'KOLHUB-4006' });
  });

  test('lần gửi thứ 6 trong 1 giờ → 4007', async () => {
    for (let i = 0; i < 5; i++) {
      await otp.send(sms);
      clock += 61_000;
    }
    await expect(otp.send(sms)).rejects.toMatchObject({ code: 'KOLHUB-4007' });
  });

  test('hết 1 giờ thì gửi lại được', async () => {
    for (let i = 0; i < 5; i++) {
      await otp.send(sms);
      clock += 61_000;
    }
    clock += 60 * 60_000;
    await expect(otp.send(sms)).resolves.toHaveProperty('requestId');
  });

  test('giới hạn tính riêng theo kênh', async () => {
    await otp.send(sms);
    await expect(otp.send({ channel: 'email', target: 'a@b.vn', purpose: 'register' })).resolves.toHaveProperty('requestId');
  });

  test('mã dùng một lần', async () => {
    const { requestId } = await otp.send(sms);
    await otp.verify({ requestId, code: '123456' });
    await expect(otp.verify({ requestId, code: '123456' })).rejects.toMatchObject({ code: 'KOLHUB-4006' });
  });

  test('requestId không tồn tại → 4006', async () => {
    await expect(otp.verify({ requestId: 'nope', code: '123456' })).rejects.toMatchObject({ code: 'KOLHUB-4006' });
  });

  test('isVerified kiểm tra đúng kênh, đích (chuẩn hoá) và mục đích', async () => {
    const e = await otp.send({ channel: 'email', target: ' Kol@Demo.VN ', purpose: 'register' });
    await otp.verify({ requestId: e.requestId, code: '123456' });
    expect(otp.isVerified(e.requestId, { channel: 'email', target: 'kol@demo.vn', purpose: 'register' })).toBe(true);
    expect(otp.isVerified(e.requestId, { channel: 'email', target: 'khac@demo.vn', purpose: 'register' })).toBe(false);
    expect(otp.isVerified(e.requestId, { channel: 'email', target: 'kol@demo.vn', purpose: 'reset' })).toBe(false);
    expect(otp.isVerified(e.requestId, { channel: 'sms', target: 'kol@demo.vn', purpose: 'register' })).toBe(false);
  });

  test('SMS đăng ký dùng đúng MẪU-01', async () => {
    await otp.send(sms);
    expect(sent[0].body).toBe(
      'KOLHUB: Ma xac thuc dang ky tai khoan cua ban la 123456. Hieu luc 5 phut. Khong chia se ma nay cho bat ky ai.',
    );
    expect(sent[0]).toMatchObject({ channel: 'sms', target: '0912345678', code: '123456' });
  });

  test('MẪU-02, MẪU-03 và nội dung email', async () => {
    expect(smsBody('login', '111111')).toBe(
      'KOLHUB: Ma dang nhap cua ban la 111111. Hieu luc 5 phut. Khong chia se ma nay cho bat ky ai.',
    );
    expect(smsBody('reset', '222222')).toBe(
      'KOLHUB: Ma dat lai mat khau cua ban la 222222. Hieu luc 5 phut. Neu ban khong yeu cau, vui long bo qua tin nhan nay.',
    );
    await otp.send({ channel: 'email', target: 'a@b.vn', purpose: 'register' });
    expect(sent[0].body).toBe('Mã xác thực KOLHUB của bạn là 123456. Hiệu lực 5 phút.');
  });

  test('mã mặc định là 6 chữ số', async () => {
    const got: OtpMessage[] = [];
    const s = createOtpService({ db: createDb(null, seedState), now: () => clock, notify: (m) => got.push(m), delay: false });
    await s.send(sms);
    expect(got[0].code).toMatch(/^\d{6}$/);
  });
});

describe('otpInbox', () => {
  test('publish tới subscriber, unsubscribe thì ngừng', () => {
    const got: OtpMessage[] = [];
    const off = otpInbox.subscribe((m) => got.push(m));
    const m: OtpMessage = { channel: 'sms', target: '0912345678', body: 'x', code: '123456' };
    otpInbox.publish(m);
    off();
    otpInbox.publish(m);
    expect(got).toEqual([m]);
  });
});

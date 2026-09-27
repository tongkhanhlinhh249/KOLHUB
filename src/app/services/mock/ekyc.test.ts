import { beforeEach, describe, expect, test } from 'vitest';
import type { EkycScenario, StoredFile } from '../profile-types';
import { createEkycService } from './ekyc';
import { findProfile } from './profileRules';
import { makeHarness, type Harness } from './testHarness';

const img = (name: string): StoredFile => ({ name, type: 'image/jpeg', size: 1000 });
const cards = { front: img('front.jpg'), back: img('back.jpg') };
const video: StoredFile = { name: 'face.webm', type: 'video/webm', size: 5000 };

let h: Harness;
let ekyc: ReturnType<typeof createEkycService>;

beforeEach(() => {
  h = makeHarness();
  ekyc = createEkycService({ db: h.db, now: h.now, delay: false });
});

async function setDisplayName(name: string) {
  h.db.update((s) => {
    findProfile(s, h.kolId)!.contact.displayName = name;
  });
}

async function failTimes(n: number, code: EkycScenario) {
  ekyc.setScenario('SUCCESS');
  await ekyc.submitIdCard(h.kolId, cards);
  ekyc.setScenario(code);
  for (let i = 0; i < n; i++) await expect(ekyc.submitFaceVideo(h.kolId, video)).rejects.toBeTruthy();
}

describe('eKYC', () => {
  test('SUCCESS: CCCD → OCR_PASSED, video → PASSED, vault có số CCCD đã che', async () => {
    expect((await ekyc.submitIdCard(h.kolId, cards)).status).toBe('OCR_PASSED');
    const v = await ekyc.submitFaceVideo(h.kolId, video);
    expect(v.status).toBe('PASSED');
    expect(v.identity?.idNoMasked).toMatch(/^079\*{7}\d{2}$/);
    expect(JSON.stringify(h.db.read().identities)).not.toMatch(/079096\d{6}/);
    expect(h.db.read().funnel.map((f) => f.step)).toEqual(['ekyc_ocr_passed', 'ekyc_face_passed']);
  });

  test('4101 bốn lần: attemptsLeft 4,3,2,1; lần 5 → 4108 kèm lockedUntil = +24h', async () => {
    ekyc.setScenario('KOLHUB-4101');
    for (let i = 1; i <= 4; i++) {
      await expect(ekyc.submitIdCard(h.kolId, cards)).rejects.toMatchObject({
        code: 'KOLHUB-4101',
        meta: { attemptsLeft: 5 - i },
      });
      h.clock.t += 60_000;
    }
    const fifthAt = h.clock.t;
    await expect(ekyc.submitIdCard(h.kolId, cards)).rejects.toMatchObject({
      code: 'KOLHUB-4108',
      meta: { lockedUntil: fifthAt + 86_400_000 },
    });
    expect(await ekyc.getState(h.kolId)).toMatchObject({ attemptsLeft: 0, lockedUntil: fifthAt + 86_400_000 });
  });

  test('đang khoá: kịch bản SUCCESS vẫn 4108; mở đúng lúc +24h', async () => {
    await failTimes(5, 'KOLHUB-4105');
    ekyc.setScenario('SUCCESS');
    await expect(ekyc.submitFaceVideo(h.kolId, video)).rejects.toMatchObject({ code: 'KOLHUB-4108' });
    h.clock.t += 86_400_000 - 1;
    await expect(ekyc.submitFaceVideo(h.kolId, video)).rejects.toMatchObject({ code: 'KOLHUB-4108' });
    h.clock.t += 1;
    await expect(ekyc.submitFaceVideo(h.kolId, video)).resolves.toMatchObject({ status: 'PASSED' });
  });

  test('hết khoá → đếm lại từ 0', async () => {
    await failTimes(5, 'KOLHUB-4106');
    h.clock.t += 86_400_000;
    expect((await ekyc.getState(h.kolId)).attemptsLeft).toBe(5);
    await expect(ekyc.submitFaceVideo(h.kolId, video)).rejects.toMatchObject({ code: 'KOLHUB-4106', meta: { attemptsLeft: 4 } });
  });

  test.each(['KOLHUB-5101', 'KOLHUB-4107', 'KOLHUB-4104'])('%s không tính lần thử', async (code) => {
    ekyc.setScenario(code as EkycScenario);
    for (let i = 0; i < 6; i++) await expect(ekyc.submitIdCard(h.kolId, cards)).rejects.toMatchObject({ code });
    expect((await ekyc.getState(h.kolId)).attemptsLeft).toBe(5);
  });

  test('xen 5101 giữa các lần 4102 không làm khoá sớm', async () => {
    for (let i = 0; i < 4; i++) {
      ekyc.setScenario('KOLHUB-4102');
      await expect(ekyc.submitIdCard(h.kolId, cards)).rejects.toMatchObject({ code: 'KOLHUB-4102' });
      if (i < 3) {
        ekyc.setScenario('KOLHUB-5101');
        await expect(ekyc.submitIdCard(h.kolId, cards)).rejects.toMatchObject({ code: 'KOLHUB-5101' });
      }
    }
    const st = await ekyc.getState(h.kolId);
    expect(st.attemptsLeft).toBe(1);
    expect(st.lockedUntil).toBeUndefined();
  });

  test('lần thử cũ hơn 24 giờ không tính', async () => {
    ekyc.setScenario('KOLHUB-4101');
    for (let i = 0; i < 4; i++) await expect(ekyc.submitIdCard(h.kolId, cards)).rejects.toBeTruthy();
    h.clock.t += 86_400_000;
    await expect(ekyc.submitIdCard(h.kolId, cards)).rejects.toMatchObject({ code: 'KOLHUB-4101', meta: { attemptsLeft: 4 } });
  });

  test('4103 → draft nameMismatch, chọn cập nhật hồ sơ → tên hồ sơ theo CCCD, OCR_PASSED', async () => {
    await setDisplayName('Khánh Vy');
    ekyc.setScenario('KOLHUB-4103');
    await expect(ekyc.submitIdCard(h.kolId, cards)).rejects.toMatchObject({ code: 'KOLHUB-4103' });
    expect((await ekyc.getState(h.kolId)).draft).toMatchObject({
      nameMismatch: true,
      fullName: 'TRẦN THỊ BÌNH',
      profileName: 'Khánh Vy',
    });
    const v = await ekyc.resolveNameMismatch(h.kolId, 'update-profile');
    expect(v.status).toBe('OCR_PASSED');
    expect(findProfile(h.db.read(), h.kolId)!.contact.displayName).toBe('TRẦN THỊ BÌNH');
  });

  test('4103 chọn gửi xem xét → MANUAL_REVIEW, submitFaceVideo bị chặn', async () => {
    await setDisplayName('Khánh Vy');
    ekyc.setScenario('KOLHUB-4103');
    await expect(ekyc.submitIdCard(h.kolId, cards)).rejects.toBeTruthy();
    expect((await ekyc.resolveNameMismatch(h.kolId, 'request-review')).status).toBe('MANUAL_REVIEW');
    ekyc.setScenario('SUCCESS');
    await expect(ekyc.submitFaceVideo(h.kolId, video)).rejects.toThrow('EKYC_STEP');
  });

  test('4104 → báo mạo danh → REPORTED', async () => {
    ekyc.setScenario('KOLHUB-4104');
    await expect(ekyc.submitIdCard(h.kolId, cards)).rejects.toMatchObject({ code: 'KOLHUB-4104' });
    expect((await ekyc.reportImpersonation(h.kolId)).status).toBe('REPORTED');
  });

  test('video trước khi qua bước CCCD → bị chặn', async () =>
    await expect(ekyc.submitFaceVideo(h.kolId, video)).rejects.toThrow('EKYC_STEP'));

  test('đã PASSED gọi lại bước CCCD → bị chặn', async () => {
    await ekyc.submitIdCard(h.kolId, cards);
    await ekyc.submitFaceVideo(h.kolId, video);
    await expect(ekyc.submitIdCard(h.kolId, cards)).rejects.toThrow('EKYC_STEP');
  });

  test('thoát giữa chừng (tải lại) sau OCR → vẫn OCR_PASSED, không tính lần thử', async () => {
    await ekyc.submitIdCard(h.kolId, cards);
    const again = createEkycService({ db: h.db, now: h.now, delay: false });
    expect(await again.getState(h.kolId)).toMatchObject({ status: 'OCR_PASSED', attemptsLeft: 5 });
  });

  test('kịch bản giữ nguyên qua nhiều lần gửi cho tới khi đổi', async () => {
    ekyc.setScenario('KOLHUB-4106');
    await ekyc.submitIdCard(h.kolId, cards);
    await expect(ekyc.submitFaceVideo(h.kolId, video)).rejects.toBeTruthy();
    expect(ekyc.getScenario()).toBe('KOLHUB-4106');
  });

  test('kịch bản của bước video không ảnh hưởng bước CCCD', async () => {
    ekyc.setScenario('KOLHUB-4105');
    await expect(ekyc.submitIdCard(h.kolId, cards)).resolves.toMatchObject({ status: 'OCR_PASSED' });
  });
});

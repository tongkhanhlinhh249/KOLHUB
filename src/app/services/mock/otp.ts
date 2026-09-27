import { KolhubError, type OtpChannel, type OtpPurpose } from '../types';
import type { Db, OtpRecord } from './db';
import { delay as fakeDelay } from './delay';
import { normalizeEmail, normalizePhone } from './normalize';

export interface OtpMessage {
  channel: OtpChannel;
  target: string;
  body: string;
  code: string;
}

export const OTP_TTL_MS = 5 * 60_000;
export const OTP_RESEND_MS = 60_000;
export const OTP_MAX_SENDS_PER_HOUR = 5;
export const OTP_MAX_FAILS = 5;
const HOUR_MS = 60 * 60_000;
/** Records older than this are dropped from the demo store. */
const RETENTION_MS = 2 * HOUR_MS;

/** SMS templates MẪU-01/02/03 (business spec section 8), verbatim. */
export function smsBody(purpose: OtpPurpose, code: string): string {
  switch (purpose) {
    case 'register':
      return `KOLHUB: Ma xac thuc dang ky tai khoan cua ban la ${code}. Hieu luc 5 phut. Khong chia se ma nay cho bat ky ai.`;
    case 'login':
      return `KOLHUB: Ma dang nhap cua ban la ${code}. Hieu luc 5 phut. Khong chia se ma nay cho bat ky ai.`;
    case 'reset':
      return `KOLHUB: Ma dat lai mat khau cua ban la ${code}. Hieu luc 5 phut. Neu ban khong yeu cau, vui long bo qua tin nhan nay.`;
  }
}

export function emailBody(code: string): string {
  return `Mã xác thực KOLHUB của bạn là ${code}. Hiệu lực 5 phút.`;
}

export function normalizeTarget(channel: OtpChannel, target: string): string {
  return channel === 'email' ? normalizeEmail(target) : normalizePhone(target);
}

function randomCode(): string {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
}

function newId(prefix: string, now: number): string {
  return `${prefix}-${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface OtpServiceDeps {
  db: Db;
  now: () => number;
  notify: (m: OtpMessage) => void;
  genCode?: () => string;
  /** Pass false in tests to skip the fake network latency. */
  delay?: false;
}

/** Mock OTP service implementing BR-04 / BR-49. */
export function createOtpService(deps: OtpServiceDeps) {
  const { db, now, notify } = deps;
  const genCode = deps.genCode ?? randomCode;
  const wait = () => (deps.delay === false ? Promise.resolve() : fakeDelay());

  async function send(input: {
    channel: OtpChannel;
    target: string;
    purpose: OtpPurpose;
  }): Promise<{ requestId: string; resendAvailableAt: number; expiresAt: number }> {
    await wait();
    const t = now();
    const { channel, purpose } = input;
    const target = normalizeTarget(channel, input.target);

    const sameDest = db
      .read()
      .otps.filter((o) => o.channel === channel && o.target === target)
      .sort((a, b) => a.sentAt - b.sentAt);

    // 60-second resend cooldown per (channel, target).
    const last = sameDest[sameDest.length - 1];
    if (last && t < last.sentAt + OTP_RESEND_MS) {
      throw new KolhubError('KOLHUB-4007', { retryAfterSec: Math.ceil((last.sentAt + OTP_RESEND_MS - t) / 1000) });
    }

    // At most 5 sends per rolling hour per (channel, target).
    const inHour = sameDest.filter((o) => o.sentAt > t - HOUR_MS);
    if (inHour.length >= OTP_MAX_SENDS_PER_HOUR) {
      const oldest = inHour[inHour.length - OTP_MAX_SENDS_PER_HOUR];
      throw new KolhubError('KOLHUB-4007', { retryAfterSec: Math.ceil((oldest.sentAt + HOUR_MS - t) / 1000) });
    }

    const record: OtpRecord = {
      id: newId('otp', t),
      channel,
      target,
      purpose,
      code: genCode(),
      expiresAt: t + OTP_TTL_MS,
      sentAt: t,
      failCount: 0,
      status: 'PENDING',
    };

    db.update((s) => {
      s.otps = s.otps.filter((o) => o.sentAt > t - RETENTION_MS);
      for (const o of s.otps) {
        // A new code invalidates the previous pending one for the same destination and purpose.
        if (o.channel === channel && o.target === target && o.purpose === purpose && o.status === 'PENDING') {
          o.status = 'SUPERSEDED';
        }
      }
      s.otps.push(record);
    });

    notify({
      channel,
      target,
      code: record.code,
      body: channel === 'sms' ? smsBody(purpose, record.code) : emailBody(record.code),
    });

    return { requestId: record.id, resendAvailableAt: t + OTP_RESEND_MS, expiresAt: record.expiresAt };
  }

  async function verify(input: { requestId: string; code: string }): Promise<void> {
    await wait();
    const t = now();
    const record = db.read().otps.find((o) => o.id === input.requestId);
    if (!record) throw new KolhubError('KOLHUB-4006');
    if (record.status === 'CANCELLED') throw new KolhubError('KOLHUB-4009');
    if (record.status !== 'PENDING' || t > record.expiresAt) throw new KolhubError('KOLHUB-4006');

    if (record.code !== input.code.trim()) {
      const failCount = record.failCount + 1;
      const cancelled = failCount >= OTP_MAX_FAILS;
      db.update((s) => {
        const o = s.otps.find((x) => x.id === record.id);
        if (o) {
          o.failCount = failCount;
          if (cancelled) o.status = 'CANCELLED';
        }
      });
      if (cancelled) throw new KolhubError('KOLHUB-4009');
      throw new KolhubError('KOLHUB-4005', { attemptsLeft: OTP_MAX_FAILS - failCount });
    }

    db.update((s) => {
      const o = s.otps.find((x) => x.id === record.id);
      if (o) o.status = 'VERIFIED';
    });
  }

  function isVerified(
    requestId: string,
    expect: { channel: OtpChannel; target: string; purpose: OtpPurpose },
  ): boolean {
    const o = db.read().otps.find((x) => x.id === requestId);
    return (
      !!o &&
      o.status === 'VERIFIED' &&
      o.channel === expect.channel &&
      o.purpose === expect.purpose &&
      o.target === normalizeTarget(expect.channel, expect.target)
    );
  }

  return { send, verify, isVerified };
}

export type OtpService = ReturnType<typeof createOtpService>;

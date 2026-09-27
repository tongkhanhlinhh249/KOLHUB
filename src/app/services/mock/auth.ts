import { InvalidInputError, KolhubError, type Account, type AccountType, type OtpChannel } from '../types';
import type { Db, DemoState, PendingRegistration, StoredAccount } from './db';
import { delay as fakeDelay } from './delay';
import { isValidEmail, isValidPhone, normalizeEmail, normalizePhone } from './normalize';
import type { OtpService } from './otp';
import { DEMO_ACCOUNT_ALIASES, DEMO_ACCOUNTS, type DemoAccountKey } from './identity';

/** Role-switcher keys accepted by quickLogin (the guest signs out instead), plus the older aliases. */
export type QuickLoginKey = Exclude<DemoAccountKey, 'guest'> | keyof typeof DEMO_ACCOUNT_ALIASES;

export type { PendingRegistration };

export type RegisterInput =
  | {
      type: 'KOL' | 'MCN';
      phone: string;
      email: string;
      password: string;
      confirmPassword: string;
      consent: boolean;
    }
  | {
      type: 'BIZ';
      fullName: string;
      company: string;
      email: string;
      password: string;
      confirmPassword: string;
      consent: boolean;
    };

export const MAX_LOGIN_FAILS = 5;
export const LOGIN_LOCK_MS = 15 * 60_000;
/** Unfinished registrations older than this are dropped. */
const REGISTRATION_TTL_MS = 24 * 60 * 60_000;

/** Free email domains blocked for Brand/Agency accounts (BR-45). */
export const FREE_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'yahoo.com.vn',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'live.com',
];

export function isFreeEmail(email: string): boolean {
  const domain = normalizeEmail(email).split('@')[1] ?? '';
  return FREE_EMAIL_DOMAINS.includes(domain);
}

/** BR-03: at least 8 characters, containing both letters and digits. */
export function isStrongPassword(p: string): boolean {
  return p.length >= 8 && /\p{L}/u.test(p) && /\d/.test(p);
}

function toAccount(s: StoredAccount): Account {
  const { password: _password, ...account } = s;
  return account;
}

function newId(prefix: string, now: number): string {
  return `${prefix}-${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function checkPasswords(password: string, confirmPassword: string) {
  if (!isStrongPassword(password)) throw new KolhubError('KOLHUB-4003', { field: 'password' });
  if (password !== confirmPassword) throw new KolhubError('KOLHUB-4004', { field: 'confirmPassword' });
}

function findByEmail(s: DemoState, email: string) {
  const e = normalizeEmail(email);
  return s.accounts.find((a) => a.email === e);
}

function findByPhone(s: DemoState, phone: string) {
  const p = normalizePhone(phone);
  return s.accounts.find((a) => a.phone !== undefined && a.phone === p);
}

export interface AuthServiceDeps {
  db: Db;
  now: () => number;
  otp: OtpService;
  /** Pass false in tests to skip the fake network latency. */
  delay?: false;
}

/** Mock account service: register, login, password reset (BR-02..10, BR-45). */
export function createAuthService(deps: AuthServiceDeps) {
  const { db, now, otp } = deps;
  const wait = () => (deps.delay === false ? Promise.resolve() : fakeDelay());

  function assertUnique(s: DemoState, email: string, phone?: string) {
    if (phone !== undefined && findByPhone(s, phone)) throw new KolhubError('KOLHUB-4001', { field: 'phone' });
    if (findByEmail(s, email)) throw new KolhubError('KOLHUB-4002', { field: 'email' });
  }

  function startSession(accountId: string) {
    db.update((s) => {
      s.sessionAccountId = accountId;
    });
  }

  async function startRegistration(input: RegisterInput): Promise<{ registrationId: string }> {
    await wait();
    const t = now();

    if (!input.consent) throw new InvalidInputError('consent', 'Vui lòng đồng ý với điều khoản sử dụng.');
    if (input.type !== 'BIZ' && !isValidPhone(input.phone))
      throw new InvalidInputError('phone', 'Số điện thoại không hợp lệ.');
    if (!isValidEmail(input.email)) throw new InvalidInputError('email', 'Email không hợp lệ.');

    const email = normalizeEmail(input.email);
    const phone = input.type === 'BIZ' ? undefined : normalizePhone(input.phone);

    // Only real accounts reserve an email/phone; unfinished registrations do not.
    assertUnique(db.read(), email, phone);
    if (input.type === 'BIZ' && isFreeEmail(email)) throw new KolhubError('KOLHUB-4015', { field: 'email' });
    checkPasswords(input.password, input.confirmPassword);

    const registration: PendingRegistration = {
      id: newId('reg', t),
      type: input.type,
      email,
      password: input.password,
      consentAt: new Date(t).toISOString(),
      createdAt: t,
      ...(phone !== undefined ? { phone } : {}),
      ...(input.type === 'BIZ' ? { fullName: input.fullName.trim(), company: input.company.trim() } : {}),
    };

    db.update((s) => {
      s.registrations = s.registrations.filter((r) => r.createdAt > t - REGISTRATION_TTL_MS);
      s.registrations.push(registration);
    });
    return { registrationId: registration.id };
  }

  async function completeRegistration(input: {
    registrationId: string;
    emailOtpRequestId: string;
    smsOtpRequestId?: string;
  }): Promise<Account> {
    await wait();
    const t = now();
    const state = db.read();
    const reg = state.registrations.find((r) => r.id === input.registrationId);
    if (!reg) throw new KolhubError('KOLHUB-4014');

    // BR-04a: KOL/MCN need both email and SMS OTP; BIZ needs email OTP.
    const emailOk = otp.isVerified(input.emailOtpRequestId, { channel: 'email', target: reg.email, purpose: 'register' });
    const smsOk =
      reg.type === 'BIZ' ||
      (!!input.smsOtpRequestId &&
        reg.phone !== undefined &&
        otp.isVerified(input.smsOtpRequestId, { channel: 'sms', target: reg.phone, purpose: 'register' }));
    if (!emailOk || !smsOk) throw new KolhubError('KOLHUB-4014');

    // Someone may have registered the same email/phone meanwhile.
    assertUnique(state, reg.email, reg.phone);

    const stored: StoredAccount = {
      id: newId('acc', t),
      type: reg.type,
      email: reg.email,
      password: reg.password,
      createdAt: new Date(t).toISOString(),
      ...(reg.phone !== undefined ? { phone: reg.phone } : {}),
      ...(reg.fullName !== undefined ? { fullName: reg.fullName } : {}),
      ...(reg.company !== undefined ? { company: reg.company } : {}),
    };

    db.update((s) => {
      s.accounts.push(stored);
      s.registrations = s.registrations.filter((r) => r.id !== reg.id);
      s.sessionAccountId = stored.id;
    });
    return toAccount(stored);
  }

  async function loginWithEmail(email: string, password: string): Promise<Account> {
    await wait();
    const t = now();
    const key = normalizeEmail(email);
    const state = db.read();

    const fails = state.loginFails[key];
    if (fails?.lockedUntil && fails.lockedUntil > t) {
      throw new KolhubError('KOLHUB-4013', { retryAfterSec: Math.ceil((fails.lockedUntil - t) / 1000) });
    }

    const account = findByEmail(state, key);
    if (!account) throw new KolhubError('KOLHUB-4012', { field: 'email' });

    if (account.password !== password) {
      const count = (fails && !fails.lockedUntil ? fails.count : 0) + 1;
      if (count >= MAX_LOGIN_FAILS) {
        db.update((s) => {
          s.loginFails[key] = { count: 0, lockedUntil: t + LOGIN_LOCK_MS };
        });
        throw new KolhubError('KOLHUB-4013', { retryAfterSec: LOGIN_LOCK_MS / 1000 });
      }
      db.update((s) => {
        s.loginFails[key] = { count };
      });
      throw new KolhubError('KOLHUB-4011', { attemptsLeft: MAX_LOGIN_FAILS - count, field: 'password' });
    }

    db.update((s) => {
      delete s.loginFails[key];
      s.sessionAccountId = account.id;
    });
    return toAccount(account);
  }

  function findPhoneLoginAccount(phone: string): StoredAccount {
    const account = findByPhone(db.read(), phone);
    if (!account || account.type === 'BIZ') throw new KolhubError('KOLHUB-4012', { field: 'phone' });
    return account;
  }

  async function checkPhoneLogin(phone: string): Promise<void> {
    await wait();
    findPhoneLoginAccount(phone);
  }

  async function loginWithPhone(phone: string, otpRequestId: string): Promise<Account> {
    await wait();
    const account = findPhoneLoginAccount(phone);
    if (!otp.isVerified(otpRequestId, { channel: 'sms', target: phone, purpose: 'login' })) {
      throw new KolhubError('KOLHUB-4014');
    }
    startSession(account.id);
    return toAccount(account);
  }

  async function resetPassword(input: {
    channel: OtpChannel;
    target: string;
    otpRequestId: string;
    password: string;
    confirmPassword: string;
  }): Promise<void> {
    await wait();
    checkPasswords(input.password, input.confirmPassword);
    if (!otp.isVerified(input.otpRequestId, { channel: input.channel, target: input.target, purpose: 'reset' })) {
      throw new KolhubError('KOLHUB-4014');
    }
    const state = db.read();
    const account = input.channel === 'email' ? findByEmail(state, input.target) : findByPhone(state, input.target);
    if (!account) throw new KolhubError('KOLHUB-4012');

    db.update((s) => {
      const a = s.accounts.find((x) => x.id === account.id);
      if (a) a.password = input.password;
      delete s.loginFails[account.email];
      // BR-10: resetting the password signs out existing sessions of this account.
      if (s.sessionAccountId === account.id) s.sessionAccountId = null;
    });
  }

  /**
   * Demo sign-in without password: by account type (first seed account of that type) or by a
   * DEMO_ACCOUNTS key ('kol-verified' = khanhvy@demo.kolhub.vn; aliases 'mcn' → 'mcn-new',
   * 'biz' → 'biz-verified'). The guest has no account: use logout().
   */
  async function quickLogin(target: AccountType | QuickLoginKey): Promise<Account> {
    await wait();
    const state = db.read();
    const key: string = (DEMO_ACCOUNT_ALIASES as Record<string, DemoAccountKey>)[target] ?? target;
    const email = DEMO_ACCOUNTS.find((d) => d.key === key)?.email;
    const byKey = DEMO_ACCOUNTS.some((d) => d.key === key);
    const account = byKey
      ? email
        ? findByEmail(state, email)
        : undefined
      : state.accounts.find((a) => a.type === target);
    if (!account) throw new KolhubError('KOLHUB-4012');
    startSession(account.id);
    return toAccount(account);
  }

  async function logout(): Promise<void> {
    await wait();
    db.update((s) => {
      s.sessionAccountId = null;
    });
  }

  function currentAccount(): Account | null {
    const s = db.read();
    const a = s.sessionAccountId ? s.accounts.find((x) => x.id === s.sessionAccountId) : undefined;
    return a ? toAccount(a) : null;
  }

  return {
    startRegistration,
    completeRegistration,
    loginWithEmail,
    loginWithPhone,
    checkPhoneLogin,
    resetPassword,
    quickLogin,
    logout,
    currentAccount,
  };
}

export type AuthService = ReturnType<typeof createAuthService>;

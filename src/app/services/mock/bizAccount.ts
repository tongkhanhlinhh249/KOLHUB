import { KolhubError, type Account } from '../types';
import type { Db, DemoState, StoredAccount } from './db';
import { delay as fakeDelay } from './delay';
import { currentBizAccount } from './bizSession';
import { isFreeEmail } from './auth';
import { isValidEmail, normalizeEmail } from './normalize';
import type { OtpService } from './otp';

export const BIZ_TEXT_MAX = 200;

export interface BizAccountServiceDeps {
  db: Db;
  now: () => number;
  otp: OtpService;
  /** Pass false in tests to skip the fake network latency. */
  delay?: false;
}

function toAccount(s: StoredAccount): Account {
  const { password: _password, ...account } = s;
  return account;
}

/** Brand/Agency account settings: profile and company email change (UC-06, BR-45, BR-63). */
export function createBizAccountService(deps: BizAccountServiceDeps) {
  const { db, otp } = deps;
  const wait = () => (deps.delay === false ? Promise.resolve() : fakeDelay());

  function checkText(value: string, field: 'fullName' | 'company'): string {
    const v = (value ?? '').trim().replace(/\s+/g, ' ');
    if (!v || [...v].length > BIZ_TEXT_MAX) throw new KolhubError('KOLHUB-4018', { field });
    return v;
  }

  /** Format → same as current → free domain → used by another account. */
  function checkNewEmail(state: DemoState, raw: string): string {
    const acc = currentBizAccount(state);
    if (!isValidEmail(raw)) throw new KolhubError('KOLHUB-4018', { field: 'email' });
    const email = normalizeEmail(raw);
    if (email === acc.email) throw new KolhubError('KOLHUB-4017', { field: 'email' });
    if (isFreeEmail(email)) throw new KolhubError('KOLHUB-4015', { field: 'email' });
    if (state.accounts.some((a) => a.id !== acc.id && a.email === email)) {
      throw new KolhubError('KOLHUB-4002', { field: 'email' });
    }
    return email;
  }

  async function updateBizProfile(input: { fullName: string; company: string }): Promise<Account> {
    await wait();
    const acc = currentBizAccount(db.read());
    const fullName = checkText(input.fullName, 'fullName');
    const company = checkText(input.company, 'company');
    let out!: StoredAccount;
    db.update((s) => {
      const a = s.accounts.find((x) => x.id === acc.id)!;
      a.fullName = fullName;
      a.company = company;
      out = a;
    });
    return toAccount(out);
  }

  /** Validates the new email only; the OTP is sent by the OTP step, nothing is changed yet (BR-63). */
  async function startCompanyEmailChange(newEmail: string): Promise<{ email: string }> {
    await wait();
    return { email: checkNewEmail(db.read(), newEmail) };
  }

  async function confirmCompanyEmailChange(input: { newEmail: string; otpRequestId: string }): Promise<Account> {
    await wait();
    const state = db.read();
    const acc = currentBizAccount(state);
    const email = checkNewEmail(state, input.newEmail);
    if (!otp.isVerified(input.otpRequestId, { channel: 'email', target: email, purpose: 'change-email' })) {
      throw new KolhubError('KOLHUB-4014');
    }
    let out!: StoredAccount;
    db.update((s) => {
      const a = s.accounts.find((x) => x.id === acc.id)!;
      const oldEmail = a.email;
      a.email = email;
      delete s.loginFails[oldEmail];
      out = a;
    });
    return toAccount(out);
  }

  return { updateBizProfile, startCompanyEmailChange, confirmCompanyEmailChange };
}

export type BizAccountService = ReturnType<typeof createBizAccountService>;

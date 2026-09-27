import { errorMessage } from './errors';

export type RoleKey = 'kolhub.guest' | 'kolhub.user.kol' | 'kolhub.user.mcn' | 'kolhub.user.biz';

export type AccountType = 'KOL' | 'MCN' | 'BIZ';

export interface Account {
  id: string;
  type: AccountType;
  email: string;
  phone?: string;
  fullName?: string;
  company?: string;
  createdAt: string;
}

export type OtpChannel = 'email' | 'sms';
export type OtpPurpose = 'register' | 'login' | 'reset'
  // --- phase 3 ---
  | 'change-email';

export type ErrorCode =
  | 'KOLHUB-4001'
  | 'KOLHUB-4002'
  | 'KOLHUB-4003'
  | 'KOLHUB-4004'
  | 'KOLHUB-4005'
  | 'KOLHUB-4006'
  | 'KOLHUB-4007'
  | 'KOLHUB-4008'
  | 'KOLHUB-4009'
  | 'KOLHUB-4011'
  | 'KOLHUB-4012'
  | 'KOLHUB-4013'
  | 'KOLHUB-4014'
  | 'KOLHUB-4015'
  // --- phase 3 ---
  | 'KOLHUB-4016'
  | 'KOLHUB-4017'
  | 'KOLHUB-4018'
  | 'KOLHUB-4401'
  | 'KOLHUB-4402'
  | 'KOLHUB-4403'
  | 'KOLHUB-4404'
  | 'KOLHUB-4405'
  // --- phase 2 ---
  | 'KOLHUB-4101'
  | 'KOLHUB-4102'
  | 'KOLHUB-4103'
  | 'KOLHUB-4104'
  | 'KOLHUB-4105'
  | 'KOLHUB-4106'
  | 'KOLHUB-4107'
  | 'KOLHUB-4108'
  | 'KOLHUB-5101'
  | 'KOLHUB-4201'
  | 'KOLHUB-4202'
  | 'KOLHUB-4203'
  | 'KOLHUB-4301'
  | 'KOLHUB-4302'
  | 'KOLHUB-4303'
  | 'KOLHUB-4304';

export interface KolhubErrorMeta {
  attemptsLeft?: number;
  retryAfterSec?: number;
  field?: string;
  // --- phase 2 ---
  lockedUntil?: number;
  ownedByOther?: boolean;
}

/** Business error carrying a KOLHUB-xxxx code; message is the Vietnamese text from errorMessage(). */
export class KolhubError extends Error {
  code: ErrorCode;
  meta?: KolhubErrorMeta;

  constructor(code: ErrorCode, meta?: KolhubErrorMeta) {
    super(errorMessage(code, meta));
    this.name = 'KolhubError';
    this.code = code;
    this.meta = meta;
  }
}

export type InvalidInputField = 'email' | 'phone' | 'consent';

/**
 * Input-format error that has no KOLHUB code in the business spec (bad email/phone
 * format, terms not accepted). The UI normally catches these client-side; `message`
 * is Vietnamese and `field` names the form field to show it under.
 */
export class InvalidInputError extends Error {
  field: InvalidInputField;

  constructor(field: InvalidInputField, message: string) {
    super(message);
    this.name = 'InvalidInputError';
    this.field = field;
  }
}

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
  | 'KOLHUB-4406'
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
  // --- Xác thực kênh qua KOL Safety ---
  | 'KOLHUB-4210'
  | 'KOLHUB-4211'
  | 'KOLHUB-4301'
  | 'KOLHUB-4302'
  | 'KOLHUB-4303'
  | 'KOLHUB-4304'
  // --- KOL Safety ---
  | 'KOLHUB-4501'
  | 'KOLHUB-4502'
  | 'KOLHUB-4503'
  | 'KOLHUB-4504'
  | 'KOLHUB-4505'
  | 'KOLHUB-4506'
  | 'KOLHUB-4507'
  | 'KOLHUB-4508'
  | 'KOLHUB-4509'
  | 'KOLHUB-4510'
  | 'KOLHUB-4511'
  | 'KOLHUB-4512'
  | 'KOLHUB-4513'
  | 'KOLHUB-4514'
  | 'KOLHUB-4515'
  // --- violations ---
  | 'KOLHUB-4601'
  | 'KOLHUB-4602'
  | 'KOLHUB-4603'
  | 'KOLHUB-4604'
  | 'KOLHUB-4605'
  | 'KOLHUB-4606'
  | 'KOLHUB-4607'
  | 'KOLHUB-4608'
  | 'KOLHUB-4609'
  | 'KOLHUB-4610'
  | 'KOLHUB-4611'
  | 'KOLHUB-4612'
  // --- MCN ↔ KOL ---
  | 'KOLHUB-4701'
  | 'KOLHUB-4702'
  | 'KOLHUB-4703'
  | 'KOLHUB-4704'
  // --- campaign booking (beta) ---
  | 'KOLHUB-4801'
  | 'KOLHUB-4802'
  | 'KOLHUB-4803'
  | 'KOLHUB-4804'
  | 'KOLHUB-4805'
  | 'KOLHUB-4806'
  | 'KOLHUB-4807'
  | 'KOLHUB-4808'
  | 'KOLHUB-4809'
  | 'KOLHUB-4810'
  | 'KOLHUB-4811'
  | 'KOLHUB-4812'
  | 'KOLHUB-4813'
  | 'KOLHUB-4814'
  | 'KOLHUB-4815'
  | 'KOLHUB-4816'
  | 'KOLHUB-4817'
  | 'KOLHUB-4818'
  | 'KOLHUB-4819'
  | 'KOLHUB-4820'
  // --- EP-02: vòng đời chiến dịch ---
  | 'KOLHUB-4823'
  | 'KOLHUB-4824'
  | 'KOLHUB-4825'
  | 'KOLHUB-4826'
  | 'KOLHUB-4827'
  | 'KOLHUB-4828';

export interface KolhubErrorMeta {
  attemptsLeft?: number;
  retryAfterSec?: number;
  field?: string;
  // --- phase 2 ---
  lockedUntil?: number;
  ownedByOther?: boolean;
  // --- KOL Safety ---
  /** Display name of a platform, e.g. "TikTok" (KOLHUB-4505/4506). */
  platformLabel?: string;
  // --- open recruitment ---
  /** KOLHUB-4818: slots of the campaign and how many are still free. */
  slots?: number;
  remaining?: number;
  // --- xác thực kênh qua KOL Safety ---
  /** KOLHUB-4210: N nội dung cần có / số nội dung kênh đang có. */
  required?: number;
  have?: number;
  // --- Sàn chiến dịch ---
  /** KOLHUB-4808: why the campaign takes no new applications. */
  reason?: 'PAUSED' | 'CLOSED' | 'HIDDEN';
  /** KOLHUB-4827: the viewer's booking on the unavailable campaign (its own work area). */
  bookingId?: string;
  /** KOLHUB-4827: the viewer owns the campaign. */
  mine?: boolean;
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

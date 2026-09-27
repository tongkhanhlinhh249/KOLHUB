// Single import point for screens. Do not import services/mock/* from UI code.
import { db } from './mock/db';
import { createOtpService } from './mock/otp';
import { createAuthService } from './mock/auth';
import { otpInbox } from './otpInbox';

export const otpService = createOtpService({ db, now: Date.now, notify: otpInbox.publish });
export const authService = createAuthService({ db, now: Date.now, otp: otpService });

export { db, otpInbox };
export { errorMessage } from './errors';
export * from './types';
export type { Db, DemoState } from './mock/db';
export type { OtpMessage, OtpService } from './mock/otp';
export type { AuthService, RegisterInput } from './mock/auth';
export { DEMO_PASSWORD } from './mock/seed';
// Pure validators, re-exported so forms can check input client-side before calling services.
export { isValidEmail, isValidPhone, normalizeEmail, normalizePhone } from './mock/normalize';
export { isFreeEmail, isStrongPassword } from './mock/auth';

// --- phase 3 ---
import { createSearchService } from './mock/search';

export const searchService = createSearchService({ db, now: Date.now });
export * from './bizTypes';
export type { SearchService } from './mock/search';

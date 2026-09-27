// Single import point for screens. Do not import services/mock/* from UI code.
import { db as baseDb } from './mock/db';
import { createOtpService } from './mock/otp';
import { createAuthService } from './mock/auth';
import { otpInbox } from './otpInbox';
// --- phase 2 ---
import { observeDb } from './mock/observeDb';
import { noticeInbox } from './noticeInbox';
import { createProfileService } from './mock/profile';
import { createEkycService } from './mock/ekyc';
import { createChannelService } from './mock/channel';
import { createReviewService } from './mock/review';
import { createFunnelService } from './mock/funnel';

/** Every service shares this observable db so live screens reload after any change. */
const db = observeDb(baseDb);

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
import { createSavedListService } from './mock/savedLists';
import { createBizAccountService } from './mock/bizAccount';

export const searchService = createSearchService({ db, now: Date.now });
export const savedListService = createSavedListService({ db, now: Date.now });
export const bizAccountService = createBizAccountService({ db, now: Date.now, otp: otpService });
export * from './bizTypes';
export type { SearchService } from './mock/search';
export type { SavedListService } from './mock/savedLists';
export type { BizAccountService } from './mock/bizAccount';
export { LIST_NAME_MAX, NOTE_MAX, normalizeListName } from './mock/savedLists';
// --- phase 2 ---
export const profileService = createProfileService({ db, now: Date.now });
export const ekycService = createEkycService({ db, now: Date.now });
export const channelService = createChannelService({ db, now: Date.now });
export const reviewService = createReviewService({ db, now: Date.now, notify: noticeInbox.publish });
export const funnelService = createFunnelService({ db, now: Date.now });
export const subscribeData = db.subscribe;
export { noticeInbox };
export * from './profile-types';
export type { LiveDb } from './mock/observeDb';
export type { ProfileView, ProfileService } from './mock/profile';
export type { EkycView, IdentityView, EkycService } from './mock/ekyc';
export type { ChannelService, ChannelInput } from './mock/channel';
export type { AdminQueue, ChannelVerdict, ReviewService } from './mock/review';
export type { FunnelRow, FunnelService } from './mock/funnel';
export type { ChannelFilter } from './mock/channelRules';
export type { Completeness, Milestone, ChecklistItem, TimelineStep } from './mock/profileRules';
export { detectPlatform, validateProofImage, validateGcnFile, countByFilter, matchesFilter } from './mock/channelRules';
export { buildTimeline, PLEDGES_LABEL, REVIEW_SLA_NOTE } from './mock/profileRules';
export { listApprovedKols } from './mock/review';
export { FUNNEL_STEPS, formatDuration } from './mock/funnel';
export { COUNTED_CODES, MAX_EKYC_ATTEMPTS } from './mock/ekyc';

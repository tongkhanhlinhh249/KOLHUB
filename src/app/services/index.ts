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
export type { AuthService, RegisterInput, QuickLoginKey } from './mock/auth';
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
export {
  buildTimeline,
  canManageKolAssignments,
  CHANNEL_REQUIREMENT_LABEL,
  KOLS_REQUIREMENT_LABEL,
  missingContactFields,
  missingOrgFields,
  PLEDGES_LABEL,
  profileRecommendations,
  REVIEW_SLA_NOTE,
} from './mock/profileRules';
export { FUNNEL_STEPS, formatDuration } from './mock/funnel';
// --- unified KOL data (seed v2) ---
export { toPublicKol, publicKolOf, normalizeText, normalizeUrl, channelBadge } from './mock/directory';
export type { PublicKol } from './mock/directory';
export { channelContent, channelTotals, syncChannelStats } from './mock/socialListening';
export { identityOf, profileDisplayName, DEMO_ACCOUNTS, ROLE_LABELS } from './mock/identity';
export type { DisplayIdentity, DemoAccount, DemoAccountKey } from './mock/identity';
export { VERIFIED_KOL_EMAIL, VERIFIED_MCN_EMAIL } from './mock/seed';
export { COUNTED_CODES, MAX_EKYC_ATTEMPTS } from './mock/ekyc';
// --- KOL Safety ---
import { createSafetyService } from './mock/safety';

export const safetyService = createSafetyService({ db, now: Date.now });
export * from './safety-types';
export type { SafetyService } from './mock/safety';
export {
  healthLabel,
  isMonitorPlatform,
  issueSummary,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_SEC,
  MONITOR_PLATFORM_LABEL,
  MONITOR_PLATFORMS,
  validateVideo,
  VIDEO_EXTENSIONS,
} from './mock/safety';
// --- violations ---
import { createViolationService } from './mock/violations';

export const violationService = createViolationService({ db, now: Date.now });
export * from './violation-types';
export type { ViolationService } from './mock/violations';
export { countByStatus as countViolationsByStatus } from './mock/violations';
// --- channel directory (Brand) ---
import { createChannelDirectoryService } from './mock/channelDirectory';

export const channelDirectoryService = createChannelDirectoryService({ db, now: Date.now });
export * from './channel-directory-types';
export type { ChannelDirectoryService } from './mock/channelDirectory';
// --- MCN ↔ KOL ---
import { createMcnKolService } from './mock/mcnKol';

export const mcnKolService = createMcnKolService({ db, now: Date.now });
export * from './mcn-kol-types';
export type { McnKolService } from './mock/mcnKol';
// --- demo shortcuts (Demo Panel only) ---
import { createDemoService } from './mock/demo';

export const demoService = createDemoService({ db, now: Date.now });
export type { DemoService } from './mock/demo';
// --- campaign booking (beta) ---
import { createCampaignService } from './mock/campaign';
import { createBookingService } from './mock/booking';
import { createPlanService } from './mock/plans';

export const campaignService = createCampaignService({ db, now: Date.now });
export const bookingService = createBookingService({ db, now: Date.now });
export const planService = createPlanService({ db });
export * from './campaign-types';
export type { CampaignService } from './mock/campaign';
export type { BookingService } from './mock/booking';
export type { PlanService } from './mock/plans';
export { postMatchesPlatform, platformOfLink, isAcceptingApplications, isListedOnMarketplace } from './mock/campaignRules';
// "Tuyển nhiều KOL": pure helpers (phase, reward value, workflow) for the screens.
export { campaignType, daysTo, draftReviewOn, phaseOfTimeline, rewardValue, shiftIso } from './mock/recruitment';
export { SEED_BOOKING, SEED_CAMPAIGN, SEED_RECRUIT_BOOKING } from './mock/campaignSeed';
// --- demo: campaign simulator (Demo Panel only) ---
import { createDemoCampaignService } from './mock/demoCampaign';

export const demoCampaignService = createDemoCampaignService({ db, now: Date.now });
export type { DemoCampaignService, DemoActor, DemoStep, DemoStepKey, DemoSteps, DemoCampaignOption, DemoBookingRow } from './mock/demoCampaign';
// --- "Bài đã đăng" (portfolio) ---
import { createPortfolioService } from './mock/portfolio';

export const portfolioService = createPortfolioService({ db, now: Date.now });
export * from './portfolio-types';
export type { PortfolioService } from './mock/portfolio';
export { SEED_HISTORY } from './mock/campaignSeed';
// --- "Tin nhắn", "Thông báo", "Câu hỏi của tôi" ---
import { createInboxService } from './mock/inbox';

export const inboxService = createInboxService({ db, now: Date.now });
export * from './inbox-types';
export type { InboxService, InboxCounts } from './mock/inbox';
export { checkMessage } from './mock/inbox';
// --- KOL Safety – Tổng hợp kênh (30 nội dung đã quét) ---
import { createKolSafetyReportService } from './mock/kolSafetyReport';

export const kolSafetyReportService = createKolSafetyReportService({ db, now: Date.now });
export * from './kol-safety-report-types';
export type { KolSafetyReportService } from './mock/kolSafetyReport';
export {
  CATEGORY_LABEL,
  CONTENT_CATEGORIES,
  filterContents,
  formatTimestamp,
  REPORT_SIZE,
  REPORT_VERDICT_LABEL,
  reportCsv,
  SEVERITY_LABEL,
  summarizeReport,
} from './mock/kolSafetyReport';

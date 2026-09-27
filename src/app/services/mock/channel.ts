import { KolhubError } from '../types';
import type { Channel, StoredFile } from '../profile-types';
import type { Db, DemoState } from './db';
import { delay as fakeDelay } from './delay';
import { channelHandle, detectPlatform, normalizeChannelUrl, validateProofImage } from './channelRules';
import { trackFunnel } from './funnel';
import { ensureProfile, newId } from './profile';
import { findProfile, sweepExpired } from './profileRules';

export interface ChannelInput {
  url: string;
  proofImage: StoredFile;
}

export interface ChannelServiceDeps {
  db: Db;
  now: () => number;
  delay?: false;
}

function assertUniqueUrl(state: DemoState, accountId: string, url: string, exceptId?: string) {
  const key = normalizeChannelUrl(url);
  const dup = state.channels.find((c) => c.id !== exceptId && normalizeChannelUrl(c.url) === key);
  if (dup) throw new KolhubError('KOLHUB-4201', { field: 'url', ...(dup.ownerId !== accountId ? { ownedByOther: true } : {}) });
}

function validateInput(input: ChannelInput) {
  const platform = detectPlatform(input.url);
  if (!platform) throw new KolhubError('KOLHUB-4202', { field: 'url' });
  validateProofImage(input.proofImage);
  return platform;
}

const sameFile = (a: StoredFile, b: StoredFile) => a.name === b.name && a.size === b.size && a.type === b.type;

/** Mock channel service (BR-20..24). There is deliberately no remove (BR-23). */
export function createChannelService(deps: ChannelServiceDeps) {
  const { db, now } = deps;
  const wait = () => (deps.delay === false ? Promise.resolve() : fakeDelay());

  function owned(state: DemoState, accountId: string, channelId: string): Channel {
    const c = state.channels.find((x) => x.id === channelId);
    if (!c) throw new Error('CHANNEL_NOT_FOUND');
    if (c.ownerId !== accountId) throw new Error('NOT_OWNER');
    return c;
  }

  async function list(accountId: string): Promise<Channel[]> {
    await wait();
    const t = now();
    if (db.read().channels.some((c) => c.status === 'VERIFIED' && c.badgeExpiresAt !== undefined && c.badgeExpiresAt <= t)) {
      db.update((s) => sweepExpired(s, t));
    }
    return db
      .read()
      .channels.filter((c) => c.ownerId === accountId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async function add(accountId: string, input: ChannelInput): Promise<Channel> {
    await wait();
    const t = now();
    const platform = validateInput(input);
    const id = newId('ch', t);
    db.update((s) => {
      const p = ensureProfile(s, accountId, t);
      assertUniqueUrl(s, accountId, input.url);
      const first = !s.channels.some((c) => c.ownerId === accountId);
      s.channels.push({
        id,
        ownerType: p.ownerType,
        ownerId: accountId,
        platform,
        url: input.url.trim(),
        handle: channelHandle(input.url),
        proofImage: input.proofImage,
        status: 'PENDING_REVIEW',
        active: true,
        createdAt: t,
        updatedAt: t,
      });
      if (first) {
        const email = s.accounts.find((a) => a.id === accountId)?.email ?? '';
        trackFunnel(s, email, 'channel_added', t);
      }
    });
    return db.read().channels.find((c) => c.id === id)!;
  }

  async function update(accountId: string, channelId: string, input: ChannelInput): Promise<Channel> {
    await wait();
    const t = now();
    db.update((s) => {
      const c = owned(s, accountId, channelId);
      const changed = normalizeChannelUrl(input.url) !== normalizeChannelUrl(c.url) || !sameFile(input.proofImage, c.proofImage);
      if (!changed) return;
      const platform = validateInput(input);
      if (findProfile(s, accountId)?.status === 'SUBMITTED' && c.status === 'PENDING_REVIEW') throw new Error('LOCKED_IN_REVIEW');
      assertUniqueUrl(s, accountId, input.url, c.id);
      if (c.status === 'VERIFIED') {
        c.badgeSuspended = true;
        c.badgeExpiresAt = undefined;
        c.verifiedAt = undefined;
      }
      c.platform = platform;
      c.url = input.url.trim();
      c.handle = channelHandle(input.url);
      c.proofImage = input.proofImage;
      c.status = 'PENDING_REVIEW';
      c.note = undefined;
      c.updatedAt = t;
    });
    return owned(db.read(), accountId, channelId);
  }

  async function setActive(accountId: string, channelId: string, active: boolean): Promise<Channel> {
    await wait();
    const t = now();
    db.update((s) => {
      const c = owned(s, accountId, channelId);
      c.active = active;
      c.updatedAt = t;
    });
    return owned(db.read(), accountId, channelId);
  }

  return { list, add, update, setActive };
}

export type ChannelService = ReturnType<typeof createChannelService>;

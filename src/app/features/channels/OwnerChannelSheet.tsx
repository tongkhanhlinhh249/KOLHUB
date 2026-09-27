import type { ReactNode } from 'react';
import { channelBadge, channelTotals, PROFILE_VIDEO_LIMIT, type Channel } from '../../services';
import { ChannelStatusBadge } from '../shared/StatusBadges';
import { ChannelDetailSheet } from './ChannelDetailSheet';
import { ActiveSwitch, channelName, EditChannelButton, NeedsFixCallout } from './ChannelParts';

/**
 * Owner "Chi tiết kênh" (KOL/MCN): the shared ChannelDetailSheet built from the owner's own channel,
 * with the review status, the "Cần bổ sung" note and the owner actions (Hoạt động, Sửa).
 */
export function OwnerChannelSheet({
  channelId,
  channels,
  loading,
  accountId,
  now,
  isLocked,
  onClose,
  onEdit,
  renderExtra,
}: {
  channelId: string | null;
  /** The owner's channels (undefined while loading). */
  channels: Channel[] | undefined;
  loading: boolean;
  accountId: string;
  now: number;
  isLocked(c: Channel): boolean;
  onClose(): void;
  onEdit(c: Channel): void;
  /** Extra section under the videos (MCN: "Chủ sở hữu" with assign / unassign). */
  renderExtra?(c: Channel): ReactNode;
}) {
  const channel = channelId ? channels?.find((c) => c.id === channelId) : undefined;
  const followers = channel?.stats?.followers;
  const totals = channel && followers !== undefined ? channelTotals(channel.url, followers) : undefined;
  const missing = channelId !== null && !!channels && !channel;

  return (
    <ChannelDetailSheet
      open={channelId !== null}
      onOpenChange={(open) => !open && onClose()}
      loading={loading && !channels}
      error={missing ? 'Không tìm thấy kênh.' : null}
      data={
        channel
          ? {
              platform: channel.platform,
              handle: channel.handle,
              url: channel.url,
              verifiedUntil: channelBadge(channel, now) === 'VERIFIED' ? channel.badgeExpiresAt : undefined,
              followers,
              views: totals?.views,
              videoCount: totals?.videoCount,
              videos: (channel.stats?.latestVideos ?? []).slice(0, PROFILE_VIDEO_LIMIT),
              ownerName: channelName(channel.handle, channel.url),
            }
          : null
      }
      status={channel && <ChannelStatusBadge channel={channel} now={now} />}
      notice={channel && <NeedsFixCallout channel={channel} />}
      children={channel && renderExtra?.(channel)}
      actions={
        channel && (
          <>
            <ActiveSwitch channel={channel} accountId={accountId} className="sm:mr-auto" />
            <EditChannelButton channel={channel} locked={isLocked(channel)} onEdit={() => onEdit(channel)} className="w-full sm:w-auto" />
          </>
        )
      }
    />
  );
}

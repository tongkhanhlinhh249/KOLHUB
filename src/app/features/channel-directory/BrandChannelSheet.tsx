import { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck, Flag } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { channelDirectoryService, KolhubError, type ChannelDirectoryDetail } from '../../services';
import { ChannelDetailSheet, ChannelOwnerSection } from '../channels/ChannelDetailSheet';

const errText = (e: unknown) => (e instanceof Error && e.message ? e.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.');

/**
 * Brand "Chi tiết kênh" (read-only): loads the channel through the public projection and shows the
 * shared ChannelDetailSheet with "Chủ kênh" and the Brand actions (save the KOL, report).
 */
export function BrandChannelSheet({
  channelId,
  onClose,
  saved,
  onOpenKol,
  onSave,
  onReport,
}: {
  channelId: string | null;
  onClose(): void;
  /** Whether the owner KOL is in any saved list. */
  saved(kolId: string): boolean;
  onOpenKol(kolId: string): void;
  onSave(kolId: string, name: string): void;
  onReport(channel: ChannelDirectoryDetail): void;
}) {
  const [detail, setDetail] = useState<ChannelDirectoryDetail | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!channelId) return;
    let alive = true;
    setLoading(true);
    setError(null);
    setDetail(null);
    channelDirectoryService
      .getChannel(channelId)
      .then((d) => alive && setDetail(d))
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [channelId, attempt]);

  const notFound = error instanceof KolhubError && error.code === 'KOLHUB-4406';
  const isSaved = detail ? saved(detail.kolId) : false;

  return (
    <ChannelDetailSheet
      open={channelId !== null}
      onOpenChange={(open) => !open && onClose()}
      loading={loading}
      error={error ? errText(error) : null}
      onRetry={notFound ? undefined : () => setAttempt((n) => n + 1)}
      data={
        detail && {
          platform: detail.platform,
          handle: detail.handle,
          url: detail.url,
          verifiedUntil: detail.badgeExpiresAt,
          followers: detail.followers,
          views: detail.views,
          videoCount: detail.videoCount,
          videos: detail.latestVideos,
          ownerName: detail.displayName,
        }
      }
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            className="h-11 text-destructive hover:text-destructive md:h-9"
            disabled={!detail}
            onClick={() => detail && onReport(detail)}
          >
            <Flag aria-hidden />
            Báo cáo vi phạm
          </Button>
          <Button type="button" className="h-11 md:h-9" disabled={!detail} onClick={() => detail && onSave(detail.kolId, detail.displayName)}>
            {isSaved ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />}
            {isSaved ? 'Đã lưu · Sửa danh sách' : 'Lưu KOL vào danh sách'}
          </Button>
        </>
      }
    >
      {detail && (
        <ChannelOwnerSection
          displayName={detail.displayName}
          kolId={detail.kolId}
          avatar={detail.avatar}
          fields={detail.fields}
          region={detail.region}
          onOpenKol={() => onOpenKol(detail.kolId)}
        />
      )}
    </ChannelDetailSheet>
  );
}

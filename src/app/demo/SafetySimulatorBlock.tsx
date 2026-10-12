import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  canRenew,
  channelService,
  daysLeft,
  SAFETY_REQUIRED,
  safetyProgress,
  safetyVerificationService,
  type Channel,
} from '../services';
import { channelName } from '../features/channels/ChannelParts';
import { PLATFORM_LABEL } from '../features/shared/StatusBadges';
import { useLiveQuery } from '../features/shared/useLiveQuery';
import { DemoPanelSection } from './DemoPanelSection';

type Verdict = 'AUTO' | 'PASS' | 'FAIL' | 'ERROR';
const VERDICTS: { key: Verdict; label: string }[] = [
  { key: 'AUTO', label: 'Tự động (vài nội dung không đạt lần đầu)' },
  { key: 'PASS', label: 'Đạt' },
  { key: 'FAIL', label: 'Không đạt' },
  { key: 'ERROR', label: 'Chưa kiểm tra được (lỗi / không truy cập được)' },
];

function stateText(c: Channel, now: number): string {
  if (c.status === 'SAFETY_PENDING') {
    const p = safetyProgress(c, now);
    return p.phase === 'IN_PROGRESS' ? `Chờ KOL Safety · ${p.passed}/${p.required}` : 'Chờ KOL Safety · chưa quét';
  }
  if (c.status === 'PENDING_REVIEW') return 'Chờ Admin duyệt';
  if (c.status === 'NEEDS_FIX') return 'Cần bổ sung';
  if (c.status === 'SUSPENDED') return 'Tạm ngừng';
  const left = daysLeft(c, now);
  return left === undefined ? 'Hết hạn dấu' : `Đã xác thực · còn ${left} ngày`;
}

/**
 * Demo Panel › KOL/MCN: xác thực kênh qua KOL Safety. Việc quét diễn ra trên KOL Safety (hệ thống ngoài) nên kết
 * quả được giả lập ở đây: KOL Safety quét một lượt (theo "Kết quả lần quét tới"), quét đủ ngay, kênh chưa đủ nội
 * dung, đẩy hạn dấu tới còn 7 ngày / hết hạn, đưa về chưa xác thực.
 */
export function SafetySimulatorBlock() {
  const { account } = useAuth();
  const ownerId = account?.id;
  const q = useLiveQuery(() => (ownerId ? channelService.list(ownerId) : Promise.resolve([] as Channel[])), [ownerId]);
  const channels = q.data ?? [];
  const [channelId, setChannelId] = useState<string | undefined>();
  const [verdict, setVerdict] = useState<Verdict>(() => safetyVerificationService.demoNextVerdict());
  const [busy, setBusy] = useState(false);

  const now = Date.now();
  // Mặc định: kênh đầu tiên đang cần hành động KOL Safety.
  const selected =
    channels.find((c) => c.id === channelId) ??
    channels.find((c) => c.status === 'SAFETY_PENDING' || canRenew(c, now)) ??
    channels[0];

  const hasFailed = !!selected?.safety && !selected.safety.passedAt && selected.safety.items.some((i) => i.verdict === 'FAIL');

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      const msg: Record<string, string> = {
        NOT_VERIFIABLE: 'Kênh này chưa cần xác thực / gia hạn.',
        NOT_STARTED: 'Kênh chưa chốt danh sách: bấm "Xác thực" trên kênh trước.',
        NOTHING_TO_REMOVE: 'Không có nội dung "Không đạt" để gỡ.',
        NOTHING_TO_EDIT: 'Không có nội dung "Không đạt" để sửa.',
        NOT_VERIFIED: 'Chỉ tạm ngừng được kênh đang có dấu còn hạn.',
      };
      toast.error((e instanceof Error && msg[e.message]) || 'Không thực hiện được.');
    } finally {
      setBusy(false);
    }
  };

  const onVerdict = (v: Verdict) => {
    setVerdict(v);
    void safetyVerificationService.demoSetNextVerdict(v);
  };

  if (!ownerId) return null;
  return (
    <DemoPanelSection title="Xác thực kênh (KOL Safety)" description="Giả lập kết quả quét của KOL Safety cho kênh của tài khoản này.">
      {channels.length === 0 ? (
        <p className="text-xs text-muted-foreground">Chưa có kênh. Thêm kênh ở Quản lý kênh hoặc bấm “Điền hồ sơ mẫu”.</p>
      ) : (
        <div className="space-y-2.5">
          <Select value={selected?.id} onValueChange={setChannelId}>
            <SelectTrigger className="h-11 w-full md:h-9" aria-label="Chọn kênh">
              <SelectValue placeholder="Chọn kênh" />
            </SelectTrigger>
            <SelectContent>
              {channels.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {PLATFORM_LABEL[c.platform]} · {channelName(c.handle, c.url)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selected && <p className="text-xs text-muted-foreground">Trạng thái: {stateText(selected, now)}</p>}

          <div className="space-y-1">
            <p className="text-xs font-medium text-foreground">Kết quả lần quét tới</p>
            <Select value={verdict} onValueChange={(v) => onVerdict(v as Verdict)}>
              <SelectTrigger className="h-11 w-full md:h-9" aria-label="Kết quả lần quét tới">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VERDICTS.map((v) => (
                  <SelectItem key={v.key} value={v.key}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selected && (
            <div className="flex flex-wrap gap-2">
              {selected.status === 'SAFETY_PENDING' || canRenew(selected, now) ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-11 md:h-8"
                  disabled={busy || !selected.safety || !!selected.safety.passedAt}
                  title={!selected.safety ? 'KOL/MCN cần bấm Xác thực trên kênh trước để chốt danh sách' : undefined}
                  onClick={() => run(() => safetyVerificationService.scan(ownerId, selected.id), 'KOL Safety đã quét và gửi kết quả')}
                >
                  KOL Safety quét một lượt
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                className="h-11 md:h-8"
                disabled={busy}
                onClick={() => run(() => safetyVerificationService.demoPassAll(selected.id), 'Đã quét đủ — tất cả nội dung đạt')}
              >
                Quét đủ ngay
              </Button>
              {hasFailed && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-11 md:h-8"
                    disabled={busy}
                    onClick={() => run(() => safetyVerificationService.demoRemoveFailed(selected.id), 'Chủ kênh đã gỡ bài không đạt — danh sách cập nhật')}
                  >
                    Gỡ bài không đạt
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-11 md:h-8"
                    disabled={busy}
                    onClick={() => run(() => safetyVerificationService.demoEditFailed(selected.id), 'Chủ kênh đã sửa bài — cần quét lại')}
                  >
                    Sửa bài không đạt
                  </Button>
                </>
              )}
              {selected.status === 'VERIFIED' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-11 md:h-8"
                  disabled={busy}
                  onClick={() => run(() => safetyVerificationService.suspend(selected.id, 'Vi phạm đã xác nhận (demo)'), 'Dấu đã tạm ngừng')}
                >
                  Tạm ngừng (vi phạm)
                </Button>
              )}
              {selected.status === 'SUSPENDED' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-11 md:h-8"
                  disabled={busy}
                  onClick={() => run(() => safetyVerificationService.restore(selected.id), 'Đã khôi phục theo quyết định xử lý')}
                >
                  Khôi phục
                </Button>
              )}
              {selected.status !== 'SAFETY_PENDING' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-11 md:h-8"
                  disabled={busy}
                  onClick={() => run(() => safetyVerificationService.demoResetSafety(selected.id), 'Kênh về Chưa xác thực KOL Safety')}
                >
                  Chưa xác thực
                </Button>
              )}
              {selected.status === 'SAFETY_PENDING' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-11 md:h-8"
                  disabled={busy}
                  onClick={() => {
                    const short = selected.demoContentCount === undefined;
                    return run(
                      () => safetyVerificationService.demoSetContentCount(selected.id, short ? Math.floor(SAFETY_REQUIRED[selected.platform] / 2) : undefined),
                      short ? 'Kênh giờ chưa đủ nội dung' : 'Kênh đã đủ nội dung',
                    );
                  }}
                >
                  {selected.demoContentCount === undefined ? 'Chưa đủ nội dung' : 'Đủ nội dung'}
                </Button>
              )}
              {(selected.status === 'VERIFIED' || selected.status === 'EXPIRED') && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-11 md:h-8"
                    disabled={busy}
                    onClick={() => run(() => safetyVerificationService.demoSetDaysLeft(selected.id, 7), 'Dấu còn 7 ngày')}
                  >
                    Còn 7 ngày
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-11 md:h-8"
                    disabled={busy}
                    onClick={() => run(() => safetyVerificationService.demoSetDaysLeft(selected.id, 0), 'Dấu đã hết hạn')}
                  >
                    Hết hạn
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </DemoPanelSection>
  );
}

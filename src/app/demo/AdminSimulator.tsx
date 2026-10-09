import { useId, useMemo, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { ChevronDown, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Skeleton } from '../components/ui/skeleton';
import { Textarea } from '../components/ui/textarea';
import {
  errorMessage,
  reviewService,
  type AdminQueue,
  type ChannelVerdict,
  type OrgChange,
} from '../services';
import { PlatformIcon, ProfileStatusBadge } from '../features/shared/StatusBadges';
import { useLiveQuery } from '../features/shared/useLiveQuery';
import { DemoPanelSection } from './DemoPanelSection';

const ADMIN_ERRORS: Record<string, string> = {
  REASON_REQUIRED: 'Vui lòng nhập lý do.',
  VERDICT_MISSING: 'Vui lòng kết luận cho mọi kênh.',
  NOT_SUBMITTED: 'Hồ sơ không còn ở trạng thái chờ duyệt.',
  NOT_REVIEWABLE: 'Hồ sơ không còn ở trạng thái chờ duyệt.',
};

async function act(fn: () => Promise<unknown>, ok: string): Promise<boolean> {
  try {
    await fn();
    toast.success(ok);
    return true;
  } catch (e) {
    const key = e instanceof Error ? e.message : '';
    toast.error(ADMIN_ERRORS[key] ?? (key || 'Đã có lỗi xảy ra.'));
    return false;
  }
}

function ReasonDialog({
  open,
  onOpenChange,
  title,
  confirmLabel,
  quickFill,
  onConfirm,
}: {
  open: boolean;
  onOpenChange(o: boolean): void;
  title: string;
  confirmLabel: string;
  quickFill?: string;
  onConfirm(reason: string): Promise<boolean>;
}) {
  const id = useId();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    setBusy(true);
    const ok = await onConfirm(reason);
    setBusy(false);
    if (ok) {
      setReason('');
      onOpenChange(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Lý do là bắt buộc và sẽ được gửi tới người dùng.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={id}>Lý do</Label>
          <Textarea id={id} placeholder="Nêu rõ lý do để người dùng sửa hồ sơ" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          {quickFill && (
            <Button type="button" variant="link" size="sm" className="h-auto p-0 text-left whitespace-normal" onClick={() => setReason(quickFill)}>
              Điền nhanh: {quickFill}
            </Button>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="button" disabled={!reason.trim() || busy} onClick={() => void confirm()}>
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Group({ title, empty, children }: { title: string; empty: boolean; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h4>
      {empty ? <p className="text-xs text-muted-foreground">Không có mục nào</p> : children}
    </div>
  );
}

type QueueProfile = AdminQueue['profiles'][number];
type Draft = Record<string, { verdict?: 'PASS' | 'NEEDS_FIX'; reason: string }>;

const ORG_ROWS: [keyof OrgChange['org'], string][] = [
  ['orgName', 'Tên tổ chức'],
  ['regNo', 'Mã số DN'],
  ['regDate', 'Ngày cấp'],
  ['regBy', 'Nơi cấp'],
  ['legalRep', 'Người đại diện'],
];

function ProfileReview({ p }: { p: QueueProfile }) {
  const [draft, setDraft] = useState<Draft>({});
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<'fix' | 'reject' | null>(null);
  const baseId = useId();

  const ready = p.pendingChannels.every((c) => {
    const d = draft[c.id];
    return d?.verdict === 'PASS' || (d?.verdict === 'NEEDS_FIX' && d.reason.trim() !== '');
  });

  const approve = async (allPass = false) => {
    const verdicts: Record<string, ChannelVerdict> = {};
    for (const c of p.pendingChannels) {
      const d = draft[c.id];
      verdicts[c.id] = allPass || d.verdict === 'PASS' ? { verdict: 'PASS' } : { verdict: 'NEEDS_FIX', reason: d.reason };
    }
    setBusy(true);
    await act(() => reviewService.approve(p.ownerId, verdicts), p.status === 'APPROVED' ? 'Đã duyệt kênh mới' : 'Đã duyệt hồ sơ');
    setBusy(false);
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 truncate text-sm font-medium text-foreground">{p.displayName}</span>
        <Badge variant="secondary">{p.ownerType}</Badge>
        <ProfileStatusBadge status={p.status} />
      </div>
      {p.submittedAt && <p className="text-xs text-muted-foreground">Gửi lúc {format(p.submittedAt, 'HH:mm dd/MM/yyyy')}</p>}

      {p.org && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 rounded bg-muted p-2 text-xs">
          {ORG_ROWS.map(([k, label]) => (
            <div key={k} className="min-w-0">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="truncate text-foreground">{p.org![k] || '—'}</dd>
            </div>
          ))}
          <div className="col-span-2 min-w-0">
            <dt className="text-muted-foreground">File GCN</dt>
            <dd className="truncate text-foreground">{p.gcnFile?.name ?? '—'}</dd>
          </div>
        </dl>
      )}

      {p.pendingChannels.map((c) => {
        const d = draft[c.id] ?? { reason: '' };
        const set = (patch: Partial<Draft[string]>) => setDraft((s) => ({ ...s, [c.id]: { ...d, ...patch } }));
        return (
          <div key={c.id} className="space-y-2 rounded-md border border-border p-2">
            <div className="flex items-center gap-2">
              <PlatformIcon platform={c.platform} className="size-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{c.handle}</span>
              {c.proofImage.thumbnail && <img src={c.proofImage.thumbnail} alt={`Ảnh quản lý ${c.handle}`} className="size-10 rounded object-cover" />}
            </div>
            {/* Admin chỉ xét chủ sở hữu kênh; KOL Safety đã chấm nội dung (BR-21). */}
            <p className="text-xs text-muted-foreground">
              {c.safety?.passedAt
                ? `KOL Safety: ${c.safety.required}/${c.safety.required} nội dung đạt · ${format(c.safety.passedAt, 'dd/MM/yyyy')}`
                : c.safetyPassedAt
                  ? `KOL Safety: đạt · ${format(c.safetyPassedAt, 'dd/MM/yyyy')}`
                  : 'KOL Safety: đạt (dữ liệu mẫu)'}{' '}
              · chỉ xét link và ảnh quản lý kênh
            </p>
            <RadioGroup
              value={d.verdict ?? ''}
              onValueChange={(v) => set({ verdict: v as 'PASS' | 'NEEDS_FIX' })}
              className="flex gap-4"
              aria-label={`Kết luận kênh ${c.handle}`}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="PASS" id={`${baseId}-${c.id}-pass`} aria-labelledby={`${baseId}-${c.id}-pass-label`} />
                <Label id={`${baseId}-${c.id}-pass-label`} htmlFor={`${baseId}-${c.id}-pass`} className="font-normal">Đạt</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="NEEDS_FIX" id={`${baseId}-${c.id}-fix`} aria-labelledby={`${baseId}-${c.id}-fix-label`} />
                <Label id={`${baseId}-${c.id}-fix-label`} htmlFor={`${baseId}-${c.id}-fix`} className="font-normal">Cần bổ sung</Label>
              </div>
            </RadioGroup>
            {d.verdict === 'NEEDS_FIX' && (
              <Textarea
                value={d.reason}
                onChange={(e) => set({ reason: e.target.value })}
                placeholder="Lý do (bắt buộc)"
                aria-label={`Lý do cần bổ sung cho ${c.handle}`}
                rows={2}
              />
            )}
          </div>
        );
      })}

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={!ready || busy} onClick={() => void approve()}>
          {busy && <Loader2 className="animate-spin" aria-hidden />}
          Duyệt hồ sơ
        </Button>
        {/* Demo shortcut: approve in one click with every pending channel "Đạt". */}
        {p.pendingChannels.length > 0 && (
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void approve(true)}>
            Duyệt nhanh (tất cả kênh Đạt)
          </Button>
        )}
        {p.status === 'SUBMITTED' && (
          <>
            <Button type="button" size="sm" variant="outline" onClick={() => setDialog('fix')}>
              Yêu cầu bổ sung
            </Button>
            <Button type="button" size="sm" variant="outline" className="text-destructive" onClick={() => setDialog('reject')}>
              Từ chối
            </Button>
          </>
        )}
      </div>

      <ReasonDialog
        open={dialog === 'fix'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Yêu cầu bổ sung hồ sơ"
        confirmLabel="Gửi yêu cầu"
        onConfirm={(r) => act(() => reviewService.requestFix(p.ownerId, r), 'Đã yêu cầu bổ sung')}
      />
      <ReasonDialog
        open={dialog === 'reject'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Từ chối hồ sơ"
        confirmLabel="Từ chối"
        quickFill={p.ownerType === 'MCN' ? errorMessage('KOLHUB-4304') : undefined}
        onConfirm={(r) => act(() => reviewService.reject(p.ownerId, r), 'Đã từ chối hồ sơ')}
      />
    </div>
  );
}

function describeChange(v: string | OrgChange): string {
  if (typeof v === 'string') return v || '—';
  return `${v.org.orgName} · ${v.org.regNo} · ${v.org.legalRep}${v.gcnFile ? ` · ${v.gcnFile.name}` : ''}`;
}

function ChangeItem({ c }: { c: AdminQueue['changes'][number] }) {
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  return (
    <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
      <p className="font-medium text-foreground">{c.displayName}</p>
      <p className="text-xs text-muted-foreground">{c.field === 'displayName' ? 'Họ tên KOL/KOC' : 'Thông tin định danh tổ chức'}</p>
      <p className="break-words text-xs">
        <span className="text-muted-foreground">{describeChange(c.oldValue)}</span> →{' '}
        <span className="font-medium text-foreground">{describeChange(c.newValue)}</span>
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await act(() => reviewService.decideChange(c.id, { approve: true }), 'Đã duyệt thay đổi');
            setBusy(false);
          }}
        >
          Duyệt
        </Button>
        <Button type="button" size="sm" variant="outline" className="text-destructive" onClick={() => setRejecting(true)}>
          Từ chối
        </Button>
      </div>
      <ReasonDialog
        open={rejecting}
        onOpenChange={setRejecting}
        title="Từ chối thay đổi"
        confirmLabel="Từ chối"
        onConfirm={(r) => act(() => reviewService.decideChange(c.id, { approve: false, reason: r }), 'Đã từ chối thay đổi')}
      />
    </div>
  );
}

function EkycCaseItem({ c }: { c: AdminQueue['ekycCases'][number] }) {
  const [redo, setRedo] = useState(false);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    await act(fn, ok);
    setBusy(false);
  };
  return (
    <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="font-medium text-foreground">{c.displayName}</span>
        <Badge variant="secondary">{c.status === 'MANUAL_REVIEW' ? 'Họ tên khác CCCD' : 'Báo mạo danh'}</Badge>
      </div>
      {c.status === 'MANUAL_REVIEW' ? (
        <>
          <p className="text-xs text-muted-foreground">
            Hồ sơ: <span className="text-foreground">{c.displayName}</span> · CCCD: <span className="text-foreground">{c.ocr?.fullName ?? '—'}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={() => void run(() => reviewService.closeEkycCase(c.accountId, 'accept-name'), 'Đã chấp nhận tên theo CCCD')}>
              Chấp nhận tên theo CCCD
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setRedo(true)}>
              Yêu cầu làm lại
            </Button>
          </div>
          <ReasonDialog
            open={redo}
            onOpenChange={setRedo}
            title="Yêu cầu xác thực lại"
            confirmLabel="Gửi yêu cầu"
            onConfirm={(r) => act(() => reviewService.closeEkycCase(c.accountId, 'reset', r), 'Đã yêu cầu xác thực lại')}
          />
        </>
      ) : (
        <Button type="button" size="sm" disabled={busy} onClick={() => void run(() => reviewService.closeEkycCase(c.accountId, 'reset'), 'Đã đóng báo cáo')}>
          Đóng báo cáo, cho xác thực lại
        </Button>
      )}
    </div>
  );
}

function VerifiedChannelItem({ c }: { c: AdminQueue['verifiedChannels'][number] }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
      <PlatformIcon platform={c.platform} className="size-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-foreground">
          {c.handle} <span className="text-muted-foreground">· {c.displayName}</span>
        </p>
        {c.badgeExpiresAt && <p className="text-xs text-muted-foreground">Hạn dấu {format(c.badgeExpiresAt, 'dd/MM/yyyy')}</p>}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await act(() => reviewService.expireChannelNow(c.id), 'Đã chuyển kênh sang hết hạn');
          setBusy(false);
        }}
      >
        Đẩy sang hết hạn
      </Button>
    </div>
  );
}

const CHANNEL_PREVIEW = 10;
const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();

/**
 * "Kênh có dấu" — includes ~90 seeded channels, so it is collapsed by default, searchable by KOL name
 * or handle, and lists at most CHANNEL_PREVIEW rows until "Xem tất cả".
 */
function VerifiedChannels({ channels }: { channels: AdminQueue['verifiedChannels'] }) {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  const [query, setQuery] = useState('');
  const listId = useId();
  const matches = useMemo(() => {
    const q = fold(query);
    return q ? channels.filter((c) => fold(`${c.displayName} ${c.handle}`).includes(q)) : channels;
  }, [channels, query]);
  const shown = all ? matches : matches.slice(0, CHANNEL_PREVIEW);

  return (
    <div className="space-y-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-8"
      >
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Kênh có dấu <span className="font-normal normal-case">({channels.length})</span>
        </span>
        <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div id={listId} className="space-y-2">
          {channels.length === 0 ? (
            <p className="text-xs text-muted-foreground">Không có mục nào</p>
          ) : (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm theo tên KOL hoặc tên kênh"
                  aria-label="Tìm kênh có dấu"
                  className="h-11 pl-9 md:h-9"
                />
              </div>
              {matches.length === 0 ? (
                <p className="text-xs text-muted-foreground">Không tìm thấy kênh phù hợp</p>
              ) : (
                <div className="space-y-2">
                  {shown.map((c) => (
                    <VerifiedChannelItem key={c.id} c={c} />
                  ))}
                </div>
              )}
              {matches.length > CHANNEL_PREVIEW && (
                <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => setAll((a) => !a)}>
                  {all ? 'Thu gọn' : `Xem tất cả (${matches.length})`}
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Admin tab block "Duyệt hồ sơ": review profiles, channels, changes and eKYC cases. */
export function AdminSimulator() {
  const q = useLiveQuery(() => reviewService.listAdminQueue(), []);
  const data = q.data;

  return (
    <DemoPanelSection
      title="Duyệt hồ sơ"
      count={data ? data.profiles.length + data.changes.length + data.ekycCases.length : undefined}
      description="Duyệt thay Admin, gửi email/SMS giả."
    >
      {!data ? (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          <Group title="Hồ sơ chờ duyệt" empty={!data.profiles.length}>
            <div className="space-y-2">
              {data.profiles.map((p) => (
                <ProfileReview key={`${p.ownerId}-${p.submittedAt}-${p.pendingChannels.map((c) => c.id).join(',')}`} p={p} />
              ))}
            </div>
          </Group>
          <Group title="Thay đổi chờ duyệt" empty={!data.changes.length}>
            <div className="space-y-2">
              {data.changes.map((c) => (
                <ChangeItem key={c.id} c={c} />
              ))}
            </div>
          </Group>
          <Group title="Case eKYC chờ xử lý" empty={!data.ekycCases.length}>
            <div className="space-y-2">
              {data.ekycCases.map((c) => (
                <EkycCaseItem key={c.accountId} c={c} />
              ))}
            </div>
          </Group>
          <VerifiedChannels channels={data.verifiedChannels} />
        </div>
      )}
    </DemoPanelSection>
  );
}

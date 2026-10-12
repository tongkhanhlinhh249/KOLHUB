import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, FileVideo, ImageIcon, Info, Loader2, Star, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../components/ui/utils';
import {
  BOOKING_NOTE_MAX,
  bookingService,
  CAMPAIGN_NAME_MAX,
  MAX_VIDEO_BYTES,
  platformOfLink,
  VIDEO_EXTENSIONS,
  type BookingItemView,
  type BookingView,
  type ContentSubmission,
  type StoredFile,
} from '../../services';
import { formatFileSize, toStoredFile } from '../shared/files';
import { readVideoFile } from '../safety/videoFile';
import { ItemsEditor, useProposalSources } from './ItemsEditor';
import { errText } from './parts';
import { rowsFromItems, rowsValid, toProposalItems, validateRows, type ItemDraft, type ItemErrors } from './proposalItems';
import { deliverableLabel, formatVnd, formatVndInput, parseVndInput, platformName } from './supplierBooking';
import { PostResult, SafetyResult } from './ContentParts';
import { channelName } from '../channels/ChannelParts';

const footerBtn = 'h-11 md:h-9';

function ErrorAlert({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <Alert variant="destructive">
      <AlertCircle className="size-4" aria-hidden />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}

/** Shared shell: title, scrollable body, error, Huỷ + confirm. */
function ActionDialog({
  open,
  onOpenChange,
  title,
  description,
  busy,
  error,
  confirmLabel,
  confirmDisabled,
  onConfirm,
  children,
  wide,
  footer,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  description?: ReactNode;
  busy: boolean;
  error: string | null;
  confirmLabel: string;
  confirmDisabled?: boolean;
  onConfirm(): void;
  children: ReactNode;
  wide?: boolean;
  /** Replaces the default footer (e.g. result step). */
  footer?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className={cn('flex max-h-[90dvh] max-w-[calc(100%-2rem)] flex-col gap-4', wide ? 'sm:max-w-xl' : 'sm:max-w-lg')}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription className="break-words">{description}</DialogDescription>}
        </DialogHeader>
        <div className="@container -mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto px-1">{children}</div>
        <ErrorAlert error={error} />
        {footer ?? (
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" className={footerBtn} disabled={busy} onClick={() => onOpenChange(false)}>
              Huỷ
            </Button>
            <Button type="button" className={footerBtn} disabled={busy || confirmDisabled} onClick={onConfirm}>
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              {confirmLabel}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Run a booking mutation with busy / error state. Resolves to the new view, or null on failure. */
function useMutation() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<BookingView>): Promise<BookingView | null> => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(errText(e));
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, run };
}

function NoteField({ id, value, onChange, label, placeholder }: { id: string; value: string; onChange(v: string): void; label: string; placeholder: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} rows={3} maxLength={BOOKING_NOTE_MAX} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      <p className="text-right text-xs text-muted-foreground tabular-nums">
        {value.trim().length}/{BOOKING_NOTE_MAX}
      </p>
    </div>
  );
}

/** Which item a draft / post is for: "KOL · @kênh · Video × 2". */
export function itemLabel(i: BookingItemView): string {
  const ch = i.channel ? channelName(i.channel.handle, i.channel.url) : platformName(i.platform);
  return `${i.displayName} · ${ch} · ${deliverableLabel(i.deliverableType)} × ${i.quantity}`;
}

const WHOLE = '__all';

function ItemSelect({
  id,
  items,
  value,
  onChange,
  allLabel,
}: {
  id: string;
  items: BookingItemView[];
  value: string;
  onChange(v: string): void;
  allLabel: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Hạng mục</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-11 w-full bg-card md:h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={WHOLE}>{allLabel}</SelectItem>
          {items.map((i) => (
            <SelectItem key={i.id} value={i.id}>
              {itemLabel(i)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function AssignItemsDialog({
  open,
  onOpenChange,
  booking,
  accountId,
}: {
  open: boolean;
  onOpenChange(o: boolean): void;
  booking: BookingView;
  accountId: string;
}) {
  const id = useId();
  const m = useMutation();
  const supplierType = booking.supplierType;
  const sources = useProposalSources(accountId, supplierType, booking.campaign.platforms, open);
  const [rows, setRows] = useState<ItemDraft[]>([]);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRows(rowsFromItems(booking.items));
    setTried(false);
    m.setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const errors: ItemErrors[] | undefined = tried ? validateRows(rows, supplierType) : undefined;
  const submit = async () => {
    setTried(true);
    if (rows.length === 0 || !rowsValid(validateRows(rows, supplierType))) return;
    const v = await m.run(() => bookingService.assignItems(booking.id, toProposalItems(rows, supplierType)));
    if (v) {
      toast.success('Đã cập nhật KOL và kênh đăng');
      onOpenChange(false);
    }
  };

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={supplierType === 'MCN' ? 'Giao KOL/kênh' : 'Chọn kênh đăng'}
      description={
        supplierType === 'MCN'
          ? 'Chọn KOL do MCN quản lý và kênh đã gán cho KOL đó cho từng hạng mục. Mọi hạng mục cần có kênh trước khi chốt.'
          : 'Chọn kênh đã xác thực của bạn cho từng hạng mục. Mọi hạng mục cần có kênh trước khi chốt.'
      }
      busy={m.busy}
      error={m.error}
      confirmLabel="Lưu hạng mục"
      confirmDisabled={sources.loading}
      onConfirm={() => void submit()}
    >
      <ItemsEditor
        supplierType={supplierType}
        sources={sources}
        platforms={booking.campaign.platforms}
        rows={rows}
        errors={errors}
        onChange={setRows}
        idPrefix={`${id}-item`}
      />
    </ActionDialog>
  );
}

// ---------------------------------------------------------------------------
// Nộp bản nháp
// ---------------------------------------------------------------------------

const IMAGE_TYPES = ['image/jpeg', 'image/png'];
const IMAGE_MAX_BYTES = 20 * 1024 * 1024;
const ext = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';

interface PickedFile {
  file: StoredFile;
  durationSec?: number;
  kind: 'video' | 'image';
}

/** Local video → StoredFile with a frame thumbnail (bytes are never kept) + duration; JPG/PNG → StoredFile. */
async function pickDraftFile(f: File): Promise<PickedFile> {
  if (IMAGE_TYPES.includes(f.type)) {
    if (f.size > IMAGE_MAX_BYTES) throw new Error('Ảnh tối đa 20 MB.');
    return { file: await toStoredFile(f), kind: 'image' };
  }
  if (!VIDEO_EXTENSIONS.includes(ext(f.name))) throw new Error('Chỉ nhận video MP4, MOV, WEBM hoặc ảnh JPG, PNG.');
  if (f.size > MAX_VIDEO_BYTES) throw new Error(`Video tối đa ${formatFileSize(MAX_VIDEO_BYTES)}.`);
  const info = await readVideoFile(f);
  const file: StoredFile = { name: f.name, type: f.type || `video/${ext(f.name)}`, size: f.size };
  if (info.thumbnail) file.thumbnail = info.thumbnail;
  return { file, kind: 'video', ...(info.durationSec ? { durationSec: Math.round(info.durationSec) } : {}) };
}

const newest = (b: BookingView, kind: ContentSubmission['kind']) =>
  [...b.contents].filter((c) => c.kind === kind).sort((x, y) => y.submittedAt - x.submittedAt)[0];

export function DraftDialog({ open, onOpenChange, booking }: { open: boolean; onOpenChange(o: boolean): void; booking: BookingView }) {
  const id = useId();
  const m = useMutation();
  const fileInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [itemId, setItemId] = useState(WHOLE);
  const [picked, setPicked] = useState<PickedFile | null>(null);
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [result, setResult] = useState<ContentSubmission | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setUrl('');
    setNote('');
    setItemId(WHOLE);
    setPicked(null);
    setFileError(null);
    setTried(false);
    setResult(null);
    m.setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setReading(true);
    setFileError(null);
    try {
      setPicked(await pickDraftFile(f));
    } catch (e) {
      setPicked(null);
      setFileError(errText(e));
    } finally {
      setReading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const titleError = tried && !title.trim() ? 'Nhập tiêu đề bản nháp' : null;
  const sourceError = tried && !picked && !url.trim() ? 'Tải tệp video/ảnh lên hoặc dán link xem trước' : null;

  const submit = async () => {
    setTried(true);
    if (!title.trim() || (!picked && !url.trim())) return;
    const v = await m.run(() =>
      bookingService.submitDraft(booking.id, {
        title: title.trim(),
        ...(picked ? { file: picked.file } : {}),
        ...(picked?.durationSec ? { durationSec: picked.durationSec } : {}),
        ...(url.trim() ? { url: url.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(itemId !== WHOLE ? { itemId } : {}),
      }),
    );
    if (v) {
      toast.success('Đã nộp bản nháp', { description: 'Chờ Nhãn hàng duyệt nội dung.' });
      setResult(newest(v, 'DRAFT') ?? null);
    }
  };

  if (result) {
    return (
      <ActionDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Đã nộp bản nháp"
        description={result.title}
        busy={false}
        error={null}
        confirmLabel=""
        onConfirm={() => undefined}
        footer={
          <DialogFooter>
            <Button type="button" className={footerBtn} onClick={() => onOpenChange(false)}>
              Xong
            </Button>
          </DialogFooter>
        }
      >
        {result.safety ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Kết quả KOL Safety</p>
            <SafetyResult name={result.file?.name ?? result.title} result={result.safety} />
            <p className="text-sm text-muted-foreground">
              {result.safety.verdict === 'VIOLATION'
                ? 'Phát hiện nội dung vi phạm. Nhãn hàng sẽ thấy kết quả này khi duyệt — nên chỉnh sửa và nộp lại bản nháp mới.'
                : result.safety.verdict === 'GRAY'
                  ? 'Có nội dung thuộc vùng xám. Xem chi tiết để cân nhắc chỉnh sửa trước khi Nhãn hàng duyệt.'
                  : 'Không phát hiện vi phạm. Bản nháp đã được gửi cho Nhãn hàng duyệt.'}
            </p>
          </div>
        ) : (
          <Alert>
            <Info className="size-4" aria-hidden />
            <AlertDescription>Bản nháp dạng link không được quét tự động. Nhãn hàng sẽ xem trực tiếp qua link bạn gửi.</AlertDescription>
          </Alert>
        )}
      </ActionDialog>
    );
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title="Nộp bản nháp"
      description="Tệp video được KOL Safety kiểm tra trước khi gửi Nhãn hàng duyệt. Không giới hạn số lần nộp lại."
      busy={m.busy || reading}
      error={m.error}
      confirmLabel="Nộp bản nháp"
      onConfirm={() => void submit()}
    >
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-title`}>Tiêu đề</Label>
        <Input
          id={`${id}-title`}
          value={title}
          maxLength={CAMPAIGN_NAME_MAX}
          placeholder="Ví dụ: Video review sữa hạt — bản 1"
          onChange={(e) => setTitle(e.target.value)}
          className="h-11 bg-card md:h-9"
          aria-invalid={!!titleError}
        />
        {titleError && <p className="text-xs text-destructive">{titleError}</p>}
      </div>

      {booking.items.length > 1 && (
        <ItemSelect id={`${id}-item`} items={booking.items} value={itemId} onChange={setItemId} allLabel="Toàn bộ booking" />
      )}

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">Tệp nội dung</p>
        <input
          ref={fileInput}
          type="file"
          accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm,image/jpeg,image/png"
          className="sr-only"
          id={`${id}-file`}
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        {picked ? (
          <div className="flex items-center gap-3 rounded-[8px] border border-border p-3">
            {picked.file.thumbnail ? (
              <img src={picked.file.thumbnail} alt="" className="size-14 shrink-0 rounded-md object-cover" />
            ) : (
              <span className="grid size-14 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                {picked.kind === 'video' ? <FileVideo className="size-6" aria-hidden /> : <ImageIcon className="size-6" aria-hidden />}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{picked.file.name}</span>
              <span className="block text-xs text-muted-foreground">
                {formatFileSize(picked.file.size)}
                {picked.durationSec ? ` · ${Math.floor(picked.durationSec / 60)}:${String(picked.durationSec % 60).padStart(2, '0')}` : ''}
              </span>
            </span>
            <Button type="button" variant="ghost" size="icon" className="size-11 md:size-8" aria-label="Bỏ tệp" onClick={() => setPicked(null)}>
              <X aria-hidden />
            </Button>
          </div>
        ) : (
          <Button type="button" variant="outline" className="h-11 w-full md:h-10" disabled={reading} onClick={() => fileInput.current?.click()}>
            {reading ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
            {reading ? 'Đang đọc tệp…' : 'Chọn video hoặc ảnh'}
          </Button>
        )}
        <p className={cn('text-xs', fileError ? 'text-destructive' : 'text-muted-foreground')} role={fileError ? 'alert' : undefined}>
          {fileError ?? `Video MP4, MOV, WEBM (tối đa ${formatFileSize(MAX_VIDEO_BYTES)}) hoặc ảnh JPG, PNG. Tệp chỉ được đọc trên máy của bạn.`}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-url`}>Hoặc link xem trước</Label>
        <Input
          id={`${id}-url`}
          type="url"
          inputMode="url"
          value={url}
          placeholder="https://drive.google.com/…"
          onChange={(e) => setUrl(e.target.value)}
          className="h-11 bg-card md:h-9"
        />
      </div>
      {sourceError && <p className="text-xs text-destructive">{sourceError}</p>}

      <NoteField id={`${id}-note`} value={note} onChange={setNote} label="Ghi chú cho Nhãn hàng (không bắt buộc)" placeholder="Những điểm đã chỉnh theo góp ý…" />
    </ActionDialog>
  );
}

// ---------------------------------------------------------------------------
// Gửi link bài đăng
// ---------------------------------------------------------------------------

export function PostDialog({ open, onOpenChange, booking }: { open: boolean; onOpenChange(o: boolean): void; booking: BookingView }) {
  const id = useId();
  const m = useMutation();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [itemId, setItemId] = useState(WHOLE);
  const [result, setResult] = useState<{ post: ContentSubmission; view: BookingView } | null>(null);
  const posted = (itemId: string) => booking.contents.some((c) => c.kind === 'POST' && c.itemId === itemId);
  const openItems = booking.items.filter((i) => !posted(i.id));

  useEffect(() => {
    if (!open) return;
    setUrl('');
    setTitle('');
    setItemId(WHOLE);
    setResult(null);
    m.setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const detected = url.trim() ? platformOfLink(url) : null;
  const submit = async () => {
    if (!url.trim()) {
      m.setError('Dán link bài đăng đã đăng công khai.');
      return;
    }
    const v = await m.run(() =>
      bookingService.submitPost(booking.id, {
        url: url.trim(),
        ...(itemId !== WHOLE ? { itemId } : {}),
        ...(title.trim() ? { title: title.trim() } : {}),
      }),
    );
    const post = v && newest(v, 'POST');
    if (v && post) {
      toast.success('Bài đăng đã được xác minh');
      setResult({ post, view: v });
    }
  };

  if (result) {
    const left = result.view.items.filter((i) => !result.view.contents.some((c) => c.kind === 'POST' && c.itemId === i.id)).length;
    return (
      <ActionDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Bài đăng đã được xác minh"
        busy={false}
        error={null}
        confirmLabel=""
        onConfirm={() => undefined}
        footer={
          <DialogFooter>
            <Button type="button" className={footerBtn} onClick={() => onOpenChange(false)}>
              Xong
            </Button>
          </DialogFooter>
        }
      >
        <PostResult post={result.post} />
        <p className="flex items-start gap-2 text-sm text-foreground">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-chart-4" aria-hidden />
          {left === 0
            ? 'Mọi hạng mục đã có bài đăng được xác minh. Booking chờ Nhãn hàng thanh toán.'
            : `Còn ${left} hạng mục chưa có bài đăng. Gửi tiếp link cho các hạng mục còn lại.`}
        </p>
      </ActionDialog>
    );
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Gửi link bài đăng"
      description="Hệ thống xác minh ngay: link phải là bài đăng trên đúng nền tảng của hạng mục và lấy số liệu bài đăng."
      busy={m.busy}
      error={m.error}
      confirmLabel="Gửi và xác minh"
      onConfirm={() => void submit()}
    >
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-url`}>Link bài đăng</Label>
        <Input
          id={`${id}-url`}
          type="url"
          inputMode="url"
          value={url}
          placeholder="https://www.tiktok.com/@kenh/video/…"
          onChange={(e) => {
            setUrl(e.target.value);
            if (m.error) m.setError(null);
          }}
          className="h-11 bg-card md:h-9"
        />
        <p className="text-xs text-muted-foreground">
          {detected ? `Nhận diện: bài đăng ${platformName(detected)}` : 'Nhận link TikTok, YouTube, Facebook hoặc Instagram.'}
        </p>
      </div>
      {booking.items.length > 1 && (
        <ItemSelect
          id={`${id}-item`}
          items={openItems.length ? openItems : booking.items}
          value={itemId}
          onChange={setItemId}
          allLabel="Tự nhận theo nền tảng của link"
        />
      )}
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-title`}>Tiêu đề bài đăng (không bắt buộc)</Label>
        <Input
          id={`${id}-title`}
          value={title}
          maxLength={CAMPAIGN_NAME_MAX}
          onChange={(e) => setTitle(e.target.value)}
          className="h-11 bg-card md:h-9"
        />
      </div>
    </ActionDialog>
  );
}

// ---------------------------------------------------------------------------
// Đánh giá
// ---------------------------------------------------------------------------

const STAR_TEXT = ['', 'Rất không hài lòng', 'Không hài lòng', 'Bình thường', 'Hài lòng', 'Rất hài lòng'];

export function RateDialog({ open, onOpenChange, booking }: { open: boolean; onOpenChange(o: boolean): void; booking: BookingView }) {
  const id = useId();
  const m = useMutation();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!open) return;
    setStars(0);
    setComment('');
    m.setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async () => {
    const v = await m.run(() => bookingService.rate(booking.id, stars, comment.trim() || undefined));
    if (v) {
      toast.success('Đã gửi đánh giá');
      onOpenChange(false);
    }
  };

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Đánh giá Nhãn hàng"
      description={`${booking.campaign.brand.company} · ${booking.campaign.name}. Đánh giá chỉ lưu nội bộ, Nhãn hàng không xem được.`}
      busy={m.busy}
      error={m.error}
      confirmLabel="Gửi đánh giá"
      confirmDisabled={stars === 0}
      onConfirm={() => void submit()}
    >
      <div className="space-y-2">
        <p id={`${id}-stars`} className="text-sm font-medium text-foreground">
          Mức độ hài lòng
        </p>
        <div role="radiogroup" aria-labelledby={`${id}-stars`} className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={stars === n}
              aria-label={`${n} sao`}
              onClick={() => setStars(n)}
              className="grid size-11 place-items-center rounded-md hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Star className={cn('size-7', n <= stars ? 'fill-primary text-primary' : 'text-muted-foreground')} aria-hidden />
            </button>
          ))}
        </div>
        <p className="min-h-5 text-sm text-muted-foreground" aria-live="polite">
          {STAR_TEXT[stars]}
        </p>
      </div>
      <NoteField id={`${id}-comment`} value={comment} onChange={setComment} label="Nhận xét (không bắt buộc)" placeholder="Trao đổi, phản hồi, thanh toán…" />
    </ActionDialog>
  );
}

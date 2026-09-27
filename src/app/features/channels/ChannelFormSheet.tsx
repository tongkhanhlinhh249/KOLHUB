import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { useIsMobile } from '../../components/ui/use-mobile';
import { cn } from '../../components/ui/utils';
import {
  channelService,
  detectPlatform,
  errorMessage,
  KolhubError,
  validateProofImage,
  type Channel,
  type StoredFile,
} from '../../services';
import { toStoredFile } from '../shared/files';
import { PLATFORM_LABEL, PlatformIcon } from '../shared/StatusBadges';

interface ChannelFormSheetProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  accountId: string;
  /** Edit this channel; add a new one when omitted. */
  channel?: Channel;
}

function errorText(e: unknown): string {
  return e instanceof Error && e.message ? e.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

/** SCR-06 add/edit channel form: link with live platform detection + channel admin screenshot. */
export function ChannelFormSheet({ open, onOpenChange, accountId, channel }: ChannelFormSheetProps) {
  const isMobile = useIsMobile();
  const urlId = useId();
  const fileId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [proof, setProof] = useState<StoredFile | undefined>();
  const [urlError, setUrlError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUrl(channel?.url ?? '');
    setProof(channel?.proofImage);
    setUrlError(null);
    setFileError(null);
  }, [open, channel]);

  const platform = detectPlatform(url);
  const unsupported = url.trim() !== '' && !platform;
  const canSave = !!platform && !!proof && !reading && !saving;

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    setFileError(null);
    try {
      validateProofImage({ name: file.name, type: file.type, size: file.size });
      setReading(true);
      setProof(await toStoredFile(file));
    } catch (e) {
      setFileError(errorText(e));
    } finally {
      setReading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSave || !proof) return;
    setSaving(true);
    setUrlError(null);
    try {
      if (channel) {
        const saved = await channelService.update(accountId, channel.id, { url, proofImage: proof });
        // The service leaves an unchanged channel untouched (keeps VERIFIED and its badge, UC-09 2a).
        if (saved.updatedAt === channel.updatedAt) toast('Không có thay đổi');
        else toast.success('Đã lưu kênh, đang chờ duyệt');
      } else {
        await channelService.add(accountId, { url, proofImage: proof });
        toast.success('Đã lưu kênh, đang chờ duyệt');
      }
      onOpenChange(false);
    } catch (err) {
      if (err instanceof KolhubError && (err.code === 'KOLHUB-4201' || err.code === 'KOLHUB-4202')) setUrlError(err.message);
      else if (err instanceof KolhubError && err.code === 'KOLHUB-4203') setFileError(err.message);
      else if (err instanceof Error && err.message === 'LOCKED_IN_REVIEW') toast.error('Kênh đang được xét duyệt, chưa sửa được.');
      else toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const shownUrlError = urlError ?? (unsupported ? errorMessage('KOLHUB-4202') : null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={cn('flex flex-col gap-0 p-0', isMobile ? 'max-h-[90dvh]' : 'w-full sm:max-w-md')}
      >
        <SheetHeader className="border-b border-border p-4 pr-12 text-left">
          <SheetTitle>{channel ? 'Sửa kênh' : 'Thêm kênh'}</SheetTitle>
          <SheetDescription>Hỗ trợ kênh Facebook, YouTube và TikTok.</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            {channel?.status === 'VERIFIED' && (
              <Alert>
                <AlertTriangle className="size-4 text-chart-5" aria-hidden />
                <AlertDescription>Đổi link hoặc ảnh sẽ tạm ngừng dấu Kênh xác thực cho tới khi được duyệt lại.</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor={urlId}>Link kênh</Label>
              <Input
                id={urlId}
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="https://www.tiktok.com/@tenkenh"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setUrlError(null);
                }}
                aria-invalid={shownUrlError ? true : undefined}
                aria-describedby={shownUrlError ? `${urlId}-error` : undefined}
                className={cn('h-11 md:h-10', shownUrlError && 'border-destructive')}
              />
              {platform && !shownUrlError && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  <PlatformIcon platform={platform} className="size-3.5" />
                  {PLATFORM_LABEL[platform]}
                </span>
              )}
              {shownUrlError && (
                <p id={`${urlId}-error`} className="text-xs text-destructive">
                  {shownUrlError}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={fileId}>Ảnh trang quản lý kênh</Label>
              <p className="text-xs text-muted-foreground">
                Chụp màn hình trang quản trị kênh đang đăng nhập, thấy rõ tên kênh. JPG/PNG ≤ 10 MB
              </p>
              <input
                id={fileId}
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png"
                className="sr-only"
                onChange={(e) => void pickFile(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className={cn(
                  'flex min-h-28 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-dashed border-border bg-muted/40 p-3 text-sm text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  fileError && 'border-destructive',
                )}
              >
                {reading ? (
                  <Loader2 className="size-5 animate-spin" aria-hidden />
                ) : proof?.thumbnail ? (
                  <img src={proof.thumbnail} alt="Ảnh trang quản lý kênh đã chọn" className="max-h-48 rounded object-contain" />
                ) : (
                  <ImagePlus className="size-6" aria-hidden />
                )}
                <span className="break-all">{proof ? proof.name : 'Chọn ảnh'}</span>
              </button>
              {fileError && <p className="text-xs text-destructive">{fileError}</p>}
            </div>
          </div>
          <div className="flex gap-2 border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <Button type="button" variant="outline" className="h-11 flex-1 md:h-10" onClick={() => onOpenChange(false)}>
              Huỷ
            </Button>
            <Button type="submit" className="h-11 flex-1 md:h-10" disabled={!canSave}>
              {saving && <Loader2 className="animate-spin" aria-hidden />}
              Lưu
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

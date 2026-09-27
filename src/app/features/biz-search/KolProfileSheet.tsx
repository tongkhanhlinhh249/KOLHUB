import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, Bookmark, BookmarkCheck, Copy, ExternalLink, Mail, MapPin, RotateCcw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Skeleton } from '../../components/ui/skeleton';
import { KolhubError, searchService, type KolPublicProfile } from '../../services';
import { formatDate, formatFollowers } from './format';
import { KolAvatar } from './KolCard';
import { PlatformIcon } from './PlatformIcon';
import { ChannelBadge } from './StatusBadges';

interface KolProfileSheetProps {
  kolId: string | null;
  saved: boolean;
  onOpenChange(open: boolean): void;
  onSave(kolId: string): void;
}

async function copy(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
  } catch {
    toast.error('Không sao chép được. Vui lòng thử lại.');
  }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

/** SCR-10 — public KOL profile for Brand/Agency. Only KolPublicProfile fields are rendered (BR-58). */
export function KolProfileSheet({ kolId, saved, onOpenChange, onSave }: KolProfileSheetProps) {
  const [profile, setProfile] = useState<KolPublicProfile | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!kolId) return;
    let alive = true;
    setLoading(true);
    setError(null);
    setProfile(null);
    searchService
      .getKolPublicProfile(kolId)
      .then((p) => alive && setProfile(p))
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [kolId, attempt]);

  const notFound = error instanceof KolhubError && error.code === 'KOLHUB-4404';

  return (
    <Sheet open={kolId !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="sr-only">
          <SheetTitle>{profile ? `Hồ sơ ${profile.displayName}` : 'Hồ sơ KOL'}</SheetTitle>
          <SheetDescription>Thông tin công khai của KOL đã xác thực.</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 pt-12 sm:p-6 sm:pt-12">
          {loading && (
            <div className="space-y-6" aria-busy="true" aria-label="Đang tải hồ sơ">
              <div className="flex items-center gap-4">
                <Skeleton className="size-20 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          )}

          {error != null && !loading && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" aria-hidden />
              <AlertDescription className="space-y-3">
                <p>{error instanceof Error ? error.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.'}</p>
                {!notFound && (
                  <Button type="button" variant="outline" size="sm" onClick={load}>
                    <RotateCcw aria-hidden />
                    Thử lại
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {profile && !loading && (
            <>
              {profile.listingStatus !== 'VISIBLE' && (
                <Alert>
                  <AlertCircle className="size-4" aria-hidden />
                  <AlertDescription>
                    {profile.listingStatus === 'BADGE_EXPIRED'
                      ? 'KOL hiện không còn kênh mang dấu còn hiệu lực.'
                      : 'KOL đang tạm ngừng hoạt động các kênh đã xác thực.'}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-start gap-4">
                <KolAvatar name={profile.displayName} src={profile.avatar} className="size-20 text-lg" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="truncate text-lg font-semibold text-foreground">{profile.displayName}</h2>
                    {profile.listingStatus === 'VISIBLE' && (
                      <ShieldCheck className="size-5 shrink-0 text-primary" role="img" aria-label="Đã xác thực" />
                    )}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">@{profile.nickname}</p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <span>KOL ID: {profile.kolId}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label="Sao chép KOL ID"
                      onClick={() => void copy(profile.kolId, 'Đã sao chép KOL ID')}
                    >
                      <Copy className="size-3.5" aria-hidden />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-sm">
                    {profile.category && <Badge variant="secondary">{profile.category}</Badge>}
                    {profile.region && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <MapPin className="size-3.5" aria-hidden />
                        {profile.region}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <Section title="Giới thiệu">
                <p className="text-sm whitespace-pre-line text-muted-foreground">{profile.bio || 'Chưa có giới thiệu.'}</p>
              </Section>

              <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted p-3">
                  <dt className="text-xs text-muted-foreground">Tổng người theo dõi (kênh đã xác thực)</dt>
                  <dd className="text-lg font-semibold text-foreground">{formatFollowers(profile.totalFollowers)}</dd>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <dt className="text-xs text-muted-foreground">Xác thực lần đầu</dt>
                  <dd className="text-lg font-semibold text-foreground">{formatDate(profile.verifiedAt)}</dd>
                </div>
              </dl>

              <Section title="Kênh">
                {profile.channels.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Chưa có kênh công khai.</p>
                ) : (
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {profile.channels.map((c) => (
                      <li key={c.platform + c.url} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
                        <PlatformIcon platform={c.platform} className="size-6" />
                        <div className="min-w-0 flex-1">
                          <a
                            href={`https://${c.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex max-w-full items-center gap-1 text-sm font-medium text-foreground hover:underline"
                          >
                            <span className="truncate">{c.handle}</span>
                            <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                            <span className="sr-only">(mở tab mới)</span>
                          </a>
                          <p className="text-xs text-muted-foreground">{formatFollowers(c.followers)} người theo dõi</p>
                        </div>
                        <ChannelBadge badge={c.badge} expiresAt={c.badgeExpiresAt} />
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Liên hệ hợp tác">
                {profile.collabEmail ? (
                  <div className="flex items-center gap-2">
                    <Mail className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <a href={`mailto:${profile.collabEmail}`} className="min-w-0 truncate text-sm text-primary hover:underline">
                      {profile.collabEmail}
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      aria-label="Sao chép email hợp tác"
                      onClick={() => void copy(profile.collabEmail!, 'Đã sao chép email')}
                    >
                      <Copy className="size-3.5" aria-hidden />
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Chưa cung cấp</p>
                )}
              </Section>
            </>
          )}
        </div>

        {kolId && !notFound && (
          <div className="border-t border-border bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <Button
              type="button"
              className="h-11 w-full"
              disabled={!profile || loading}
              onClick={() => onSave(kolId)}
            >
              {saved ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />}
              {saved ? 'Đã lưu · Sửa danh sách' : 'Lưu vào danh sách'}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

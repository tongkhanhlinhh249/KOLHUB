import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  CheckCircle2,
  Copy,
  FileText,
  Link2,
  Mail,
  MapPin,
  Megaphone,
  RotateCcw,
  ShieldCheck,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Skeleton } from '../../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { KolhubError, searchService, type KolPublicProfile } from '../../services';
import { formatDate, formatFollowers } from './format';
import { KolAvatar } from './KolCard';
import { FieldBadges } from './KolMedia';
import { PlatformIcon, platformLabel } from './PlatformIcon';
import { ListingStatusBadge } from './StatusBadges';
import { ChannelVideos } from './ChannelVideos';

interface KolProfileSheetProps {
  kolId: string | null;
  saved: boolean;
  onOpenChange(open: boolean): void;
  /** `name` is passed along so callers can title the save dialog without looking the KOL up. */
  onSave(kolId: string, name?: string): void;
  /** "Mời vào chiến dịch" (campaign booking beta); hidden when not given. */
  onInvite?(kolId: string, name?: string): void;
}

async function copy(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
  } catch {
    toast.error('Không sao chép được. Vui lòng thử lại.');
  }
}

/** "Chi tiết" tab section (legacy drawer: bold heading, content below). */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

/** "Hồ sơ" tab panel (legacy drawer: muted rounded block with icon + title). */
function Panel({ icon: Icon, title, children }: { icon: typeof User; title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg bg-muted/50 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="size-4 text-primary" aria-hidden />
        {title}
      </h3>
      {children}
    </section>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-primary/20 bg-primary/5 p-3">
      <dt className="truncate text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 min-w-0">
        <span className="block text-lg font-bold text-foreground sm:text-xl">{value}</span>
        {hint && <span className="block truncate text-xs text-muted-foreground">{hint}</span>}
      </dd>
    </div>
  );
}

/** "Số liệu chung": one column per card from sm (2 on mobile). Static classes so Tailwind keeps them. */
function statCols(n: number): string {
  return ['sm:grid-cols-1', 'sm:grid-cols-2', 'sm:grid-cols-3', 'sm:grid-cols-4', 'sm:grid-cols-5'][Math.min(Math.max(n, 1), 5) - 1];
}

type TabKey = 'details' | 'profile';

const TAB_TRIGGER =
  'relative h-11 flex-none gap-2 rounded-none border-0 bg-transparent px-1 pb-3 pt-2 text-sm font-medium text-muted-foreground shadow-none hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:bottom-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-primary';

/**
 * SCR-10 — public KOL profile for Brand/Agency, laid out like the legacy InfluencerDrawer
 * (header block with avatar, name, medals; underline tabs "Chi tiết" / "Hồ sơ").
 * Only KolPublicProfile fields are rendered (BR-58): no personal info, booking price/services,
 * violations, livestream course, phone/address, and no messaging/booking actions.
 */
export function KolProfileSheet({ kolId, saved, onOpenChange, onSave, onInvite }: KolProfileSheetProps) {
  const [profile, setProfile] = useState<KolPublicProfile | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<TabKey>('details');

  const load = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    setTab('details');
  }, [kolId]);

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
  const ready = profile && !loading ? profile : null;

  return (
    <Sheet open={kolId !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl lg:max-w-[800px]">
        <SheetHeader className="sr-only">
          <SheetTitle>{profile ? `Hồ sơ ${profile.displayName}` : 'Hồ sơ KOL'}</SheetTitle>
          <SheetDescription>Thông tin công khai của KOL đã xác thực.</SheetDescription>
        </SheetHeader>

        {loading && (
          <div className="min-h-0 flex-1 overflow-y-auto" aria-busy="true" aria-label="Đang tải hồ sơ">
            <div className="flex items-start gap-4 border-b border-border bg-muted/50 px-4 pt-12 pb-6 sm:px-6 sm:pt-6">
              <Skeleton className="size-16 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-7 w-24 rounded-full" />
                  <Skeleton className="h-7 w-20 rounded-full" />
                </div>
              </div>
            </div>
            <div className="space-y-4 p-4 sm:p-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
              <div className="space-y-3">
                {[0, 1].map((i) => (
                  <Skeleton key={i} className="h-[4.5rem] rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        )}

        {error != null && !loading && (
          <div className="min-h-0 flex-1 overflow-y-auto p-4 pt-12 sm:p-6 sm:pt-12">
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
          </div>
        )}

        {ready && (
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="flex min-h-0 flex-1 flex-col gap-0">
            {/* Header block — legacy drawer: muted band, avatar, name + badges, location, medals, tabs */}
            <div className="shrink-0 border-b border-border bg-muted/50 px-4 pt-12 sm:px-6 sm:pt-6">
              <div className="flex items-start gap-4 pr-8 sm:pr-10">
                <KolAvatar
                  name={ready.displayName}
                  src={ready.avatar}
                  className="size-14 rounded-xl text-lg sm:size-16 [&>*]:rounded-xl"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <h2 className="truncate text-lg font-semibold text-foreground sm:text-xl">{ready.displayName}</h2>
                    {ready.listingStatus === 'VISIBLE' ? (
                      <ShieldCheck className="size-5 shrink-0 text-primary" role="img" aria-label="Đã xác thực" />
                    ) : (
                      <ListingStatusBadge status={ready.listingStatus} />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
                    <span className="truncate">@{ready.nickname}</span>
                    <span aria-hidden>·</span>
                    <span>KOL ID: {ready.kolId}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="-my-2 size-9"
                      aria-label="Sao chép KOL ID"
                      onClick={() => void copy(ready.kolId, 'Đã sao chép KOL ID')}
                    >
                      <Copy className="size-3.5" aria-hidden />
                    </Button>
                  </div>
                  {ready.region && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="size-3.5 shrink-0" aria-hidden />
                      {ready.region}
                    </p>
                  )}
                </div>
              </div>
              {ready.fields.length > 0 && <FieldBadges fields={ready.fields} className="mt-3" />}

              <TabsList className="mt-4 h-auto w-full justify-start gap-6 rounded-none bg-transparent p-0">
                <TabsTrigger value="details" className={TAB_TRIGGER}>
                  <FileText className="size-4" aria-hidden />
                  Chi tiết
                </TabsTrigger>
                <TabsTrigger value="profile" className={TAB_TRIGGER}>
                  <User className="size-4" aria-hidden />
                  Hồ sơ
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {ready.listingStatus !== 'VISIBLE' && (
                <div className="px-4 pt-4 sm:px-6 sm:pt-6">
                  <Alert>
                    <AlertCircle className="size-4" aria-hidden />
                    <AlertDescription>
                      {ready.listingStatus === 'BADGE_EXPIRED'
                        ? 'KOL hiện không còn kênh mang dấu còn hiệu lực.'
                        : 'KOL đang tạm ngừng hoạt động các kênh đã xác thực.'}
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              <TabsContent value="details" className="mt-0 space-y-6 p-4 sm:p-6">
                <Section title="Số liệu chung">
                  <dl className={`grid grid-cols-2 gap-2 sm:gap-3 ${statCols(ready.channels.length + 1)}`}>
                    <StatCard
                      label="Tổng người theo dõi"
                      value={formatFollowers(ready.totalFollowers)}
                      hint={`${ready.channels.filter((c) => c.badge === 'VERIFIED').length} kênh đã xác thực`}
                    />
                    {ready.channels.map((c) => (
                      <StatCard
                        key={`stat-${c.platform}-${c.url}`}
                        label={platformLabel(c.platform)}
                        value={formatFollowers(c.followers)}
                        hint={
                          <span className="inline-flex max-w-full items-center gap-1">
                            <PlatformIcon platform={c.platform} className="size-3.5" />
                            <span className="truncate">{c.handle}</span>
                          </span>
                        }
                      />
                    ))}
                  </dl>
                </Section>

                <Section title="Video mới nhất">
                  <ChannelVideos key={ready.kolId} channels={ready.channels} kolName={ready.displayName} />
                </Section>
              </TabsContent>

              <TabsContent value="profile" className="mt-0 space-y-5 p-4 sm:p-6">
                <Panel icon={FileText} title="Giới thiệu">
                  <p className={`text-sm whitespace-pre-line ${ready.bio ? 'text-foreground/80' : 'italic text-muted-foreground'}`}>
                    {ready.bio || 'Chưa có giới thiệu.'}
                  </p>
                </Panel>

                <Panel icon={CheckCircle2} title="Thông tin xác thực">
                  <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                    <Info label="Tên hiển thị">{ready.displayName}</Info>
                    <Info label="Trạng thái">
                      <ListingStatusBadge status={ready.listingStatus} />
                    </Info>
                    <Info label="Xác thực lần đầu">{formatDate(ready.verifiedAt)}</Info>
                    <Info label="KOL ID">{ready.kolId}</Info>
                  </dl>
                </Panel>

                <Panel icon={Briefcase} title="Thông tin nghề nghiệp">
                  <dl className="space-y-3">
                    <Info label="Lĩnh vực hoạt động">
                      {ready.fields.length > 0 ? <FieldBadges fields={ready.fields} className="mt-1" /> : '—'}
                    </Info>
                    <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                      <Info label="Khu vực">{ready.region ?? '—'}</Info>
                      <Info label="Tổng người theo dõi">{ready.totalFollowers.toLocaleString('vi-VN')}</Info>
                    </div>
                  </dl>
                </Panel>

                <Panel icon={Link2} title="Link mạng xã hội">
                  {ready.channels.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Chưa có kênh công khai.</p>
                  ) : (
                    <ul className="space-y-1">
                      {ready.channels.map((c) => (
                        <li key={`link-${c.platform}-${c.url}`} className="flex items-center justify-between gap-3">
                          <span className="inline-flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                            <PlatformIcon platform={c.platform} className="size-4" />
                            {platformLabel(c.platform)}
                          </span>
                          <span className="flex min-w-0 items-center gap-1">
                            <a
                              href={`https://${c.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate text-xs text-foreground hover:underline"
                            >
                              {c.url}
                              <span className="sr-only"> (mở tab mới)</span>
                            </a>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-9 shrink-0"
                              aria-label={`Sao chép link ${platformLabel(c.platform)}`}
                              onClick={() => void copy(`https://${c.url}`, 'Đã sao chép link')}
                            >
                              <Copy className="size-3.5" aria-hidden />
                            </Button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>

                <Panel icon={Mail} title="Liên hệ hợp tác">
                  {ready.collabEmail ? (
                    <div className="flex items-center gap-2">
                      <a href={`mailto:${ready.collabEmail}`} className="min-w-0 truncate text-sm text-primary hover:underline">
                        {ready.collabEmail}
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 shrink-0"
                        aria-label="Sao chép email hợp tác"
                        onClick={() => void copy(ready.collabEmail!, 'Đã sao chép email')}
                      >
                        <Copy className="size-3.5" aria-hidden />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Chưa cung cấp</p>
                  )}
                </Panel>
              </TabsContent>
            </div>
          </Tabs>
        )}

        {kolId && !notFound && (
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-6">
            {onInvite && (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full sm:w-auto sm:px-5"
                disabled={!profile || loading}
                onClick={() => onInvite(kolId, profile?.displayName)}
              >
                <Megaphone aria-hidden />
                Mời vào chiến dịch
              </Button>
            )}
            <Button
              type="button"
              className="h-11 w-full sm:w-auto sm:px-6"
              disabled={!profile || loading}
              onClick={() => onSave(kolId, profile?.displayName)}
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

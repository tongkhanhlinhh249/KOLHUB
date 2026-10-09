import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, ChevronDown, Globe2, ImagePlus, Loader2, Plus, RefreshCw, Send, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Skeleton } from '../../components/ui/skeleton';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../components/ui/utils';
import {
  campaignService,
  CAMPAIGN_NAME_MAX,
  CAMPAIGN_TEXT_MAX,
  DELIVERABLE_QTY_MAX,
  DELIVERABLE_TYPES,
  KOL_CATEGORIES,
  KolhubError,
  PLATFORMS,
  type CampaignType,
  type CampaignView,
  type DeliverableType,
  type Platform,
  type StoredFile,
} from '../../services';
import { PlatformIcon } from '../biz-search/PlatformIcon';
import { brandLockedView } from '../shared/BrandLocked';
import { CampaignCover } from '../shared/CampaignCover';
import { formatFileSize, toStoredFile } from '../shared/files';
import { fieldIcon } from '../shared/fieldIcons';
import { CampaignStatusBadge, errText, LoadError } from './CampaignParts';
import { ChipGroup, ChipToggle, FormRow, Section } from './FormParts';
import { CampaignFeatures } from './FeatureCards';
import { RecruitSection, TypeSection } from './RecruitFormSections';
import {
  ADVANCED_FIELDS,
  COVER_ACCEPT,
  coverFileError,
  EMPTY_FORM,
  fieldErrorText,
  formFromCampaign,
  formToInput,
  isFormField,
  newDeliverable,
  toggle,
  type CampaignFormValues,
  type DeliverableRow,
  type FormField,
} from './campaignForm';
import { CampaignTypeDialog, TYPE_PARAM, typeFromParam } from './CampaignTypeDialog';
import { campaignPath, CAMPAIGNS_PATH, formatVndInput } from './campaignView';

const fieldId = (f: FormField) => `cf-${f}`;

/** Booking riêng: every platform is offered in a deliverable row (there is no separate platform picker). */
const ALL_PLATFORM_KEYS: Platform[] = PLATFORMS.map((p) => p.key);

/** A new deliverable row reuses the platform of the last row (TikTok when there is none). */
const lastPlatforms = (rows: DeliverableRow[]): Platform[] => (rows.length ? [rows[rows.length - 1].platform] : []);

/** One line of the current advanced settings, shown while "Tính năng nâng cao" is collapsed. */
function advancedSummary(v: CampaignFormValues): string {
  return [
    `Đàm phán: ${v.negotiation ? 'bật' : 'tắt'}`,
    `Duyệt nháp: ${v.draftReview ? 'bật' : 'tắt'}`,
    `Hợp đồng: ${v.contract ? 'bật' : 'tắt'}`,
    ...(v.useContentRules ? ['Có quy định nội dung'] : []),
  ].join(' · ');
}

/**
 * "Tính năng nâng cao" of a Booking riêng form: collapsed by default with a one-line summary of the current
 * settings; opens on demand or when the service reports an error on a field inside it.
 */
function AdvancedBlock({ open, onOpenChange, summary, children }: { open: boolean; onOpenChange(open: boolean): void; summary: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-controls={`${id}-body`}
        className="flex w-full items-start gap-3 rounded-xl p-4 text-left hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <SlidersHorizontal className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 space-y-0.5">
          <span id={`${id}-title`} className="block text-base font-semibold text-foreground">
            Tính năng nâng cao
          </span>
          <span className="block text-sm text-muted-foreground">
            {open ? 'Đàm phán, duyệt nháp, hợp đồng, quy định nội dung.' : summary}
          </span>
        </span>
        <ChevronDown className={cn('mt-2 size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div id={`${id}-body`} className="space-y-5 border-t border-border px-4 py-4">
          {children}
        </div>
      )}
    </section>
  );
}

function DeliverableEditor({
  row,
  index,
  platforms,
  onChange,
  onRemove,
}: {
  row: DeliverableRow;
  index: number;
  platforms: Platform[];
  onChange(row: DeliverableRow): void;
  onRemove(): void;
}) {
  const baseId = useId();
  // The platform list offers the selected platforms, plus the row's own value if it was deselected meanwhile.
  const options = PLATFORMS.filter((p) => platforms.includes(p.key) || p.key === row.platform);
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 rounded-[8px] border border-border p-3 @xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6rem_auto] @xl:items-end">
      <div className="space-y-1">
        <Label htmlFor={`${baseId}-type`} className="text-xs text-muted-foreground">
          Loại nội dung
        </Label>
        <Select value={row.type} onValueChange={(v) => onChange({ ...row, type: v as DeliverableType })}>
          <SelectTrigger id={`${baseId}-type`} className="h-11 w-full bg-card md:h-10" aria-label={`Loại nội dung hạng mục ${index + 1}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DELIVERABLE_TYPES.map((d) => (
              <SelectItem key={d.key} value={d.key}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${baseId}-platform`} className="text-xs text-muted-foreground">
          Nền tảng
        </Label>
        <Select value={row.platform} onValueChange={(v) => onChange({ ...row, platform: v as Platform })}>
          <SelectTrigger id={`${baseId}-platform`} className="h-11 w-full bg-card md:h-10" aria-label={`Nền tảng hạng mục ${index + 1}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((p) => (
              <SelectItem key={p.key} value={p.key}>
                <span className="inline-flex items-center gap-2">
                  <PlatformIcon platform={p.key} />
                  {p.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${baseId}-qty`} className="text-xs text-muted-foreground">
          Số lượng
        </Label>
        <Input
          id={`${baseId}-qty`}
          inputMode="numeric"
          value={row.quantity}
          onChange={(e) => onChange({ ...row, quantity: e.target.value.replace(/\D/g, '').slice(0, 3) })}
          className="h-11 bg-card md:h-10"
          aria-label={`Số lượng hạng mục ${index + 1} (1–${DELIVERABLE_QTY_MAX})`}
        />
      </div>
      <div className="flex items-end justify-end">
        <Button
          type="button"
          variant="ghost"
          className="h-11 text-muted-foreground hover:text-destructive md:h-10"
          onClick={onRemove}
          aria-label={`Xoá hạng mục ${index + 1}`}
        >
          <Trash2 aria-hidden />
          <span className="@xl:sr-only">Xoá</span>
        </Button>
      </div>
    </li>
  );
}

/**
 * "Ảnh chiến dịch": 16:9 preview with "Đổi ảnh" / "Xoá ảnh", or a 16:9 drop zone. Picked files are checked
 * (JPG/PNG/WebP ≤ 10 MB) and turned into a StoredFile with a ≤ 960 px JPEG thumbnail.
 */
function CoverField({
  id,
  value,
  error,
  onChange,
  onError,
}: {
  id: string;
  value: StoredFile | null;
  error?: string;
  onChange(v: StoredFile | null): void;
  onError(message: string): void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const pick = async (file: File | undefined) => {
    if (!file) return;
    const bad = coverFileError(file);
    if (bad) {
      onError(bad);
      return;
    }
    setReading(true);
    try {
      onChange(await toStoredFile(file, { maxSide: 960 }));
    } finally {
      setReading(false);
      if (input.current) input.current.value = '';
    }
  };
  const browse = () => input.current?.click();

  return (
    <div className="space-y-2">
      <input
        ref={input}
        type="file"
        accept={COVER_ACCEPT}
        hidden
        tabIndex={-1}
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      {value ? (
        <div className="space-y-2">
          <CampaignCover
            cover={value}
            alt="Ảnh chiến dịch đã chọn"
            className="aspect-video w-full max-w-md rounded-[8px] border border-border"
          />
          <div className="flex max-w-md flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={value.name}>
              {value.name} · {formatFileSize(value.size)}
            </p>
            <Button id={id} type="button" variant="outline" className="h-11 md:h-9" onClick={browse} disabled={reading} aria-describedby={error ? errorId : hintId}>
              {reading ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
              Đổi ảnh
            </Button>
            <Button type="button" variant="ghost" className="h-11 text-muted-foreground hover:text-destructive md:h-9" onClick={() => onChange(null)} disabled={reading}>
              <Trash2 aria-hidden />
              Xoá ảnh
            </Button>
          </div>
        </div>
      ) : (
        <button
          id={id}
          type="button"
          onClick={browse}
          disabled={reading}
          aria-describedby={error ? errorId : hintId}
          aria-invalid={!!error || undefined}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void pick(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            'flex aspect-video w-full max-w-md flex-col items-center justify-center gap-2 rounded-[8px] border-2 border-dashed p-4 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            error ? 'border-destructive/60' : dragOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/40 hover:bg-muted',
          )}
        >
          {reading ? (
            <Loader2 className="size-7 animate-spin text-muted-foreground" aria-hidden />
          ) : (
            <ImagePlus className="size-7 text-muted-foreground" aria-hidden />
          )}
          <span className="text-sm font-medium text-foreground">{reading ? 'Đang xử lý ảnh…' : 'Tải ảnh lên'}</span>
          <span className="text-xs text-muted-foreground">Bấm để chọn hoặc kéo thả ảnh vào đây</span>
        </button>
      )}
      {error ? (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : (
        <p id={hintId} className="text-xs text-muted-foreground">
          JPG, PNG hoặc WebP, tối đa 10 MB. Nên dùng ảnh ngang tỉ lệ 16:9 (ví dụ 1600×900).
        </p>
      )}
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6" aria-busy="true" aria-label="Đang tải chiến dịch">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="gap-3 p-4 md:p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
        </Card>
      ))}
    </div>
  );
}

/**
 * /chien-dich/tao and /chien-dich/:id/sua — campaign form. Only the name is needed for a draft;
 * "Đăng chiến dịch" saves then publishes, and the service's KOLHUB-4803 `field` is shown under that field.
 */
/** New campaign of the chosen type: empty form with one default deliverable row (Video · TikTok · 1) ready to edit. */
const newForm = (type: CampaignType = 'BOOKING'): CampaignFormValues => ({ ...EMPTY_FORM, type, deliverables: [newDeliverable([])] });

export function CampaignFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const typeParam = typeFromParam(searchParams.get('loai'));
  // New campaign opened without a type (e.g. an old link): ask for it first, like the "Tạo chiến dịch" button.
  const [typeDialog, setTypeDialog] = useState(!id && !typeParam);
  const [loaded, setLoaded] = useState<CampaignView | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [values, setValues] = useState<CampaignFormValues>(() => newForm(typeParam));
  const [errors, setErrors] = useState<Partial<Record<FormField, string>>>({});
  const [busy, setBusy] = useState<'draft' | 'publish' | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  /** Id once saved (a new campaign becomes a draft on its first save; later saves update it). */
  const savedId = useRef<string | undefined>(id);

  useEffect(() => {
    savedId.current = id;
    if (!id) {
      setValues(newForm(typeParam));
      setLoaded(null);
      return;
    }
    let alive = true;
    setLoadError(null);
    setLoaded(null);
    campaignService
      .get(id)
      .then((c) => {
        if (!alive) return;
        setLoaded(c);
        setValues(formFromCampaign(c));
      })
      .catch((e) => alive && setLoadError(e));
    return () => {
      alive = false;
    };
  }, [id, attempt]);

  const set = <K extends keyof CampaignFormValues>(key: K, value: CampaignFormValues[K], clears?: FormField) => {
    setValues((v) => ({ ...v, [key]: value }));
    const f = clears ?? (isFormField(key) ? key : undefined);
    if (f && errors[f]) setErrors((e) => ({ ...e, [f]: undefined }));
  };

  if (loadError) {
    return brandLockedView(loadError) ?? (
      <div className="mx-auto w-full max-w-3xl space-y-4 p-4 md:p-6">
        <LoadError message={errText(loadError)} onRetry={loadError instanceof KolhubError && loadError.code === 'KOLHUB-4801' ? undefined : () => setAttempt((n) => n + 1)} />
        <Link to={CAMPAIGNS_PATH} className={buttonVariants({ variant: 'outline', className: 'h-11' })}>
          <ArrowLeft aria-hidden />
          Về danh sách chiến dịch
        </Link>
      </div>
    );
  }
  if (id && !loaded) return <FormSkeleton />;

  const status = loaded?.status ?? 'DRAFT';
  const editable = status === 'DRAFT' || status === 'OPEN';
  const isOpen = status === 'OPEN';
  const recruit = values.type === 'OPEN_RECRUITMENT';
  const typeLocked = (loaded?.stats.total ?? 0) > 0;

  const showError = (e: unknown) => {
    const raw = e instanceof KolhubError && e.code === 'KOLHUB-4803' ? e.meta?.field : undefined;
    // Booking riêng has no platform picker: "no platform" means "no deliverable".
    const field = !recruit && raw === 'platforms' ? 'deliverables' : raw;
    if (isFormField(field)) {
      // The hint follows the field the service named (e.g. "platforms" → add a deliverable).
      setErrors({ [field]: fieldErrorText(raw ?? field, (e as Error).message) });
      const inAdvanced = !recruit && ADVANCED_FIELDS.includes(field);
      if (inAdvanced) setAdvancedOpen(true);
      // Wait one frame when the advanced block has to open first.
      requestAnimationFrame(() => {
        const el = document.getElementById(fieldId(field));
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus({ preventScroll: true });
      });
      toast.error('Vui lòng kiểm tra lại thông tin', { description: (e as Error).message });
    } else {
      toast.error(errText(e));
    }
  };

  const save = async (publish: boolean) => {
    setBusy(publish ? 'publish' : 'draft');
    setErrors({});
    try {
      const input = formToInput(values);
      let view: CampaignView;
      if (savedId.current) view = await campaignService.update(savedId.current, input);
      else view = await campaignService.create(input);
      savedId.current = view.id;
      if (publish) {
        view = await campaignService.publish(view.id);
        toast.success('Đã đăng chiến dịch', {
          description:
            view.visibility === 'MARKETPLACE' ? 'Chiến dịch đang mở và hiển thị trên Sàn chiến dịch.' : 'Chiến dịch đang mở. Hãy mời KOL để bắt đầu.',
        });
      } else {
        toast.success(isOpen ? 'Đã lưu thay đổi' : 'Đã lưu bản nháp');
      }
      navigate(campaignPath(view.id), { replace: !id });
    } catch (e) {
      showError(e);
    } finally {
      setBusy(null);
    }
  };

  const cancelHref = id ? campaignPath(id) : CAMPAIGNS_PATH;
  // A new campaign keeps its type in the URL (?loai=) so a reload opens the same form.
  const pickType = (t: CampaignType) => {
    set('type', t);
    if (!id) setSearchParams({ loai: TYPE_PARAM[t] }, { replace: true });
  };

  return (
    <form
      className="mx-auto w-full max-w-6xl space-y-4 p-4 pb-28 md:p-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save(false);
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <label htmlFor={fieldId('name')} className="sr-only">
            Tên chiến dịch
          </label>
          <input
            id={fieldId('name')}
            value={values.name}
            maxLength={CAMPAIGN_NAME_MAX}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Hãy đặt tên cho chiến dịch"
            aria-invalid={!!errors.name || undefined}
            aria-describedby={errors.name ? `${fieldId('name')}-error` : `${fieldId('name')}-hint`}
            disabled={!editable || busy !== null}
            className="w-full min-w-0 bg-transparent text-xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/45 focus-visible:ring-0 sm:text-2xl md:text-3xl"
          />
          {errors.name ? (
            <p id={`${fieldId('name')}-error`} className="text-xs text-destructive" role="alert">
              {errors.name}
            </p>
          ) : (
            <p id={`${fieldId('name')}-hint`} className="text-sm text-muted-foreground">
              {!id
                ? 'Không có gì được lưu lại cho đến khi bạn lưu nháp hoặc đăng chiến dịch.'
                : isOpen
                  ? 'Chiến dịch đang mở: thông tin phải luôn đủ điều kiện đăng.'
                  : 'Bản nháp: lưu bất cứ lúc nào, đăng khi đã đủ thông tin.'}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {loaded && <CampaignStatusBadge status={loaded.status} />}
          <Link to={cancelHref} className={buttonVariants({ variant: 'ghost', className: 'h-11 md:h-9' })}>
            <X aria-hidden />
            Đóng
          </Link>
        </div>
      </div>

      {!editable && (
        <LoadError message="Chiến dịch không còn ở trạng thái cho phép sửa (chỉ sửa khi Bản nháp hoặc Đang mở)." />
      )}

      <fieldset
        disabled={!editable || busy !== null}
        className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-6"
      >
        <div className="min-w-0 lg:col-span-2">
          <TypeSection value={values.type} onChange={pickType} locked={typeLocked} error={errors.type} />
        </div>

        {/* Side column (above the sections on phones): cover image, sticky while the long form scrolls. */}
        <aside className="min-w-0 lg:sticky lg:top-4 lg:order-2" aria-label="Ảnh chiến dịch">
          <Section title="Ảnh chiến dịch" description="Hiện trên thẻ chiến dịch ở Sàn và trong danh sách của bạn. Không bắt buộc.">
            <CoverField
              id={fieldId('cover')}
              value={values.cover}
              error={errors.cover}
              onChange={(v) => set('cover', v)}
              onError={(message) => setErrors((e) => ({ ...e, cover: message }))}
            />
          </Section>
        </aside>

        <div className="min-w-0 space-y-4 lg:order-1">

        {recruit ? (
          <>
            <RecruitSection values={values} set={set} errors={errors} />
            <Section title="Nền tảng và lĩnh vực">
              <FormRow id={fieldId('platforms')} label="Nền tảng" error={errors.platforms} hint="Chọn một hoặc nhiều nền tảng.">
                {(d) => (
                  <ChipGroup id={fieldId('platforms')} label="Nền tảng" describedBy={d} invalid={!!errors.platforms}>
                    {PLATFORMS.map((p) => (
                      <ChipToggle key={p.key} pressed={values.platforms.includes(p.key)} onClick={() => set('platforms', toggle(values.platforms, p.key))}>
                        <PlatformIcon platform={p.key} />
                        {p.label}
                      </ChipToggle>
                    ))}
                  </ChipGroup>
                )}
              </FormRow>
              <FormRow id={fieldId('categories')} label="Lĩnh vực" optional error={errors.categories} hint="Giúp KOL/MCN trên Sàn tìm thấy chiến dịch phù hợp.">
                {(d) => (
                  <ChipGroup id={fieldId('categories')} label="Lĩnh vực" describedBy={d} invalid={!!errors.categories}>
                    {KOL_CATEGORIES.map((cat) => {
                      const Icon = fieldIcon(cat);
                      return (
                        <ChipToggle key={cat} pressed={values.categories.includes(cat)} onClick={() => set('categories', toggle(values.categories, cat))}>
                          <Icon className="size-4 shrink-0" aria-hidden />
                          {cat}
                        </ChipToggle>
                      );
                    })}
                  </ChipGroup>
                )}
              </FormRow>
            </Section>

            <Section title="Hạng mục nội dung" description="Những gì KOL cần sản xuất, ví dụ 3 video TikTok và 1 bài đăng Facebook.">
              <div id={fieldId('deliverables')} tabIndex={-1} className="@container space-y-3 focus-visible:outline-none">
                {values.deliverables.length > 0 && (
                  <ul className="space-y-2" aria-label="Hạng mục nội dung">
                    {values.deliverables.map((row, i) => (
                      <DeliverableEditor
                        key={i}
                        row={row}
                        index={i}
                        platforms={values.platforms}
                        onChange={(next) => set('deliverables', values.deliverables.map((r, j) => (j === i ? next : r)))}
                        onRemove={() => set('deliverables', values.deliverables.filter((_, j) => j !== i))}
                      />
                    ))}
                  </ul>
                )}
                {errors.deliverables && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.deliverables}
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 md:h-9"
                  onClick={() => set('deliverables', [...values.deliverables, newDeliverable(values.platforms)])}
                >
                  <Plus aria-hidden />
                  Thêm hạng mục
                </Button>
              </div>
            </Section>

            <Section title="Hiển thị">
              <p className="flex items-start gap-2 text-sm text-foreground">
                <Globe2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                Chiến dịch Tuyển nhiều KOL luôn hiển thị trên Sàn chiến dịch và nhận ứng tuyển trong giai đoạn Ứng tuyển.
              </p>
            </Section>

            <CampaignFeatures values={values} set={set} errors={errors} />
          </>
        ) : (
          <>
            <Section title="Nội dung cần làm" description="KOL làm theo các hạng mục và brief này. Nền tảng của chiến dịch lấy theo hạng mục.">
              <div id={fieldId('deliverables')} tabIndex={-1} className="@container space-y-3 focus-visible:outline-none">
                {values.deliverables.length > 0 && (
                  <ul className="space-y-2" aria-label="Hạng mục nội dung">
                    {values.deliverables.map((row, i) => (
                      <DeliverableEditor
                        key={i}
                        row={row}
                        index={i}
                        platforms={ALL_PLATFORM_KEYS}
                        onChange={(next) => set('deliverables', values.deliverables.map((r, j) => (j === i ? next : r)))}
                        onRemove={() => set('deliverables', values.deliverables.filter((_, j) => j !== i))}
                      />
                    ))}
                  </ul>
                )}
                {errors.deliverables && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.deliverables}
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 md:h-9"
                  onClick={() => set('deliverables', [...values.deliverables, newDeliverable(lastPlatforms(values.deliverables))])}
                >
                  <Plus aria-hidden />
                  Thêm hạng mục
                </Button>
              </div>

              <FormRow
                id={fieldId('brief')}
                label="Brief"
                error={errors.brief}
                hint={`Thông điệp chính, câu chuyện, điểm cần nhấn mạnh. Bắt buộc khi tạo chiến dịch. ${[...values.brief].length.toLocaleString('vi-VN')}/${CAMPAIGN_TEXT_MAX.toLocaleString('vi-VN')}`}
              >
                {(d) => (
                  <Textarea
                    id={fieldId('brief')}
                    value={values.brief}
                    maxLength={CAMPAIGN_TEXT_MAX}
                    rows={5}
                    onChange={(e) => set('brief', e.target.value)}
                    placeholder="VD: Giới thiệu sữa hạt vị mới cho gia đình trẻ, nhấn mạnh ít đường, quay cảnh bữa sáng"
                    aria-invalid={!!errors.brief || undefined}
                    aria-describedby={d}
                  />
                )}
              </FormRow>

            </Section>

            <Section title="Ngân sách và thời gian">
              <FormRow id={fieldId('budget')} label="Ngân sách (VND)" error={errors.budget} hint="Tổng ngân sách dự kiến cho chiến dịch.">
                {(d) => (
                  <div className="relative">
                    <Input
                      id={fieldId('budget')}
                      inputMode="numeric"
                      value={values.budget}
                      onChange={(e) => set('budget', formatVndInput(e.target.value))}
                      placeholder="VD: 100.000.000"
                      aria-invalid={!!errors.budget || undefined}
                      aria-describedby={d}
                      className="h-11 pr-10 tabular-nums md:h-10"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground" aria-hidden>
                      ₫
                    </span>
                  </div>
                )}
              </FormRow>
              <FormRow id={fieldId('dates')} label="Thời gian chạy" error={errors.dates}>
                {(d) => (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor={fieldId('dates')} className="text-xs font-normal text-muted-foreground">
                        Ngày bắt đầu
                      </Label>
                      <Input
                        id={fieldId('dates')}
                        type="date"
                        value={values.startDate}
                        onChange={(e) => set('startDate', e.target.value, 'dates')}
                        aria-invalid={!!errors.dates || undefined}
                        aria-describedby={d}
                        className="h-11 md:h-10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="cf-endDate" className="text-xs font-normal text-muted-foreground">
                        Ngày kết thúc
                      </Label>
                      <Input
                        id="cf-endDate"
                        type="date"
                        value={values.endDate}
                        min={values.startDate || undefined}
                        onChange={(e) => set('endDate', e.target.value, 'dates')}
                        aria-invalid={!!errors.dates || undefined}
                        aria-describedby={d}
                        className="h-11 md:h-10"
                      />
                    </div>
                  </div>
                )}
              </FormRow>
            </Section>

            <AdvancedBlock open={advancedOpen} onOpenChange={setAdvancedOpen} summary={advancedSummary(values)}>
              <FormRow id={fieldId('objective')} label="Mục tiêu" optional error={errors.objective}>
                {(d) => (
                  <Textarea
                    id={fieldId('objective')}
                    value={values.objective}
                    maxLength={CAMPAIGN_TEXT_MAX}
                    rows={2}
                    onChange={(e) => set('objective', e.target.value)}
                    placeholder="VD: Tăng nhận biết sản phẩm với nhóm gia đình trẻ"
                    aria-invalid={!!errors.objective || undefined}
                    aria-describedby={d}
                  />
                )}
              </FormRow>

              <div className="space-y-3">
                {values.visibility === 'MARKETPLACE' && (
                  <FormRow
                    id={fieldId('applyDeadline')}
                    label="Hạn ứng tuyển"
                    optional
                    error={errors.applyDeadline}
                    hint="Sau ngày này chiến dịch không nhận đề xuất mới. Để trống: nhận đến khi kết thúc."
                  >
                    {(d) => (
                      <Input
                        id={fieldId('applyDeadline')}
                        type="date"
                        value={values.applyDeadline}
                        max={values.endDate || undefined}
                        onChange={(e) => set('applyDeadline', e.target.value)}
                        aria-invalid={!!errors.applyDeadline || undefined}
                        aria-describedby={d}
                        className="h-11 sm:max-w-60 md:h-10"
                      />
                    )}
                  </FormRow>
                )}

                {values.visibility === 'MARKETPLACE' && (
                  <>
                  <FormRow id={fieldId('categories')} label="Lĩnh vực" optional error={errors.categories} hint="Giúp KOL/MCN trên Sàn tìm thấy chiến dịch phù hợp.">
                    {(d) => (
                      <ChipGroup id={fieldId('categories')} label="Lĩnh vực" describedBy={d} invalid={!!errors.categories}>
                        {KOL_CATEGORIES.map((cat) => {
                          const Icon = fieldIcon(cat);
                          return (
                            <ChipToggle key={cat} pressed={values.categories.includes(cat)} onClick={() => set('categories', toggle(values.categories, cat))}>
                              <Icon className="size-4 shrink-0" aria-hidden />
                              {cat}
                            </ChipToggle>
                          );
                        })}
                      </ChipGroup>
                    )}
                  </FormRow>

                  </>
                )}
              </div>
              <CampaignFeatures values={values} set={set} errors={errors} variant="advanced" />
            </AdvancedBlock>
          </>
        )}
        </div>
      </fieldset>

      <CampaignTypeDialog
        open={typeDialog}
        onOpenChange={setTypeDialog}
        onPick={pickType}
      />

      {editable && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:sticky md:bottom-0 md:-mx-6 md:rounded-b-[8px]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3 md:px-6">
            <p className="hidden min-w-0 flex-1 text-sm text-muted-foreground sm:block" aria-live="polite">
              {!values.name.trim()
                ? 'Hãy đặt tên cho chiến dịch của bạn để bắt đầu tạo.'
                : isOpen
                  ? 'Lưu thay đổi khi xong.'
                  : 'Lưu nháp để làm tiếp sau, hoặc đăng khi đã đủ thông tin.'}
            </p>
            <div className="grid w-full grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-2 sm:ml-auto sm:flex sm:w-auto">
              <Link to={cancelHref} className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-10' })}>
                Huỷ bỏ
              </Link>
              <Button type="submit" variant={isOpen ? 'default' : 'outline'} className="h-11 md:h-10" disabled={busy !== null || !values.name.trim()}>
                {busy === 'draft' && <Loader2 className="animate-spin" aria-hidden />}
                {isOpen ? 'Lưu thay đổi' : 'Lưu nháp'}
              </Button>
              {!isOpen && (
                <Button type="button" className="h-11 md:h-10" disabled={busy !== null || !values.name.trim()} onClick={() => void save(true)}>
                  {busy === 'publish' ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
                  <span className="sm:hidden">Đăng</span>
                  <span className="hidden sm:inline">Đăng chiến dịch</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

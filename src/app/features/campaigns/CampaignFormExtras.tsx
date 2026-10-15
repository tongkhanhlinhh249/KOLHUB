import { useId, useRef } from 'react';
import { AlertCircle, CheckCircle2, Eye, FileText, Paperclip, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Switch } from '../../components/ui/switch';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../components/ui/utils';
import {
  CAMPAIGN_TYPE_LABEL,
  DEADLINE_TIME_DEFAULT,
  PROMOTED_BRAND_MAX,
  PROOF_NOTE_MAX,
  USAGE_CHANNELS,
  USAGE_MONTHS_MAX,
  USAGE_NOTE_MAX,
  applyDeadlineAt,
  type CampaignInput,
  type DeliverableGroup,
  type MarketplaceCampaign,
} from '../../services';
import { formatFileSize, toStoredFile } from '../shared/files';
import { CampaignDetailHeader, CampaignDetailSections } from '../supplier-booking/CampaignDetailBody';
import { MarketplaceCampaignCard } from '../supplier-booking/MarketplaceCampaignCard';
import { ChipGroup, ChipToggle, FormRow, Section } from './FormParts';
import { deliverablePlatforms, formToInput, groupRow, toggle, type CampaignFormValues, type FormField } from './campaignForm';
import { fieldId, type Errors, type Setter } from './RecruitFormSections';

// ---------------------------------------------------------------------------
// Bước của form (EP-02 §4): Thông tin chung → Yêu cầu và quyền lợi → Thời gian và hướng dẫn → Xem trước và gửi đăng
// ---------------------------------------------------------------------------

export const FORM_STEPS = ['Thông tin chung', 'Yêu cầu và quyền lợi', 'Thời gian và hướng dẫn', 'Xem trước và gửi đăng'] as const;
export type FormStep = 0 | 1 | 2 | 3;

/** Step that holds a field (an error from the service opens that step). */
export function stepOfField(field: FormField, recruit: boolean): FormStep {
  switch (field) {
    case 'name':
    case 'type':
    case 'cover':
    case 'promotedBrand':
    case 'objective':
    case 'brief':
    case 'categories':
      return 0;
    case 'platforms':
      return recruit ? 0 : 1;
    case 'deliverables':
    case 'groups':
    case 'budget':
    case 'reward':
    case 'product':
    case 'usageRights':
      return 1;
    case 'slots':
      return 1;
    default:
      return 2;
  }
}

/** Numbered step bar; every step can be opened (data stays when moving between steps). */
export function StepBar({ step, onStep }: { step: FormStep; onStep(s: FormStep): void }) {
  return (
    <nav aria-label="Các bước tạo chiến dịch" className="overflow-x-auto">
      <ol className="flex min-w-max items-center gap-2">
        {FORM_STEPS.map((label, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <li key={label} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onStep(i as FormStep)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex h-11 items-center gap-2 rounded-[8px] px-3 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:h-9',
                  active ? 'bg-primary/10 font-semibold text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-xs font-semibold',
                    active ? 'bg-primary text-primary-foreground' : done ? 'bg-chart-4/20 text-foreground' : 'bg-muted text-muted-foreground',
                  )}
                  aria-hidden
                >
                  {i + 1}
                </span>
                {label}
              </button>
              {i < FORM_STEPS.length - 1 && <span className="h-px w-6 bg-border" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Nhãn hàng được quảng bá (EP-02 §4.1)
// ---------------------------------------------------------------------------

const PROOF_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';
const PROOF_MAX = 10 * 1024 * 1024;

export function PromotedBrandSection({ values: v, set, errors, company }: { values: CampaignFormValues; set: Setter; errors: Errors; company?: string }) {
  const id = useId();
  const file = useRef<HTMLInputElement>(null);
  const err = errors.promotedBrand;
  return (
    <Section
      title="Nhãn hàng được quảng bá"
      description="Agency chạy chiến dịch cho khách hàng cần ghi rõ nhãn hàng và căn cứ được phép đại diện để Admin kiểm tra. Agency không tự được coi là chủ thương hiệu."
    >
      <div id={fieldId('promotedBrand')} tabIndex={-1} className="space-y-3 focus-visible:outline-none">
        <RadioGroup value={v.promotedOwn ? 'own' : 'agency'} onValueChange={(x) => set('promotedOwn', x === 'own', 'promotedBrand')} className="gap-2">
          <Label htmlFor={`${id}-own`} className="flex cursor-pointer items-start gap-2 rounded-[8px] border border-border p-3 font-normal has-[[data-state=checked]]:border-primary">
            <RadioGroupItem id={`${id}-own`} value="own" className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium text-foreground">Nhãn hàng của tổ chức tôi</span>
              <span className="block text-xs text-muted-foreground">{company ? `Hiển thị là "${company}" nếu không ghi tên khác.` : 'Hiển thị theo tên tổ chức.'}</span>
            </span>
          </Label>
          <Label htmlFor={`${id}-agency`} className="flex cursor-pointer items-start gap-2 rounded-[8px] border border-border p-3 font-normal has-[[data-state=checked]]:border-primary">
            <RadioGroupItem id={`${id}-agency`} value="agency" className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium text-foreground">Agency quảng bá cho nhãn hàng khác</span>
              <span className="block text-xs text-muted-foreground">Cần tên nhãn hàng và căn cứ đại diện (hợp đồng, giấy uỷ quyền…). Căn cứ chỉ Admin xem, không hiện trên Sàn.</span>
            </span>
          </Label>
        </RadioGroup>

        <FormRow id={`${id}-name`} label="Tên nhãn hàng" optional={v.promotedOwn} error={err}>
          {(d) => (
            <Input
              id={`${id}-name`}
              value={v.promotedName}
              maxLength={PROMOTED_BRAND_MAX}
              onChange={(e) => set('promotedName', e.target.value, 'promotedBrand')}
              placeholder={v.promotedOwn ? company || 'Tên nhãn hàng' : 'VD: Sữa Mộc Châu'}
              aria-invalid={!!err || undefined}
              aria-describedby={d}
              className="h-11 md:h-10"
            />
          )}
        </FormRow>

        {!v.promotedOwn && (
          <div className="space-y-3 rounded-[8px] bg-muted/40 p-3">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">Căn cứ đại diện</p>
              {v.proof ? (
                <div className="flex items-center gap-2 rounded-[8px] border border-border bg-card px-3 py-2 text-sm">
                  <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-foreground">{v.proof.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatFileSize(v.proof.size)}</span>
                  <Button type="button" variant="ghost" size="icon" className="size-11 md:size-8" aria-label="Xoá tệp căn cứ" onClick={() => set('proof', null, 'promotedBrand')}>
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => file.current?.click()}>
                  <Paperclip aria-hidden />
                  Tải tệp căn cứ
                </Button>
              )}
              <input
                ref={file}
                type="file"
                accept={PROOF_ACCEPT}
                className="sr-only"
                tabIndex={-1}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  if (!PROOF_ACCEPT.split(',').includes(f.type) || f.size > PROOF_MAX) return set('proof', null, 'promotedBrand');
                  set('proof', await toStoredFile(f), 'promotedBrand');
                }}
              />
              <p className="text-xs text-muted-foreground">PDF, JPG, PNG hoặc WebP, tối đa 10 MB.</p>
            </div>
            <FormRow id={`${id}-proof-note`} label="Ghi chú cho Admin" optional hint="Dùng khi chưa có tệp, ví dụ số hợp đồng và người liên hệ phía nhãn hàng.">
              {(d) => (
                <Textarea
                  id={`${id}-proof-note`}
                  rows={2}
                  maxLength={PROOF_NOTE_MAX}
                  value={v.proofNote}
                  onChange={(e) => set('proofNote', e.target.value, 'promotedBrand')}
                  aria-describedby={d}
                />
              )}
            </FormRow>
          </div>
        )}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Quyền sử dụng nội dung (EP-02 §4.2)
// ---------------------------------------------------------------------------

export function UsageRightsSection({ values: v, set, errors }: { values: CampaignFormValues; set: Setter; errors: Errors }) {
  const id = useId();
  const err = errors.usageRights;
  return (
    <Section
      title="Quyền sử dụng nội dung"
      description="Khai rõ nếu bạn muốn dùng lại nội dung của KOL ngoài bài đăng gốc. KOL thấy phần này trước khi ứng tuyển; không có quyền sử dụng vô thời hạn."
    >
      <div id={fieldId('usageRights')} tabIndex={-1} className="space-y-3 focus-visible:outline-none">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={`${id}-on`} className="text-sm font-medium text-foreground">
            Yêu cầu quyền sử dụng lại nội dung
          </Label>
          <Switch id={`${id}-on`} checked={v.useUsageRights} onCheckedChange={(x) => set('useUsageRights', x, 'usageRights')} />
        </div>
        {!v.useUsageRights ? (
          <p className="text-sm text-muted-foreground">Không yêu cầu: nhãn hàng chỉ chia sẻ lại bài đăng gốc của KOL.</p>
        ) : (
          <>
            <FormRow id={`${id}-months`} label="Thời hạn (tháng)" error={err} hint={`Tính từ ngày đăng bài, tối đa ${USAGE_MONTHS_MAX} tháng.`}>
              {(d) => (
                <Input
                  id={`${id}-months`}
                  inputMode="numeric"
                  value={v.usageMonths}
                  onChange={(e) => set('usageMonths', e.target.value.replace(/\D/g, '').slice(0, 2), 'usageRights')}
                  aria-invalid={!!err || undefined}
                  aria-describedby={d}
                  className="h-11 sm:max-w-32 md:h-10"
                />
              )}
            </FormRow>
            <FormRow id={`${id}-channels`} label="Kênh sử dụng">
              {(d) => (
                <ChipGroup id={`${id}-channels`} label="Kênh sử dụng" describedBy={d} invalid={!!err}>
                  {USAGE_CHANNELS.map((u) => (
                    <ChipToggle key={u.key} pressed={v.usageChannels.includes(u.key)} onClick={() => set('usageChannels', toggle(v.usageChannels, u.key), 'usageRights')}>
                      {u.label}
                    </ChipToggle>
                  ))}
                </ChipGroup>
              )}
            </FormRow>
            <div className="flex items-start gap-2">
              <Checkbox id={`${id}-excl`} checked={v.usageExclusive} onCheckedChange={(x) => set('usageExclusive', x === true, 'usageRights')} className="mt-0.5" />
              <Label htmlFor={`${id}-excl`} className="text-sm font-normal text-foreground">
                Độc quyền: KOL không nhận nhãn hàng cạnh tranh trong thời hạn trên
              </Label>
            </div>
            <FormRow id={`${id}-note`} label="Ghi chú" optional>
              {(d) => (
                <Textarea
                  id={`${id}-note`}
                  rows={2}
                  maxLength={USAGE_NOTE_MAX}
                  value={v.usageNote}
                  onChange={(e) => set('usageNote', e.target.value)}
                  placeholder="VD: Chỉ cắt ngắn, không chỉnh sửa lời nói của KOL"
                  aria-describedby={d}
                />
              )}
            </FormRow>
          </>
        )}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Hạn ứng tuyển có giờ (EP-02 §4.4)
// ---------------------------------------------------------------------------

export function ApplyDeadlineField({ values: v, set, errors }: { values: CampaignFormValues; set: Setter; errors: Errors }) {
  return (
    <FormRow
      id={fieldId('applyDeadline')}
      label="Hạn ứng tuyển"
      error={errors.applyDeadline}
      hint="Giờ Việt Nam (UTC+7). Đến hạn, chiến dịch tự đóng tuyển; đơn đã nhận vẫn được giữ."
    >
      {(d) => (
        <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-2 sm:max-w-96">
          <Input
            id={fieldId('applyDeadline')}
            type="date"
            value={v.applyDeadline}
            max={v.endDate || undefined}
            onChange={(e) => set('applyDeadline', e.target.value)}
            aria-invalid={!!errors.applyDeadline || undefined}
            aria-describedby={d}
            className="h-11 md:h-10"
          />
          <Input
            type="time"
            aria-label="Giờ hết hạn ứng tuyển"
            value={v.applyDeadlineTime || DEADLINE_TIME_DEFAULT}
            onChange={(e) => set('applyDeadlineTime', e.target.value, 'applyDeadline')}
            aria-invalid={!!errors.applyDeadline || undefined}
            className="h-11 md:h-10"
          />
        </div>
      )}
    </FormRow>
  );
}

// ---------------------------------------------------------------------------
// Xem trước (EP-02 §6.2, US-06)
// ---------------------------------------------------------------------------

/** Client-side checklist of what "Gửi đăng" will require (the service checks again). */
export function missingForPublish(v: CampaignFormValues): { step: FormStep; text: string }[] {
  const recruit = v.type === 'OPEN_RECRUITMENT';
  const out: { step: FormStep; text: string }[] = [];
  if (!v.name.trim()) out.push({ step: 0, text: 'Tên chiến dịch' });
  if (!v.promotedOwn && (!v.promotedName.trim() || (!v.proof && !v.proofNote.trim()))) out.push({ step: 0, text: 'Tên nhãn hàng và căn cứ đại diện (Agency)' });
  if (!recruit && !v.brief.trim()) out.push({ step: 0, text: 'Brief' });
  if (v.deliverables.length === 0) out.push({ step: 1, text: 'Ít nhất một hạng mục nội dung' });
  if (!recruit) {
    const missing = deliverablePlatforms(v.deliverables).filter((p) => {
      const g = groupRow(v.groups, p);
      return !(Number(g.cash.replace(/\D/g, '')) > 0 || (g.hasProduct && g.productName.trim() && Number(g.productValue.replace(/\D/g, '')) > 0));
    });
    if (missing.length) out.push({ step: 1, text: 'Thù lao hoặc sản phẩm cho từng nhóm đầu việc' });
    if (!v.startDate || !v.endDate) out.push({ step: 2, text: 'Thời gian chạy' });
    if (v.visibility === 'MARKETPLACE' && !v.applyDeadline) out.push({ step: 2, text: 'Hạn ứng tuyển (chiến dịch trên Sàn)' });
  } else {
    if (!v.slots) out.push({ step: 1, text: 'Số KOL cần tuyển' });
    if (Object.values(v.timeline).some((x) => !x)) out.push({ step: 2, text: 'Lịch trình 4 giai đoạn' });
  }
  if (v.useUsageRights && (!Number(v.usageMonths) || v.usageChannels.length === 0)) out.push({ step: 1, text: 'Thời hạn và kênh của quyền sử dụng nội dung' });
  return out;
}

/** The campaign as KOL/MCN will see it on the Sàn, built from the form (internal budget / proof are not shown). */
function previewCampaign(v: CampaignFormValues, company: string): MarketplaceCampaign {
  const input: CampaignInput = formToInput(v);
  const recruit = v.type === 'OPEN_RECRUITMENT';
  const groups = (input.groups ?? []) as DeliverableGroup[];
  const deadline = { applyDeadline: input.applyDeadline ?? undefined, applyDeadlineTime: input.applyDeadlineTime ?? undefined };
  return {
    id: 'xem-truoc',
    name: v.name.trim() || 'Tên chiến dịch',
    objective: v.objective,
    brief: v.brief,
    startDate: recruit ? v.timeline.applyStart : v.startDate,
    endDate: recruit ? v.timeline.reviewEnd : v.endDate,
    platforms: input.platforms ?? [],
    categories: v.categories,
    deliverables: input.deliverables ?? [],
    contentRules: input.contentRules ?? '',
    ...(deadline.applyDeadline ? { ...deadline, applyDeadlineAt: applyDeadlineAt(deadline) } : {}),
    ...(recruit && v.timeline.applyEnd ? { applyDeadline: v.timeline.applyEnd } : {}),
    ...(v.cover ? { cover: v.cover } : {}),
    ...(input.promotedBrand?.name ? { promotedBrand: { name: input.promotedBrand.name, viaAgency: !input.promotedBrand.own } } : {}),
    ...(input.usageRights ? { usageRights: input.usageRights } : {}),
    publishedAt: Date.now(),
    brand: { company },
    kolTarget: recruit ? (input.recruitment?.slots ?? 0) : 1,
    accepting: true,
    type: v.type,
    ...(recruit && input.recruitment ? { recruitment: input.recruitment, phase: 'APPLY' as const } : {}),
    draftReview: v.draftReview,
    groups,
    contract: v.contract,
    regions: input.regions ?? [],
    ...(input.target ? { target: input.target } : {}),
    survey: (input.survey ?? []).map((q, i) => ({ id: q.id ?? `q-${i + 1}`, text: q.text, required: q.required })),
    terms: (input.terms ?? []).map((t, i) => ({ id: t.id ?? `t-${i + 1}`, text: t.text })),
  };
}

/** Step 4: the Sàn card and detail page as KOL/MCN will see them, plus what is still missing. Never published. */
export function CampaignPreview({ values: v, company, onGoto }: { values: CampaignFormValues; company: string; onGoto(step: FormStep): void }) {
  const missing = missingForPublish(v);
  const c = previewCampaign(v, company);
  const now = Date.now();
  return (
    <div className="space-y-4">
      {missing.length > 0 ? (
        <div className="space-y-2 rounded-[8px] border border-chart-5/40 bg-chart-5/10 p-4" role="status">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <AlertCircle className="size-4 shrink-0 text-chart-5" aria-hidden />
            Vui lòng hoàn thiện các thông tin được đánh dấu trước khi gửi đăng.
          </p>
          <ul className="space-y-1">
            {missing.map((m) => (
              <li key={m.text} className="flex flex-wrap items-center justify-between gap-2 text-sm text-foreground">
                <span>• {m.text}</span>
                <Button type="button" variant="link" className="h-auto p-0 text-sm" onClick={() => onGoto(m.step)}>
                  Sửa ở bước {m.step + 1}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="flex items-center gap-2 rounded-[8px] border border-chart-4/40 bg-chart-4/10 p-3 text-sm text-foreground" role="status">
          <CheckCircle2 className="size-4 shrink-0 text-chart-4" aria-hidden />
          Đã đủ thông tin. Gửi đăng để Admin KOL Hub kiểm tra trước khi chiến dịch lên Sàn.
        </p>
      )}

      <Section title="Xem trước trên Sàn" description="Bản xem trước không được đưa lên Sàn. Căn cứ đại diện của Agency không hiển thị với KOL/MCN.">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Eye className="size-4" aria-hidden />
          {CAMPAIGN_TYPE_LABEL[v.type]} · góc nhìn KOL/MCN
        </div>
        <div className="grid gap-4 @container lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="pointer-events-none max-w-sm" aria-label="Thẻ chiến dịch trên Sàn">
            <MarketplaceCampaignCard campaign={c} now={now} to="#" viewer="guest" />
          </div>
          <div className="min-w-0 space-y-4 rounded-[8px] border border-dashed border-border p-4">
            <CampaignDetailHeader campaign={c} now={now} />
            <CampaignDetailSections campaign={c} viewer="guest" now={now} narrowOnlyClass="" preview />
          </div>
        </div>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hiển thị (Booking 1 KOL): riêng tư hoặc trên Sàn
// ---------------------------------------------------------------------------

export function VisibilityChoice({ value, onChange }: { value: CampaignFormValues['visibility']; onChange(v: CampaignFormValues['visibility']): void }) {
  const id = useId();
  const options = [
    { key: 'MARKETPLACE' as const, title: 'Trên Sàn chiến dịch', text: 'KOL/MCN thấy chiến dịch và ứng tuyển; bạn vẫn mời thêm được.' },
    { key: 'PRIVATE' as const, title: 'Riêng tư', text: 'Chỉ KOL/MCN được bạn mời mới thấy và nhận lời.' },
  ];
  return (
    <RadioGroup value={value} onValueChange={(x) => onChange(x as CampaignFormValues['visibility'])} className="grid gap-2 sm:grid-cols-2" aria-label="Hiển thị">
      {options.map((o) => (
        <Label
          key={o.key}
          htmlFor={`${id}-${o.key}`}
          className="flex cursor-pointer items-start gap-2 rounded-[8px] border border-border p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
        >
          <RadioGroupItem id={`${id}-${o.key}`} value={o.key} className="mt-0.5" />
          <span>
            <span className="block text-sm font-medium text-foreground">{o.title}</span>
            <span className="block text-xs text-muted-foreground">{o.text}</span>
          </span>
        </Label>
      ))}
    </RadioGroup>
  );
}

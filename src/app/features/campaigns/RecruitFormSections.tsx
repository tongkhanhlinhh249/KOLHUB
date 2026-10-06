import { useId, useState, type ReactNode } from 'react';
import { Handshake, Plus, Sparkles, Trash2, Users } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../components/ui/utils';
import {
  CAMPAIGN_TYPES,
  PRODUCT_NAME_MAX,
  PRODUCT_NOTE_MAX,
  RECRUIT_MILESTONES,
  SURVEY_MAX,
  SURVEY_TEXT_MAX,
  TARGET_GENDER_LABEL,
  TERMS_MAX,
  VN_PROVINCES,
  type CampaignType,
  type TargetGender,
} from '../../services';
import { ChipGroup, ChipToggle, FormRow, Section } from './FormParts';
import { recruitBudget, suggestTimeline, toggle, type CampaignFormValues, type FormField } from './campaignForm';
import { formatVnd, formatVndInput } from './campaignView';

type Setter = <K extends keyof CampaignFormValues>(key: K, value: CampaignFormValues[K], clears?: FormField) => void;
type Errors = Partial<Record<FormField, string>>;
export const fieldId = (f: FormField) => `cf-${f}`;

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function ErrorText({ id, error }: { id?: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} className="text-xs text-destructive" role="alert">
      {error}
    </p>
  );
}

function MoneyInput({ id, value, onChange, invalid, describedBy, placeholder }: { id: string; value: string; onChange(v: string): void; invalid?: boolean; describedBy?: string; placeholder?: string }) {
  return (
    <div className="relative">
      <Input
        id={id}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(formatVndInput(e.target.value))}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="h-11 pr-10 tabular-nums md:h-10"
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground" aria-hidden>
        ₫
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loại chiến dịch
// ---------------------------------------------------------------------------

const TYPE_ICON: Record<CampaignType, ReactNode> = {
  BOOKING: <Handshake className="size-4" aria-hidden />,
  OPEN_RECRUITMENT: <Users className="size-4" aria-hidden />,
};

/** "Booking riêng" / "Tuyển nhiều KOL" radio cards; locked once the campaign has bookings. */
export function TypeSection({ value, onChange, locked, error }: { value: CampaignType; onChange(v: CampaignType): void; locked: boolean; error?: string }) {
  return (
    <Section title="Loại chiến dịch" description={locked ? 'Chiến dịch đã có booking nên không đổi được loại.' : 'Chọn cách bạn làm việc với KOL/MCN.'}>
      <div role="radiogroup" aria-label="Loại chiến dịch" id={fieldId('type')} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {CAMPAIGN_TYPES.map((t) => {
          const active = t.key === value;
          return (
            <button
              key={t.key}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={locked && !active}
              onClick={() => onChange(t.key)}
              className={cn(
                'flex min-h-11 items-start gap-3 rounded-[8px] border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                active ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/60',
              )}
            >
              <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full', active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                {TYPE_ICON[t.key]}
              </span>
              <span className="min-w-0 space-y-0.5">
                <span className="block text-sm font-medium text-foreground">{t.label}</span>
                <span className="block text-xs text-muted-foreground">{t.description}</span>
              </span>
            </button>
          );
        })}
      </div>
      <ErrorText error={error} />
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Tuyển nhiều KOL: suất, phần thưởng, lịch 4 giai đoạn
// ---------------------------------------------------------------------------

export function RecruitSection({ values: v, set, errors }: { values: CampaignFormValues; set: Setter; errors: Errors }) {
  const id = useId();
  const budget = recruitBudget(v);
  const setDate = (key: keyof CampaignFormValues['timeline'], value: string) => set('timeline', { ...v.timeline, [key]: value }, 'timeline');
  const timelineErr = errors.timeline ?? errors.recruitment;
  return (
    <>
      <Section title="Suất và phần thưởng" description="Mỗi KOL được chọn nhận cùng một phần thưởng. KOL/MCN ứng tuyển không cần báo giá.">
        <FormRow id={fieldId('slots')} label="Số KOL cần tuyển" error={errors.slots} hint="Bạn chọn tối đa ngần này KOL/MCN trong giai đoạn Chọn lọc.">
          {(d) => (
            <Input
              id={fieldId('slots')}
              inputMode="numeric"
              value={v.slots}
              onChange={(e) => set('slots', e.target.value.replace(/\D/g, '').slice(0, 3))}
              placeholder="VD: 10"
              aria-invalid={!!errors.slots || undefined}
              aria-describedby={d}
              className="h-11 sm:max-w-40 md:h-10"
            />
          )}
        </FormRow>
        <FormRow id={fieldId('reward')} label="Tiền mặt mỗi KOL (VND)" error={errors.reward} hint="Để trống nếu chỉ tặng sản phẩm.">
          {(d) => <MoneyInput id={fieldId('reward')} value={v.rewardCash} onChange={(x) => set('rewardCash', x, 'reward')} invalid={!!errors.reward} describedBy={d} placeholder="VD: 2.000.000" />}
        </FormRow>
        <div className="space-y-3 rounded-[8px] border border-border p-3">
          <div className="flex items-start gap-3">
            <Checkbox id={`${id}-product`} checked={v.hasProduct} onCheckedChange={(c) => set('hasProduct', c === true, 'product')} className="mt-0.5" />
            <div className="min-w-0 space-y-0.5">
              <Label htmlFor={`${id}-product`} className="text-sm font-medium text-foreground">
                Tặng kèm sản phẩm
              </Label>
              <p className="text-xs text-muted-foreground">KOL nhập địa chỉ nhận hàng và số điện thoại khi ứng tuyển. Bạn ghi nhận “Đã gửi sản phẩm”.</p>
            </div>
          </div>
          {v.hasProduct && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormRow id={fieldId('product')} label="Tên sản phẩm" error={errors.product}>
                {(d) => (
                  <Input
                    id={fieldId('product')}
                    value={v.productName}
                    maxLength={PRODUCT_NAME_MAX}
                    onChange={(e) => set('productName', e.target.value, 'product')}
                    placeholder="VD: Bình giữ nhiệt 750 ml"
                    aria-invalid={!!errors.product || undefined}
                    aria-describedby={d}
                    className="h-11 md:h-10"
                  />
                )}
              </FormRow>
              <FormRow id={`${id}-pvalue`} label="Giá trị (VND)">
                {(d) => <MoneyInput id={`${id}-pvalue`} value={v.productValue} onChange={(x) => set('productValue', x, 'product')} describedBy={d} placeholder="VD: 450.000" />}
              </FormRow>
              <div className="sm:col-span-2">
                <FormRow id={`${id}-pnote`} label="Ghi chú" optional>
                  {(d) => (
                    <Textarea
                      id={`${id}-pnote`}
                      rows={2}
                      maxLength={PRODUCT_NOTE_MAX}
                      value={v.productNote}
                      onChange={(e) => set('productNote', e.target.value)}
                      placeholder="VD: Giao trong 3 ngày sau khi được chọn"
                      aria-describedby={d}
                    />
                  )}
                </FormRow>
              </div>
            </div>
          )}
        </div>
        <p className="rounded-[8px] bg-muted/60 p-3 text-sm text-foreground">
          Tổng ngân sách dự kiến: <span className="font-semibold tabular-nums">{formatVnd(budget)}</span>
          <span className="block text-xs text-muted-foreground">= số suất × (tiền mặt + giá trị sản phẩm). Hiển thị trên Sàn để KOL/MCN so sánh.</span>
        </p>
      </Section>

      <Section title="Lịch trình 4 giai đoạn" description="Ứng tuyển → Chọn lọc → Đăng bài → Đánh giá. Chiến dịch hiển thị trên Sàn và nhận ứng tuyển trong giai đoạn Ứng tuyển.">
        <div id={fieldId('timeline')} tabIndex={-1} className="space-y-3 focus-visible:outline-none">
          <ol className="space-y-2">
            {RECRUIT_MILESTONES.map((m, i) => (
              <li key={m.key} className="grid grid-cols-1 gap-2 rounded-[8px] border border-border p-3 sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)] sm:items-center">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary" aria-hidden>
                    {i + 1}
                  </span>
                  {m.label}
                </p>
                <div className="space-y-1">
                  <Label htmlFor={`${id}-${m.start}`} className="text-xs font-normal text-muted-foreground">
                    Từ ngày
                  </Label>
                  <Input
                    id={`${id}-${m.start}`}
                    type="date"
                    value={v.timeline[m.start]}
                    onChange={(e) => setDate(m.start, e.target.value)}
                    aria-invalid={!!timelineErr || undefined}
                    className="h-11 md:h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${id}-${m.end}`} className="text-xs font-normal text-muted-foreground">
                    Đến ngày
                  </Label>
                  <Input
                    id={`${id}-${m.end}`}
                    type="date"
                    value={v.timeline[m.end]}
                    min={v.timeline[m.start] || undefined}
                    onChange={(e) => setDate(m.end, e.target.value)}
                    aria-invalid={!!timelineErr || undefined}
                    className="h-11 md:h-10"
                  />
                </div>
              </li>
            ))}
          </ol>
          <ErrorText error={timelineErr} />
          <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => set('timeline', suggestTimeline(v.timeline.applyStart || todayIso()), 'timeline')}>
            <Sparkles aria-hidden />
            Gợi ý lịch (7 · 3 · 15 · 6 ngày)
          </Button>
        </div>
      </Section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Điều kiện tham gia
// ---------------------------------------------------------------------------

export function ConditionsSection({ values: v, set, errors }: { values: CampaignFormValues; set: Setter; errors: Errors }) {
  const id = useId();
  const [pickRegions, setPickRegions] = useState(v.regions.length > 0);
  return (
    <Section title="Điều kiện tham gia" description="Hiển thị cho KOL/MCN trên Sàn. Không bắt buộc.">
      <FormRow id={fieldId('regions')} label="Khu vực" error={errors.regions}>
        {(d) => (
          <div className="space-y-2">
            <div role="radiogroup" aria-label="Khu vực" className="flex flex-wrap gap-2">
              <ChipToggle
                pressed={!pickRegions}
                onClick={() => {
                  setPickRegions(false);
                  set('regions', []);
                }}
              >
                Toàn quốc
              </ChipToggle>
              <ChipToggle pressed={pickRegions} onClick={() => setPickRegions(true)}>
                Chọn tỉnh/thành
              </ChipToggle>
            </div>
            {pickRegions && (
              <ChipGroup id={fieldId('regions')} label="Tỉnh/thành" describedBy={d} invalid={!!errors.regions}>
                {VN_PROVINCES.map((p) => (
                  <ChipToggle key={p} pressed={v.regions.includes(p)} onClick={() => set('regions', toggle(v.regions, p))}>
                    {p}
                  </ChipToggle>
                ))}
              </ChipGroup>
            )}
          </div>
        )}
      </FormRow>
      <div id={fieldId('target')} tabIndex={-1} className="grid grid-cols-2 gap-3 focus-visible:outline-none sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-amin`}>Tuổi từ</Label>
          <Input id={`${id}-amin`} inputMode="numeric" value={v.ageMin} onChange={(e) => set('ageMin', e.target.value.replace(/\D/g, '').slice(0, 2), 'target')} placeholder="16" className="h-11 md:h-10" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-amax`}>Đến</Label>
          <Input id={`${id}-amax`} inputMode="numeric" value={v.ageMax} onChange={(e) => set('ageMax', e.target.value.replace(/\D/g, '').slice(0, 2), 'target')} placeholder="80" className="h-11 md:h-10" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-gender`}>Giới tính</Label>
          <Select value={v.gender} onValueChange={(g) => set('gender', g as TargetGender, 'target')}>
            <SelectTrigger id={`${id}-gender`} className="h-11 w-full bg-card md:h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TARGET_GENDER_LABEL) as TargetGender[]).map((g) => (
                <SelectItem key={g} value={g}>
                  {TARGET_GENDER_LABEL[g]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-fol`}>Người theo dõi tối thiểu</Label>
          <Input id={`${id}-fol`} inputMode="numeric" value={v.minFollowers} onChange={(e) => set('minFollowers', formatVndInput(e.target.value), 'target')} placeholder="VD: 10.000" className="h-11 tabular-nums md:h-10" />
        </div>
      </div>
      <ErrorText error={errors.target} />
      <p className="text-xs text-muted-foreground">Lĩnh vực trong mục “Nền tảng và lĩnh vực” cũng là một điều kiện tham gia.</p>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Workflow
// ---------------------------------------------------------------------------

export function WorkflowSection({ value, onChange }: { value: boolean; onChange(v: boolean): void }) {
  const id = useId();
  return (
    <Section title="Workflow">
      <div className="flex items-start justify-between gap-4 rounded-[8px] border border-border p-3" id={fieldId('draftReview')}>
        <div className="min-w-0 space-y-0.5">
          <Label htmlFor={`${id}-dr`} className="text-sm font-medium text-foreground">
            Duyệt nháp
          </Label>
          <p className="text-xs text-muted-foreground">
            {value
              ? 'Bật: KOL gửi bản nháp (kèm kiểm tra KOL Safety) để bạn duyệt trước khi đăng.'
              : 'Tắt: KOL đăng bài trực tiếp theo yêu cầu rồi gửi link, không qua bước duyệt nháp.'}
          </p>
        </div>
        <Switch id={`${id}-dr`} checked={value} onCheckedChange={onChange} className="mt-0.5" />
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Câu hỏi khảo sát và điều khoản
// ---------------------------------------------------------------------------

export function ApplyFormSection({ values: v, set, errors }: { values: CampaignFormValues; set: Setter; errors: Errors }) {
  const id = useId();
  return (
    <Section title="Câu hỏi khảo sát và điều khoản" description="KOL/MCN trả lời câu hỏi và đồng ý mọi điều khoản khi ứng tuyển. Bạn xem câu trả lời trong danh sách ứng viên.">
      <div id={fieldId('survey')} tabIndex={-1} className="space-y-2 focus-visible:outline-none">
        <p className="text-sm font-medium text-foreground">
          Câu hỏi khảo sát <span className="font-normal text-muted-foreground">({v.survey.length}/{SURVEY_MAX})</span>
        </p>
        {v.survey.length === 0 && <p className="text-xs text-muted-foreground">Chưa có câu hỏi.</p>}
        <ul className="space-y-2">
          {v.survey.map((q, i) => (
            <li key={i} className="flex flex-col gap-2 rounded-[8px] border border-border p-3 sm:flex-row sm:items-center">
              <Input
                value={q.text}
                maxLength={SURVEY_TEXT_MAX}
                onChange={(e) => set('survey', v.survey.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)), 'survey')}
                placeholder="VD: Bạn dự kiến đăng bài vào ngày nào?"
                aria-label={`Câu hỏi ${i + 1}`}
                className="h-11 min-w-0 flex-1 md:h-10"
              />
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`${id}-req-${i}`}
                    checked={q.required}
                    onCheckedChange={(c) => set('survey', v.survey.map((x, j) => (j === i ? { ...x, required: c === true } : x)), 'survey')}
                  />
                  <Label htmlFor={`${id}-req-${i}`} className="text-sm font-normal whitespace-nowrap">
                    Bắt buộc
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 text-muted-foreground hover:text-destructive md:size-9"
                  onClick={() => set('survey', v.survey.filter((_, j) => j !== i), 'survey')}
                  aria-label={`Xoá câu hỏi ${i + 1}`}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <ErrorText error={errors.survey} />
        <Button
          type="button"
          variant="outline"
          className="h-11 md:h-9"
          disabled={v.survey.length >= SURVEY_MAX}
          onClick={() => set('survey', [...v.survey, { text: '', required: true }], 'survey')}
        >
          <Plus aria-hidden />
          Thêm câu hỏi
        </Button>
      </div>

      <div id={fieldId('terms')} tabIndex={-1} className="space-y-2 border-t border-border pt-4 focus-visible:outline-none">
        <p className="text-sm font-medium text-foreground">
          Điều khoản <span className="font-normal text-muted-foreground">({v.terms.length}/{TERMS_MAX})</span>
        </p>
        <ul className="space-y-2">
          {v.terms.map((t, i) => (
            <li key={i} className="flex items-center gap-2">
              <Input
                value={t.text}
                maxLength={SURVEY_TEXT_MAX}
                onChange={(e) => set('terms', v.terms.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)), 'terms')}
                aria-label={`Điều khoản ${i + 1}`}
                className="h-11 min-w-0 flex-1 md:h-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 shrink-0 text-muted-foreground hover:text-destructive md:size-9"
                onClick={() => set('terms', v.terms.filter((_, j) => j !== i), 'terms')}
                aria-label={`Xoá điều khoản ${i + 1}`}
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
        <ErrorText error={errors.terms} />
        <Button type="button" variant="outline" className="h-11 md:h-9" disabled={v.terms.length >= TERMS_MAX} onClick={() => set('terms', [...v.terms, { text: '' }], 'terms')}>
          <Plus aria-hidden />
          Thêm điều khoản
        </Button>
      </div>
    </Section>
  );
}


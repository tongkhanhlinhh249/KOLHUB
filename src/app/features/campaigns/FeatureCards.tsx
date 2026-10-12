import { useId, useState, type ComponentType, type ReactNode } from 'react';
import { Banknote, ChevronDown, FileCheck2, FileSignature, Gift, ListChecks, PenLine, ShieldCheck, UserCheck } from 'lucide-react';
import { Switch } from '../../components/ui/switch';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../components/ui/utils';
import { CAMPAIGN_TEXT_MAX } from '../../services';
import { FormRow } from './FormParts';
import { ConditionsFields, fieldId, ProductFields, RewardCashField, SurveyFields, TermsFields, type Errors, type Setter } from './RecruitFormSections';
import type { CampaignFormValues } from './campaignForm';

/**
 * One "Tính năng của chiến dịch" card: icon, title, description and a switch; when on, its settings open below
 * (chevron to collapse). `toggle` absent = always on (no switch); `lockedText` = shown greyed with the reason.
 */
function FeatureCard({
  icon: Icon,
  title,
  description,
  on,
  onToggle,
  lockedText,
  needsSetup,
  error,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  on: boolean;
  onToggle?: (on: boolean) => void;
  lockedText?: string;
  needsSetup?: boolean;
  error?: boolean;
  children?: ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(true);
  const locked = !!lockedText;
  const expanded = on && !!children && (open || !!error);
  return (
    <section
      aria-labelledby={`${id}-title`}
      className={cn('rounded-xl border bg-card transition-colors', error ? 'border-destructive/50' : 'border-border', !on && 'bg-card/60')}
    >
      <div className="flex items-start gap-3 p-4">
        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', on ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 id={`${id}-title`} className={cn('text-base font-semibold', on ? 'text-foreground' : 'text-muted-foreground')}>
              {title}
            </h3>
            {on && needsSetup && <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Cần thiết lập</span>}
            {on && children && (
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={expanded}
                aria-controls={`${id}-body`}
                aria-label={expanded ? `Thu gọn thiết lập ${title}` : `Mở thiết lập ${title}`}
                className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <ChevronDown className={cn('size-4 transition-transform', expanded && 'rotate-180')} aria-hidden />
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
          {lockedText && <p className="text-xs text-muted-foreground italic">{lockedText}</p>}
        </div>
        {onToggle && (
          <Switch
            checked={on}
            disabled={locked}
            onCheckedChange={(x) => {
              onToggle(x);
              if (x) setOpen(true);
            }}
            aria-label={title}
            className="mt-2 shrink-0"
          />
        )}
      </div>
      {expanded && (
        <div id={`${id}-body`} className="space-y-4 border-t border-border px-4 py-4">
          {children}
        </div>
      )}
    </section>
  );
}

const blank = (s: string) => !s.trim();

/**
 * "Tính năng của chiến dịch": the toggleable parts of a campaign. Turning a card off clears its data on save
 * (see formToInput); "Hợp đồng" is a stored flag that the booking rules follow.
 */
export function CampaignFeatures({
  values: v,
  set,
  errors,
  variant = 'full',
}: {
  values: CampaignFormValues;
  set: Setter;
  errors: Errors;
  /**
   * 'full' (Tuyển nhiều KOL): every card with its heading. 'advanced' (Booking riêng, inside "Tính năng nâng cao"):
   * no brief card (the brief is a main field), no reward cards; conditions and survey only when on the Sàn.
   */
  variant?: 'full' | 'advanced';
}) {
  const recruit = v.type === 'OPEN_RECRUITMENT';
  const advanced = variant === 'advanced';
  const onSan = v.visibility === 'MARKETPLACE';
  const textCount = (s: string) => `${[...s].length.toLocaleString('vi-VN')}/${CAMPAIGN_TEXT_MAX.toLocaleString('vi-VN')}`;
  const conditionsEmpty = v.regions.length === 0 && !v.ageMin && !v.ageMax && v.gender === 'ANY' && !v.minFollowers;

  return (
    <div className="space-y-3">
      {!advanced && (
        <>
      <div className="space-y-0.5 px-1">
        <h2 className="text-base font-semibold text-foreground">Tính năng của chiến dịch</h2>
        <p className="text-sm text-muted-foreground">Bật phần bạn cần. Tắt một phần thì phần đó không áp dụng cho chiến dịch.</p>
      </div>

      <FeatureCard
        icon={PenLine}
        title="Bản tóm tắt sáng tạo"
        description="Mục tiêu và brief — hướng đi KOL dựa vào khi làm nội dung."
        on
        needsSetup={blank(v.brief)}
        error={!!(errors.objective || errors.brief)}
      >
        <FormRow id={fieldId('objective')} label="Mục tiêu" optional error={errors.objective}>
          {(d) => (
            <Textarea
              id={fieldId('objective')}
              value={v.objective}
              maxLength={CAMPAIGN_TEXT_MAX}
              rows={2}
              onChange={(e) => set('objective', e.target.value)}
              placeholder="VD: Tăng nhận biết sản phẩm với nhóm gia đình trẻ"
              aria-invalid={!!errors.objective || undefined}
              aria-describedby={d}
            />
          )}
        </FormRow>
        <FormRow id={fieldId('brief')} label="Brief" optional error={errors.brief} hint={textCount(v.brief)}>
          {(d) => (
            <Textarea
              id={fieldId('brief')}
              value={v.brief}
              maxLength={CAMPAIGN_TEXT_MAX}
              rows={5}
              onChange={(e) => set('brief', e.target.value)}
              placeholder="Thông điệp chính, câu chuyện, điểm cần nhấn mạnh…"
              aria-invalid={!!errors.brief || undefined}
              aria-describedby={d}
            />
          )}
        </FormRow>
      </FeatureCard>

      {recruit ? (
        <FeatureCard
          icon={Banknote}
          title="Đề nghị trả phí"
          description="Một khoản tiền cố định cho mỗi KOL được chọn."
          on={v.payCash}
          onToggle={(x) => set('payCash', x, 'reward')}
          needsSetup={blank(v.rewardCash)}
          error={!!errors.reward}
        >
          <RewardCashField values={v} set={set} errors={errors} />
        </FeatureCard>
      ) : (
        <FeatureCard
          icon={Banknote}
          title="Đề nghị trả phí"
          description="Thù lao cố định cho mỗi booking, khai theo từng nhóm đầu việc ở trên."
          on
          lockedText="Thiết lập trong “Quyền lợi theo nhóm đầu việc”."
          onToggle={() => {}}
        />
      )}

      <FeatureCard
        icon={Gift}
        title="Tặng quà"
        description="Tặng sản phẩm cho KOL được chọn. KOL nhập địa chỉ nhận hàng khi ứng tuyển."
        on={recruit && v.hasProduct}
        onToggle={(x) => set('hasProduct', x, 'product')}
        lockedText={recruit ? undefined : 'Booking riêng: tặng sản phẩm theo từng nhóm đầu việc ở trên.'}
        needsSetup={blank(v.productName) || blank(v.productValue)}
        error={!!errors.product}
      >
        <ProductFields values={v} set={set} errors={errors} />
      </FeatureCard>
      {recruit && !v.payCash && !v.hasProduct && (
        <p className="rounded-[8px] border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
          Chiến dịch Tuyển nhiều KOL cần bật ít nhất một phần thưởng: “Đề nghị trả phí” hoặc “Tặng quà”.
        </p>
      )}

        </>
      )}

      <FeatureCard
        icon={FileCheck2}
        title="Duyệt nháp"
        description={
          v.draftReview
            ? 'KOL gửi bản nháp (kèm kiểm tra KOL Safety) để bạn duyệt trước khi đăng.'
            : 'Tắt: KOL đăng bài trực tiếp rồi gửi link, không qua bước duyệt nháp.'
        }
        on={v.draftReview}
        onToggle={(x) => set('draftReview', x)}
        error={!!errors.draftReview}
      />

      <FeatureCard
        icon={ShieldCheck}
        title="Sự tuân thủ"
        description="Quy định bài đăng phải theo: hashtag, ghi nhãn quảng cáo, nội dung không được dùng…"
        on={v.useContentRules}
        onToggle={(x) => set('useContentRules', x, 'contentRules')}
        needsSetup={blank(v.contentRules)}
        error={!!errors.contentRules}
      >
        <FormRow id={fieldId('contentRules')} label="Quy định nội dung" error={errors.contentRules} hint={textCount(v.contentRules)}>
          {(d) => (
            <Textarea
              id={fieldId('contentRules')}
              value={v.contentRules}
              maxLength={CAMPAIGN_TEXT_MAX}
              rows={4}
              onChange={(e) => set('contentRules', e.target.value)}
              placeholder="VD: Gắn #QuangCao, không so sánh với đối thủ, thời lượng tối thiểu 30 giây"
              aria-invalid={!!errors.contentRules || undefined}
              aria-describedby={d}
            />
          )}
        </FormRow>
      </FeatureCard>

      <FeatureCard
        icon={FileSignature}
        title="Hợp đồng"
        description="Điều khoản KOL/MCN phải đồng ý khi ứng tuyển, và tệp hợp đồng hai bên đính kèm trong từng booking."
        on={v.contract}
        onToggle={(x) => set('contract', x, 'terms')}
        error={!!(errors.terms || errors.contract)}
      >
        <TermsFields values={v} set={set} errors={errors} />
      </FeatureCard>

      {(!advanced || onSan) && (
        <>
      <FeatureCard
        icon={UserCheck}
        title="Điều kiện tham gia"
        description="Khu vực, độ tuổi, giới tính, số người theo dõi tối thiểu."
        on={v.useConditions}
        onToggle={(x) => set('useConditions', x, 'target')}
        needsSetup={conditionsEmpty}
        error={!!(errors.regions || errors.target)}
      >
        <ConditionsFields values={v} set={set} errors={errors} />
      </FeatureCard>

      <FeatureCard
        icon={ListChecks}
        title="Câu hỏi khảo sát"
        description="Câu hỏi KOL/MCN trả lời khi ứng tuyển."
        on={v.useSurvey}
        onToggle={(x) => {
          set('useSurvey', x, 'survey');
          if (x && v.survey.length === 0) set('survey', [{ text: '', required: true }]);
        }}
        needsSetup={!v.survey.some((q) => q.text.trim())}
        error={!!errors.survey}
      >
        <SurveyFields values={v} set={set} errors={errors} />
      </FeatureCard>
        </>
      )}
    </div>
  );
}

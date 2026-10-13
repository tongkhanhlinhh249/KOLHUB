import { useId } from 'react';
import { Checkbox } from '../../components/ui/checkbox';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { deliverableLabel, PRODUCT_NAME_MAX, type Platform } from '../../services';
import { PLATFORM_LABEL, PlatformIcon } from '../shared/StatusBadges';
import { bookingBudget, deliverablePlatforms, groupRow, groupRowValue, type CampaignFormValues, type GroupRow } from './campaignForm';
import { formatVnd } from './campaignView';
import { MoneyInput, fieldId, type Errors, type Setter } from './RecruitFormSections';


/**
 * "Quyền lợi theo nhóm đầu việc" (EP-02 §4.3) of a Booking riêng form: one group per platform of the deliverables,
 * each with its slots and a fixed reward per booking (cash and/or a product). No quotes or price ranges: KOL/MCN
 * accept or decline that reward. Booking 1 KOL: one KOL/MCN is chosen, so there is no slot count; the budget is the
 * sum of the group rewards.
 */
export function GroupRewardsEditor({ values: v, set, errors }: { values: CampaignFormValues; set: Setter; errors: Errors }) {
  const platforms = deliverablePlatforms(v.deliverables);
  const update = (platform: Platform, patch: Partial<GroupRow>) => {
    const row = { ...groupRow(v.groups, platform), ...patch };
    set('groups', [...v.groups.filter((g) => g.platform !== platform), row], 'groups');
  };
  const budget = bookingBudget(v);

  return (
    <div id={fieldId('groups')} tabIndex={-1} className="space-y-3 focus-visible:outline-none">
      {platforms.length === 0 ? (
        <p className="text-sm text-muted-foreground">Thêm hạng mục nội dung ở trên để thiết lập quyền lợi cho từng nền tảng.</p>
      ) : (
        <ul className="space-y-2" aria-label="Quyền lợi theo nhóm đầu việc">
          {platforms.map((p) => (
            <GroupCard
              key={p}
              row={groupRow(v.groups, p)}
              items={v.deliverables.filter((d) => d.platform === p).map((d) => `${d.quantity || '?'} ${deliverableLabel(d.type, d.platform).toLowerCase()}`)}
              invalid={!!errors.groups}
              onChange={(patch) => update(p, patch)}
            />
          ))}
        </ul>
      )}
      {errors.groups && (
        <p className="text-xs text-destructive" role="alert">
          {errors.groups}
        </p>
      )}
      <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-[8px] bg-muted/60 px-3 py-2.5">
        <span className="text-sm text-muted-foreground">Tổng quyền lợi cho KOL được chọn (tự tính)</span>
        <span className="text-base font-semibold text-foreground tabular-nums">{formatVnd(budget)}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Bạn chọn 1 KOL/MCN cho chiến dịch. Thù lao gồm toàn bộ đầu việc của nhóm, không nhân theo số lượng nội dung. KOL/MCN chỉ nhận hoặc từ chối
        mức này, không trả giá.
      </p>
    </div>
  );
}

function GroupCard({ row, items, invalid, onChange }: { row: GroupRow; items: string[]; invalid: boolean; onChange(patch: Partial<GroupRow>): void }) {
  const id = useId();
  const perBooking = groupRowValue(row);
  return (
    <li className="space-y-3 rounded-[8px] border border-border p-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <PlatformIcon platform={row.platform} className="size-4 text-muted-foreground" aria-hidden />
        <span className="text-sm font-semibold text-foreground">{PLATFORM_LABEL[row.platform]}</span>
        <span className="text-xs text-muted-foreground">· {items.join(', ')}</span>
      </div>
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`${id}-cash`} className="text-xs text-muted-foreground">
            Thù lao mỗi booking (VND)
          </Label>
          <MoneyInput id={`${id}-cash`} value={row.cash} onChange={(x) => onChange({ cash: x })} invalid={invalid && perBooking <= 0} placeholder="VD: 15.000.000" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id={`${id}-product`} checked={row.hasProduct} onCheckedChange={(c) => onChange({ hasProduct: c === true })} />
        <Label htmlFor={`${id}-product`} className="text-sm font-normal text-foreground">
          Tặng kèm sản phẩm / trải nghiệm
        </Label>
      </div>
      {row.hasProduct && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={`${id}-pname`} className="text-xs text-muted-foreground">
              Tên sản phẩm
            </Label>
            <Input
              id={`${id}-pname`}
              value={row.productName}
              maxLength={PRODUCT_NAME_MAX}
              onChange={(e) => onChange({ productName: e.target.value })}
              placeholder="VD: Bộ sữa hạt dùng thử"
              aria-invalid={(invalid && !row.productName.trim()) || undefined}
              className="h-11 md:h-10"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${id}-pvalue`} className="text-xs text-muted-foreground">
              Giá trị (VND)
            </Label>
            <MoneyInput id={`${id}-pvalue`} value={row.productValue} onChange={(x) => onChange({ productValue: x })} placeholder="VD: 500.000" />
          </div>
        </div>
      )}
    </li>
  );
}

import { useState, type FormEvent, type ReactNode } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import {
  isValidEmail,
  isValidPhone,
  KOL_CATEGORIES,
  profileService,
  PROVINCES,
  ValidationError,
  type ContactInfo,
  type ProfileView,
  type StaffInfo,
} from '../../services';
import { Field, type FieldErrors } from '../form/Field';
import { SelectField } from '../shared/SelectField';

type ContactKey = keyof ContactInfo;
type StaffKey = keyof StaffInfo;

const REQUIRED_CONTACT: ContactKey[] = ['displayName', 'phone', 'email', 'province', 'address', 'category'];
const REQUIRED_STAFF: StaffKey[] = ['staffName', 'staffPhone'];

function contactLabels(isKol: boolean): Record<ContactKey, string> {
  return {
    displayName: isKol ? 'Họ tên KOL/KOC' : 'Tên hiển thị',
    phone: 'Số điện thoại',
    email: 'Email',
    zalo: 'Zalo',
    country: 'Quốc gia',
    province: 'Tỉnh/Thành phố',
    address: 'Địa chỉ',
    category: 'Lĩnh vực',
  };
}

const STAFF_LABELS: Record<StaffKey, string> = {
  staffName: 'Họ tên nhân sự',
  staffPhone: 'Số điện thoại',
  staffEmail: 'Email',
};

function errorText(e: unknown): string {
  return e instanceof Error && e.message ? e.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

function InfoRow({ label, value, required, extra }: { label: string; value: string; required?: boolean; extra?: ReactNode }) {
  const empty = !value.trim();
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">
        {label}
        {required && empty && (
          <span className="ml-0.5 text-destructive" aria-label="bắt buộc">
            *
          </span>
        )}
      </dt>
      <dd className={empty ? 'text-sm text-muted-foreground' : 'break-words text-sm text-foreground'}>
        {empty ? 'Chưa cập nhật' : value}
      </dd>
      {extra}
    </div>
  );
}

function SectionCard({ title, onEdit, children }: { title: string; onEdit(): void; children: ReactNode }) {
  return (
    <Card className="gap-4 py-4 md:py-5">
      <CardHeader className="flex flex-row items-center justify-between px-4 md:px-6">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button type="button" variant="ghost" size="icon" className="size-11 md:size-9" aria-label={`Sửa ${title}`} onClick={onEdit}>
          <Pencil aria-hidden />
        </Button>
      </CardHeader>
      <CardContent className="px-4 md:px-6">
        <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</dl>
      </CardContent>
    </Card>
  );
}

function ContactDialog({ view, onOpenChange }: { view: ProfileView; onOpenChange(o: boolean): void }) {
  const { profile } = view;
  const isKol = profile.ownerType === 'KOL';
  const labels = contactLabels(isKol);
  const pendingName = view.pendingChanges.find((c) => c.field === 'displayName');
  const [values, setValues] = useState<ContactInfo>(() => ({
    ...profile.contact,
    displayName: typeof pendingName?.newValue === 'string' ? pendingName.newValue : profile.contact.displayName,
  }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const nameNeedsApproval = isKol && (profile.status === 'SUBMITTED' || profile.status === 'APPROVED');

  const set = (k: ContactKey) => (v: string) => setValues((s) => ({ ...s, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: FieldErrors = {};
    for (const k of REQUIRED_CONTACT) if (!values[k].trim()) errs[k] = `Vui lòng nhập ${labels[k]}`;
    if (!errs.phone && !isValidPhone(values.phone)) errs.phone = 'Số điện thoại không hợp lệ';
    if (!errs.email && !isValidEmail(values.email)) errs.email = 'Email không hợp lệ';
    if (values.zalo.trim() && !isValidPhone(values.zalo)) errs.zalo = 'Số Zalo không hợp lệ';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const nameChanged = values.displayName.trim() !== profile.contact.displayName;
      const next = await profileService.updateContact(profile.accountId, values);
      const pending = next.pendingChanges.some((c) => c.field === 'displayName');
      if (nameChanged && pending) toast.info('Đã gửi yêu cầu thay đổi họ tên, chờ duyệt');
      else toast.success('Đã lưu thông tin');
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ValidationError) setErrors({ [err.field]: err.message });
      else toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-h-[90dvh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Sửa thông tin liên hệ</DialogTitle>
        <DialogDescription>Các trường có dấu * là bắt buộc để gửi hồ sơ.</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Field label={`${labels.displayName} *`} value={values.displayName} error={errors.displayName} onChange={(e) => set('displayName')(e.target.value)} />
          {nameNeedsApproval && <p className="text-xs text-muted-foreground">Thay đổi họ tên cần được duyệt trước khi hiển thị.</p>}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={`${labels.phone} *`} inputMode="tel" value={values.phone} error={errors.phone} onChange={(e) => set('phone')(e.target.value)} />
          <Field label={`${labels.email} *`} type="email" value={values.email} error={errors.email} onChange={(e) => set('email')(e.target.value)} />
          <Field label={labels.zalo} inputMode="tel" value={values.zalo} error={errors.zalo} onChange={(e) => set('zalo')(e.target.value)} />
          <Field label={labels.country} value={values.country} error={errors.country} onChange={(e) => set('country')(e.target.value)} />
          <SelectField label={`${labels.province} *`} value={values.province} options={PROVINCES} onChange={set('province')} error={errors.province} />
          <SelectField label={`${labels.category} *`} value={values.category} options={KOL_CATEGORIES} onChange={set('category')} error={errors.category} />
        </div>
        <Field label={`${labels.address} *`} value={values.address} error={errors.address} onChange={(e) => set('address')(e.target.value)} />
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="submit" className="h-11 md:h-9" disabled={saving}>
            {saving && <Loader2 className="animate-spin" aria-hidden />}
            Lưu
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function StaffDialog({ view, onOpenChange }: { view: ProfileView; onOpenChange(o: boolean): void }) {
  const { profile } = view;
  const [values, setValues] = useState<StaffInfo>(() => ({ ...profile.staff }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const set = (k: StaffKey) => (v: string) => setValues((s) => ({ ...s, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: FieldErrors = {};
    for (const k of REQUIRED_STAFF) if (!values[k].trim()) errs[k] = `Vui lòng nhập ${STAFF_LABELS[k]}`;
    if (!errs.staffPhone && !isValidPhone(values.staffPhone)) errs.staffPhone = 'Số điện thoại không hợp lệ';
    if (values.staffEmail.trim() && !isValidEmail(values.staffEmail)) errs.staffEmail = 'Email không hợp lệ';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await profileService.updateStaff(profile.accountId, values);
      toast.success('Đã lưu thông tin');
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ValidationError) setErrors({ [err.field]: err.message });
      else toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-h-[90dvh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Sửa nhân sự quản lý nội dung</DialogTitle>
        <DialogDescription>Người phụ trách nội dung và hợp tác của hồ sơ.</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label={`${STAFF_LABELS.staffName} *`} value={values.staffName} error={errors.staffName} onChange={(e) => set('staffName')(e.target.value)} />
        <Field label={`${STAFF_LABELS.staffPhone} *`} inputMode="tel" value={values.staffPhone} error={errors.staffPhone} onChange={(e) => set('staffPhone')(e.target.value)} />
        <Field label={STAFF_LABELS.staffEmail} type="email" value={values.staffEmail} error={errors.staffEmail} onChange={(e) => set('staffEmail')(e.target.value)} />
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="submit" className="h-11 md:h-9" disabled={saving}>
            {saving && <Loader2 className="animate-spin" aria-hidden />}
            Lưu
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

/** SCR-04 — contact information and content staff. */
export function ContactTab({ view }: { view: ProfileView }) {
  const { profile } = view;
  const isKol = profile.ownerType === 'KOL';
  const labels = contactLabels(isKol);
  const [editing, setEditing] = useState<'contact' | 'staff' | null>(null);
  const pendingName = view.pendingChanges.find((c) => c.field === 'displayName');
  const close = (o: boolean) => !o && setEditing(null);

  return (
    <div className="space-y-4">
      <SectionCard title="Liên hệ" onEdit={() => setEditing('contact')}>
        {(Object.keys(labels) as ContactKey[]).map((k) => (
          <InfoRow
            key={k}
            label={labels[k]}
            value={profile.contact[k]}
            required={REQUIRED_CONTACT.includes(k)}
            extra={
              k === 'displayName' && typeof pendingName?.newValue === 'string' ? (
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                  <Badge variant="outline" className="border-transparent bg-chart-5/20 font-medium text-foreground">
                    Chờ duyệt
                  </Badge>
                  <span>Tên mới: {pendingName.newValue}</span>
                </div>
              ) : undefined
            }
          />
        ))}
      </SectionCard>

      <SectionCard title="Nhân sự quản lý nội dung" onEdit={() => setEditing('staff')}>
        {(Object.keys(STAFF_LABELS) as StaffKey[]).map((k) => (
          <InfoRow key={k} label={STAFF_LABELS[k]} value={profile.staff[k]} required={REQUIRED_STAFF.includes(k)} />
        ))}
      </SectionCard>

      <Dialog open={editing !== null} onOpenChange={close}>
        {editing === 'contact' && <ContactDialog view={view} onOpenChange={close} />}
        {editing === 'staff' && <StaffDialog view={view} onOpenChange={close} />}
      </Dialog>
    </div>
  );
}

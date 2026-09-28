import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import {
  BIO_MAX,
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
import { FieldBadges } from '../biz-search/KolMedia';
import { InfoRow, SectionCard } from './ProfileSection';
import { ProfileInfoSection } from './ProfileInfoSections';
import { ActivityFieldsEditor, BioField, bioLength, followCategory, initialFields } from './ContactExtras';

/** Plain text contact fields (bio and activity fields have their own editors). */
type ContactKey = Exclude<keyof ContactInfo, 'bio' | 'fields'>;
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
    category: isKol ? 'Lĩnh vực chính' : 'Lĩnh vực',
  };
}

const BIO_PLACEHOLDER = {
  KOL: 'Giới thiệu ngắn về nội dung bạn sáng tạo',
  MCN: 'Giới thiệu ngắn về tổ chức và các kênh bạn quản lý',
} as const;

const STAFF_LABELS: Record<StaffKey, string> = {
  staffName: 'Họ tên nhân sự',
  staffPhone: 'Số điện thoại',
  staffEmail: 'Email',
};

function errorText(e: unknown): string {
  return e instanceof Error && e.message ? e.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

function ContactDialog({ view, onOpenChange }: { view: ProfileView; onOpenChange(o: boolean): void }) {
  const { profile } = view;
  const isKol = profile.ownerType === 'KOL';
  const labels = contactLabels(isKol);
  const pendingName = view.pendingChanges.find((c) => c.field === 'displayName');
  const [values, setValues] = useState<ContactInfo>(() => ({
    ...profile.contact,
    displayName: typeof pendingName?.newValue === 'string' ? pendingName.newValue : profile.contact.displayName,
    bio: profile.contact.bio ?? '',
    fields: initialFields(profile.contact.fields, profile.contact.category),
  }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const nameNeedsApproval = isKol && (profile.status === 'SUBMITTED' || profile.status === 'APPROVED');

  const set = (k: ContactKey) => (v: string) => setValues((s) => ({ ...s, [k]: v }));
  // The first "Lĩnh vực hoạt động" is the category: keep the chips in sync with the select.
  const setCategory = (v: string) =>
    setValues((s) => ({ ...s, category: v, fields: followCategory(s.fields ?? [], v, profile.contact.fields ?? []) }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: FieldErrors = {};
    for (const k of REQUIRED_CONTACT) if (!values[k].trim()) errs[k] = `Vui lòng nhập ${labels[k]}`;
    if (!errs.phone && !isValidPhone(values.phone)) errs.phone = 'Số điện thoại không hợp lệ';
    if (!errs.email && !isValidEmail(values.email)) errs.email = 'Email không hợp lệ';
    if (values.zalo.trim() && !isValidPhone(values.zalo)) errs.zalo = 'Số Zalo không hợp lệ';
    if (bioLength(values.bio ?? '') > BIO_MAX) errs.bio = `Giới thiệu tối đa ${BIO_MAX} ký tự`;
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const nameChanged = values.displayName.trim() !== profile.contact.displayName;
      // Activity fields are a KOL-only public attribute; MCN keeps only the bio.
      const { fields, ...rest } = values;
      const next = await profileService.updateContact(profile.accountId, isKol ? { ...rest, fields } : rest);
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
          <Field label={`${labels.displayName} *`} placeholder="Tên hiển thị công khai" value={values.displayName} error={errors.displayName} onChange={(e) => set('displayName')(e.target.value)} />
          {nameNeedsApproval && <p className="text-xs text-muted-foreground">Thay đổi họ tên cần được duyệt trước khi hiển thị.</p>}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={`${labels.phone} *`} placeholder="0912 345 678" inputMode="tel" value={values.phone} error={errors.phone} onChange={(e) => set('phone')(e.target.value)} />
          <Field label={`${labels.email} *`} placeholder="ban@email.com" type="email" value={values.email} error={errors.email} onChange={(e) => set('email')(e.target.value)} />
          <Field label={labels.zalo} placeholder="Số điện thoại Zalo" inputMode="tel" value={values.zalo} error={errors.zalo} onChange={(e) => set('zalo')(e.target.value)} />
          <Field label={labels.country} placeholder="Việt Nam" value={values.country} error={errors.country} onChange={(e) => set('country')(e.target.value)} />
          <SelectField label={`${labels.province} *`} value={values.province} options={PROVINCES} onChange={set('province')} error={errors.province} />
          <SelectField label={`${labels.category} *`} value={values.category} options={KOL_CATEGORIES} onChange={isKol ? setCategory : set('category')} error={errors.category} />
        </div>
        <Field label={`${labels.address} *`} placeholder="Số nhà, đường, phường/xã, quận/huyện" value={values.address} error={errors.address} onChange={(e) => set('address')(e.target.value)} />
        {isKol && (
          <ActivityFieldsEditor fields={values.fields ?? []} onChange={(fields) => setValues((s) => ({ ...s, fields }))} error={errors.fields} />
        )}
        <BioField
          value={values.bio ?? ''}
          onChange={(bio) => setValues((s) => ({ ...s, bio }))}
          error={errors.bio}
          placeholder={BIO_PLACEHOLDER[profile.ownerType]}
        />
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
        <Field label={`${STAFF_LABELS.staffName} *`} placeholder="Nguyễn Văn An" value={values.staffName} error={errors.staffName} onChange={(e) => set('staffName')(e.target.value)} />
        <Field label={`${STAFF_LABELS.staffPhone} *`} placeholder="0912 345 678" inputMode="tel" value={values.staffPhone} error={errors.staffPhone} onChange={(e) => set('staffPhone')(e.target.value)} />
        <Field label={STAFF_LABELS.staffEmail} placeholder="nhansu@email.com" type="email" value={values.staffEmail} error={errors.staffEmail} onChange={(e) => set('staffEmail')(e.target.value)} />
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

/** SCR-04 — contact information (#lien-he) and content staff (#nhan-su) blocks of "Thông tin hồ sơ". */
export function ContactTab({ view }: { view: ProfileView }) {
  const { profile } = view;
  const isKol = profile.ownerType === 'KOL';
  const labels = contactLabels(isKol);
  const [editing, setEditing] = useState<'contact' | 'staff' | null>(null);
  const pendingName = view.pendingChanges.find((c) => c.field === 'displayName');
  const close = (o: boolean) => !o && setEditing(null);

  return (
    <div className="space-y-4">
      <ProfileInfoSection id="lien-he" label="Liên hệ">
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
          {isKol && (
            <div className="space-y-1 md:col-span-2">
              <dt className="text-xs text-muted-foreground">Lĩnh vực hoạt động</dt>
              <dd>
                {profile.contact.fields?.length ? (
                  <FieldBadges fields={profile.contact.fields} />
                ) : (
                  <span className="text-sm text-muted-foreground">Chưa cập nhật</span>
                )}
              </dd>
            </div>
          )}
          <div className="space-y-0.5 md:col-span-2">
            <dt className="text-xs text-muted-foreground">Giới thiệu</dt>
            <dd className={profile.contact.bio?.trim() ? 'whitespace-pre-line break-words text-sm text-foreground' : 'text-sm text-muted-foreground'}>
              {profile.contact.bio?.trim() || 'Chưa cập nhật'}
            </dd>
          </div>
        </SectionCard>
      </ProfileInfoSection>

      <ProfileInfoSection id="nhan-su" label="Nhân sự quản lý nội dung">
        <SectionCard title="Nhân sự quản lý nội dung" onEdit={() => setEditing('staff')}>
          {(Object.keys(STAFF_LABELS) as StaffKey[]).map((k) => (
            <InfoRow key={k} label={STAFF_LABELS[k]} value={profile.staff[k]} required={REQUIRED_STAFF.includes(k)} />
          ))}
        </SectionCard>
      </ProfileInfoSection>

      <Dialog open={editing !== null} onOpenChange={close}>
        {editing === 'contact' && <ContactDialog view={view} onOpenChange={close} />}
        {editing === 'staff' && <StaffDialog view={view} onOpenChange={close} />}
      </Dialog>
    </div>
  );
}

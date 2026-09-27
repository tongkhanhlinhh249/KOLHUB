import { useEffect, useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { useAuth } from '../../auth/AuthContext';
import { bizAccountService } from '../../services';
import { Field, splitError, type FieldErrors } from '../form/Field';

interface Props {
  open: boolean;
  onOpenChange(open: boolean): void;
}

export function EditBizProfileDialog({ open, onOpenChange }: Props) {
  const { account, setAccount } = useAuth();
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setFullName(account?.fullName ?? '');
      setCompany(account?.company ?? '');
      setErrors({});
      setGeneral(null);
    }
  }, [open, account]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setGeneral(null);
    try {
      const acc = await bizAccountService.updateBizProfile({ fullName, company });
      setAccount(acc);
      toast.success('Đã cập nhật thông tin doanh nghiệp');
      onOpenChange(false);
    } catch (err) {
      const { field, message } = splitError(err, ['fullName', 'company']);
      if (field) setErrors({ [field]: message });
      else setGeneral(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Sửa thông tin doanh nghiệp</DialogTitle>
            <DialogDescription>Thông tin hiển thị trên tài khoản của bạn.</DialogDescription>
          </DialogHeader>
          <Field label="Họ tên" placeholder="Nguyễn Văn An" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} error={errors.fullName} />
          <Field
            label="Tên công ty" placeholder="Công ty TNHH ABC"
            autoComplete="organization"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            error={errors.company}
          />
          {general && (
            <p role="alert" className="text-sm text-destructive">
              {general}
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)} disabled={busy}>
              Huỷ
            </Button>
            <Button type="submit" className="h-11" disabled={busy}>
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';

export function ConsentField({ checked, onChange, error }: { checked: boolean; onChange(v: boolean): void; error?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-3">
        <Checkbox
          id="register-consent"
          checked={checked}
          onCheckedChange={(v) => onChange(v === true)}
          aria-invalid={error ? true : undefined}
          aria-labelledby="register-consent-label"
          className="mt-0.5 size-5 rounded-[6px]"
        />
        <Label id="register-consent-label" htmlFor="register-consent" className="text-sm font-normal leading-snug text-muted-foreground">
          Tôi đồng ý với <span className="font-medium text-primary">Điều khoản sử dụng</span> và{' '}
          <span className="font-medium text-primary">Chính sách bảo mật</span> của KOLHUB.
        </Label>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

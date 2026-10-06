import { useEffect, useId, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { COUNTED_CODES, ekycService, subscribeData, type EkycScenario, type ErrorCode } from '../services';

const OPTIONS: { value: EkycScenario; label: string }[] = [
  { value: 'SUCCESS', label: 'Thành công' },
  { value: 'KOLHUB-4101', label: '4101 Ảnh mờ/lóa' },
  { value: 'KOLHUB-4102', label: '4102 CCCD hết hạn/không chip' },
  { value: 'KOLHUB-4103', label: '4103 Họ tên khác hồ sơ' },
  { value: 'KOLHUB-4104', label: '4104 CCCD thuộc tài khoản khác' },
  { value: 'KOLHUB-4105', label: '4105 Khuôn mặt không khớp' },
  { value: 'KOLHUB-4106', label: '4106 Không vượt kiểm tra người thật' },
  { value: 'KOLHUB-4107', label: '4107 Chưa cấp quyền camera' },
  { value: 'KOLHUB-5101', label: '5101 Lỗi hệ thống' },
];

/** "Kết quả eKYC": which result the fake eKYC provider returns next (until changed). */
export function EkycScenarioPicker() {
  const id = useId();
  const [value, setValue] = useState<EkycScenario>(() => ekycService.getScenario());
  // Keep in sync after a demo data reset.
  useEffect(() => subscribeData(() => setValue(ekycService.getScenario())), []);

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="shrink-0 text-xs text-muted-foreground">
        Kết quả eKYC
      </label>
      <Select
        value={value}
        onValueChange={(v) => {
          ekycService.setScenario(v as EkycScenario);
          setValue(v as EkycScenario);
        }}
      >
        <SelectTrigger id={id} className="h-9 min-w-0 flex-1" aria-label="Kết quả eKYC">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
              {COUNTED_CODES.includes(o.value as ErrorCode) ? ' · tính lần thử' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

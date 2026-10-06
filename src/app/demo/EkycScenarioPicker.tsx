import { useEffect, useId, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
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

/** "Case eKYC" (collapsed, shows the current choice): which result the fake eKYC provider returns next. */
export function EkycScenarioPicker() {
  const baseId = useId();
  const [value, setValue] = useState<EkycScenario>(() => ekycService.getScenario());
  // Keep in sync after a demo data reset.
  useEffect(() => subscribeData(() => setValue(ekycService.getScenario())), []);
  const label = OPTIONS.find((o) => o.value === value)?.label ?? value;

  return (
    <Accordion type="single" collapsible className="rounded-lg bg-muted/60 px-3">
      <AccordionItem value="ekyc" className="border-b-0">
        <AccordionTrigger className="min-h-11 gap-2 py-2 text-left text-sm hover:no-underline md:min-h-9">
          <span className="min-w-0">
            Case eKYC: <span className="font-normal text-muted-foreground">{label}</span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-1.5 pb-3">
          <p className="text-xs text-muted-foreground">Áp dụng cho các lần gửi tiếp theo cho tới khi đổi.</p>
          <RadioGroup
            value={value}
            onValueChange={(v) => {
              ekycService.setScenario(v as EkycScenario);
              setValue(v as EkycScenario);
            }}
            aria-label="Kết quả eKYC giả lập"
            className="gap-0.5"
          >
            {OPTIONS.map((o) => (
              <div key={o.value} className="flex min-h-9 items-center gap-2">
                <RadioGroupItem value={o.value} id={`${baseId}-${o.value}`} aria-labelledby={`${baseId}-${o.value}-label`} />
                <Label id={`${baseId}-${o.value}-label`} htmlFor={`${baseId}-${o.value}`} className="flex-1 font-normal">
                  {o.label}
                </Label>
                {COUNTED_CODES.includes(o.value as ErrorCode) && (
                  <Badge variant="secondary" className="font-normal">
                    tính lần thử
                  </Badge>
                )}
              </div>
            ))}
          </RadioGroup>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

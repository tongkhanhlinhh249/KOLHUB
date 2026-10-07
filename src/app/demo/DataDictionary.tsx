import { Check, Minus } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Badge } from '../components/ui/badge';
import { CAMPAIGN_DATA, SURFACES, type DataField } from './campaignData';

/** Label each surface uses for the field, or "Không hiển thị". */
function SurfaceList({ f }: { f: DataField }) {
  return (
    <ul className="space-y-0.5">
      {SURFACES.map((s) => {
        const label = f.shown[s.key];
        return (
          <li key={s.key} className="flex items-start gap-1.5">
            {label ? <Check className="mt-0.5 size-3 shrink-0 text-primary" aria-hidden /> : <Minus className="mt-0.5 size-3 shrink-0 text-muted-foreground" aria-hidden />}
            <span>
              <span className="font-medium text-foreground">{s.short}:</span>{' '}
              <span className={label ? 'text-foreground/90' : 'text-muted-foreground'}>{label ?? 'Không hiển thị'}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function FieldRow({ f }: { f: DataField }) {
  return (
    <li className="space-y-1.5 py-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-sm font-semibold text-foreground">{f.label}</span>
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground/80">{f.key}</code>
        <Badge variant="outline" className="px-1.5 py-0 font-mono text-[10px] font-normal text-muted-foreground">
          {f.type}
        </Badge>
      </div>
      <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Bắt buộc</dt>
        <dd className="text-foreground/90">{f.required}</dd>
        <dt className="text-muted-foreground">Ràng buộc</dt>
        <dd className="text-foreground/90">{f.rules}</dd>
        {f.note && (
          <>
            <dt className="text-muted-foreground">Ghi chú</dt>
            <dd className="text-foreground/90">{f.note}</dd>
          </>
        )}
        <dt className="text-muted-foreground">Hiển thị ở</dt>
        <dd>
          <SurfaceList f={f} />
        </dd>
      </dl>
    </li>
  );
}

/** "Dữ liệu" mode of Tài liệu nghiệp vụ: every field of a campaign, grouped as in the create form. */
export function DataDictionary() {
  const total = CAMPAIGN_DATA.reduce((n, g) => n + g.fields.length, 0);
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {total} trường của Chiến dịch, theo thứ tự trong form Tạo chiến dịch. “Hiển thị ở” ghi nhãn đang dùng ở từng màn hình; các màn hình đã được đồng nhất nhãn.
      </p>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground" aria-label="Chú thích màn hình">
        {SURFACES.map((s) => (
          <li key={s.key}>
            <span className="font-semibold text-foreground">{s.short}</span> = {s.label}
          </li>
        ))}
      </ul>
      <Accordion type="multiple" defaultValue={[CAMPAIGN_DATA[0].group]} className="rounded-[8px] border border-border px-3">
        {CAMPAIGN_DATA.map((g, i) => (
          <AccordionItem key={g.group} value={g.group} className={i === CAMPAIGN_DATA.length - 1 ? 'border-b-0' : undefined}>
            <AccordionTrigger className="min-h-11 py-2.5 text-left hover:no-underline md:min-h-9">
              <span className="flex-1 space-y-0.5">
                <span className="block text-sm font-semibold text-foreground">
                  {g.group} <span className="font-normal text-muted-foreground tabular-nums">({g.fields.length})</span>
                </span>
                {g.description && <span className="block text-xs font-normal text-muted-foreground">{g.description}</span>}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              <ul className="divide-y divide-border">
                {g.fields.map((f) => (
                  <FieldRow key={f.key} f={f} />
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

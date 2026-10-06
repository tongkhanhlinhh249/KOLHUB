import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { ASSUMPTIONS, PHASE_3_ASSUMPTIONS } from './assumptions';
import { DemoPanelSection } from './DemoPanelSection';

/** "Giả định": temporary decisions of the demo where the business spec is open, collapsed by default. */
export function AssumptionsBlock() {
  return (
    <DemoPanelSection title="Giả định" description="Quyết định tạm, chờ xác nhận.">
      <Accordion type="multiple" className="-mt-1">
        <AccordionItem value="open-questions">
          <AccordionTrigger className="min-h-11 py-2 text-left text-sm md:min-h-9">Câu hỏi mở ({ASSUMPTIONS.length})</AccordionTrigger>
          <AccordionContent className="pb-3">
            <dl className="space-y-2">
              {ASSUMPTIONS.map((a) => (
                <div key={a.question} className="space-y-0.5 text-xs">
                  <dt className="font-medium text-foreground">{a.question}</dt>
                  <dd className="text-muted-foreground">{a.decision}</dd>
                </div>
              ))}
            </dl>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="phase-3" className="border-b-0">
          <AccordionTrigger className="min-h-11 py-2 text-left text-sm md:min-h-9">Nhãn hàng/Agency – Đợt 3 ({PHASE_3_ASSUMPTIONS.length})</AccordionTrigger>
          <AccordionContent className="pb-1">
            <ul className="list-disc space-y-1.5 pl-4 text-xs text-muted-foreground">
              {PHASE_3_ASSUMPTIONS.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </DemoPanelSection>
  );
}

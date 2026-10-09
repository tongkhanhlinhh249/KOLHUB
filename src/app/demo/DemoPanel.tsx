import { useState, type ReactNode } from 'react';
import { FlaskConical } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { kolSafetyReportService, reviewService, violationService } from '../services';
import { useLiveQuery } from '../features/shared/useLiveQuery';
import { AdminSimulator } from './AdminSimulator';
import { AssumptionsBlock } from './AssumptionsBlock';
import { CampaignSimulatorBlock } from './CampaignSimulatorBlock';
import { DemoDataBlock } from './DemoDataBlock';
import { ExternalLinksBlock } from './DemoLinksBlock';
import { DemoGroupHeading } from './DemoPanelSection';
import { DemoRoleBlock } from './DemoRoleBlock';
import { COLLAPSED_SECTIONS, ROLE_SECTION_LABEL, roleOfAccount, sectionsFor, type DemoBlock, type DemoRole } from './demoTabs';
import { FunnelView } from './FunnelView';
import { useRoleSwitch } from './RoleSwitcher';
import { SafetySimulatorBlock } from './SafetySimulatorBlock';
import { SampleProfileBlock } from './SampleProfileBlock';
import { ShieldAppealsBlock } from './ShieldAppealsBlock';
import { ViolationReviewBlock } from './ViolationReviewBlock';

export { DemoPanelSection } from './DemoPanelSection';

/** Pending items for Admin (profiles, changes, eKYC cases, violation reports and appeals, shield appeals), for the section badge. */
function useAdminPending(): number | null {
  const reviews = useLiveQuery(() => reviewService.listAdminQueue(), []);
  const violations = useLiveQuery(() => violationService.adminQueue(), []);
  const shields = useLiveQuery(() => kolSafetyReportService.listShieldAppeals(), []);
  if (!reviews.data || !violations.data || !shields.data) return null;
  const r = reviews.data;
  return r.profiles.length + r.changes.length + r.ekycCases.length + violations.data.pending.length + violations.data.appealed.length + shields.data.length;
}

/**
 * Body of the demo panel: compact "Vai trò" header, then only the signed-in role's section (state switches), then
 * Admin and Hệ thống collapsed at the bottom.
 */
function DemoPanelBody({ onDone }: { onDone(): void }) {
  const { current } = useRoleSwitch(onDone);
  const role = roleOfAccount(current?.key);
  const pending = useAdminPending();

  const block = (r: DemoRole, b: DemoBlock): ReactNode => {
    switch (b) {
      case 'hint':
        return <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">Chọn vai trò ở trên để xem demo</p>;
      case 'profile':
        return (r === 'kol' || r === 'mcn') && <SampleProfileBlock key={current?.key} role={r} onDone={onDone} />;
      case 'safety':
        return (r === 'kol' || r === 'mcn') && <SafetySimulatorBlock key={current?.key} />;
      case 'campaign':
        return r !== 'guest' && <CampaignSimulatorBlock key={current?.key} role={r} onDone={onDone} />;
    }
  };

  return (
    <div className="space-y-3 p-3 pb-safe sm:p-4">
      <DemoRoleBlock onDone={onDone} />
      <div className="space-y-3">
        {role !== 'guest' && <DemoGroupHeading>{ROLE_SECTION_LABEL[role]}</DemoGroupHeading>}
        {sectionsFor(role).map((b) => (
          <div key={b}>{block(role, b)}</div>
        ))}
      </div>
      <Accordion type="multiple" className="rounded-xl border border-border px-3">
        {COLLAPSED_SECTIONS.map((s, i) => (
          <AccordionItem key={s.id} value={s.id} className={i === COLLAPSED_SECTIONS.length - 1 ? 'border-b-0' : undefined}>
            <AccordionTrigger className="min-h-11 gap-2 py-2 text-sm hover:no-underline md:min-h-9">
              <span className="flex flex-1 items-center gap-2">
                {s.label}
                {s.id === 'admin' && pending !== null && pending > 0 && (
                  <Badge className="h-4 min-w-4 rounded-full px-1 py-0 text-[10px] tabular-nums" aria-label={`${pending} mục chờ xử lý`}>
                    {pending}
                  </Badge>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-3">
              {s.id === 'admin' ? (
                <>
                  <AdminSimulator />
                  <ViolationReviewBlock />
                  <ShieldAppealsBlock />
                  <FunnelView />
                </>
              ) : (
                <>
                  <DemoDataBlock onDone={onDone} />
                  <ExternalLinksBlock />
                  <AssumptionsBlock />
                </>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

/** Floating demo control panel. Rendered inside AccessGuard (needs the router). */
export function DemoPanel() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          size="icon"
          aria-label="Bảng điều khiển demo"
          className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 size-12 rounded-full shadow-lg md:bottom-6"
        >
          <FlaskConical className="size-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-x-hidden overflow-y-auto p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-3 pr-12 text-left">
          <SheetTitle>Chế độ demo</SheetTitle>
          <SheetDescription>Công cụ trình diễn, không có trong sản phẩm thật.</SheetDescription>
        </SheetHeader>
        <DemoPanelBody onDone={close} />
      </SheetContent>
    </Sheet>
  );
}

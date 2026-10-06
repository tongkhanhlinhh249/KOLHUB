import { Fragment, useState, type ReactNode } from 'react';
import { FlaskConical } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { reviewService, violationService } from '../services';
import { useLiveQuery } from '../features/shared/useLiveQuery';
import { AdminSimulator } from './AdminSimulator';
import { AssumptionsBlock } from './AssumptionsBlock';
import { CampaignSimulatorBlock } from './CampaignSimulatorBlock';
import { DemoDataBlock } from './DemoDataBlock';
import { DemoLinksBlock, ExternalLinksBlock } from './DemoLinksBlock';
import { DemoGroupHeading } from './DemoPanelSection';
import { DemoRoleBlock } from './DemoRoleBlock';
import { DEMO_TABS, isRoleTab, restoreTab, roleOfAccount, TAB_BLOCKS, type DemoBlock, type DemoTab } from './demoTabs';
import { FunnelView } from './FunnelView';
import { useRoleSwitch } from './RoleSwitcher';
import { SampleProfileBlock } from './SampleProfileBlock';
import { ViolationReviewBlock } from './ViolationReviewBlock';

export { DemoPanelSection } from './DemoPanelSection';

const TAB_KEY = 'kolhub.demo.tab';

function readSavedTab(): unknown {
  try {
    const raw = sessionStorage.getItem(TAB_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Pending items for Admin (profiles, changes, eKYC cases, violation reports and appeals), for the tab badge. */
function useAdminPending(): number | null {
  const reviews = useLiveQuery(() => reviewService.listAdminQueue(), []);
  const violations = useLiveQuery(() => violationService.adminQueue(), []);
  if (!reviews.data || !violations.data) return null;
  const r = reviews.data;
  return r.profiles.length + r.changes.length + r.ekycCases.length + violations.data.pending.length + violations.data.appealed.length;
}

/**
 * Body of the demo panel: compact "Vai trò" header, then one tab per role (Nhãn hàng · KOL · MCN · Admin · Hệ thống)
 * showing only that role's tools. Opens on the signed-in role's tab; a manual choice is kept for the session until
 * the role changes.
 */
function DemoPanelBody({ onDone }: { onDone(): void }) {
  const { current } = useRoleSwitch(onDone);
  const role = roleOfAccount(current?.key);
  const [saved, setSaved] = useState<unknown>(readSavedTab);
  const tab = restoreTab(saved, current?.key);
  const pending = useAdminPending();

  const choose = (t: string) => {
    const next = { tab: t, role };
    setSaved(next);
    try {
      sessionStorage.setItem(TAB_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable (private mode): the choice lasts while the panel is open.
    }
  };

  const block = (t: DemoTab, b: DemoBlock): ReactNode => {
    switch (b) {
      case 'links':
        return isRoleTab(t) && <DemoLinksBlock tab={t} onDone={onDone} />;
      case 'profile':
        return (
          (t === 'kol' || t === 'mcn') && (
            <>
              <DemoGroupHeading>Trạng thái hồ sơ</DemoGroupHeading>
              <SampleProfileBlock tab={t} onDone={onDone} />
            </>
          )
        );
      case 'campaign':
        return (
          isRoleTab(t) && (
            <>
              <DemoGroupHeading>Chiến dịch</DemoGroupHeading>
              <CampaignSimulatorBlock tab={t} onDone={onDone} />
            </>
          )
        );
      case 'admin':
        return <AdminSimulator />;
      case 'violations':
        return <ViolationReviewBlock />;
      case 'funnel':
        return <FunnelView />;
      case 'data':
        return <DemoDataBlock onDone={onDone} />;
      case 'external':
        return <ExternalLinksBlock />;
      case 'assumptions':
        return <AssumptionsBlock />;
    }
  };

  return (
    <div className="space-y-3 p-3 pb-safe sm:p-4">
      <DemoRoleBlock onDone={onDone} />
      <Tabs value={tab} onValueChange={choose}>
        <TabsList aria-label="Công cụ demo theo vai trò" className="flex h-auto w-full gap-0.5 p-1">
          {DEMO_TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="h-9 min-w-0 flex-auto gap-1 px-1.5 text-xs">
              <span className="truncate">{t.label}</span>
              {t.id === 'admin' && pending !== null && pending > 0 && (
                <Badge className="h-4 min-w-4 shrink-0 rounded-full px-1 py-0 text-[10px] tabular-nums" aria-label={`${pending} mục chờ xử lý`}>
                  {pending}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        {DEMO_TABS.map((t) => (
          <TabsContent key={t.id} value={t.id} className="mt-3 space-y-3">
            {TAB_BLOCKS[t.id].map((b) => (
              <Fragment key={b}>{block(t.id, b)}</Fragment>
            ))}
          </TabsContent>
        ))}
      </Tabs>
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

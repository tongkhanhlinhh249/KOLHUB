import { useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { DemoDataBlock } from './DemoDataBlock';
import { DemoRoleBlock } from './DemoRoleBlock';
// --- phase 2 ---
import { AdminSimulator } from './AdminSimulator';
import { EkycScenarioPicker } from './EkycScenarioPicker';
import { FunnelView } from './FunnelView';
import { AssumptionsList } from './AssumptionsList';

export { DemoPanelSection } from './DemoPanelSection';

/**
 * Floating demo control panel. Rendered inside AccessGuard (needs the router).
 * Later phases add blocks as <DemoPanelSection> children below the existing ones.
 */
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
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border p-4 pr-12 text-left">
          <SheetTitle>Chế độ demo</SheetTitle>
          <SheetDescription>Công cụ dành cho buổi trình diễn, không có trong sản phẩm thật.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 p-4 pb-safe">
          <DemoRoleBlock onDone={close} />
          {/* --- phase 2 --- */}
          <AdminSimulator />
          <EkycScenarioPicker />
          <FunnelView />
          {/* --- end phase 2 --- */}
          <DemoDataBlock onDone={close} />
          {/* --- phase 2 --- */}
          <AssumptionsList />
        </div>
      </SheetContent>
    </Sheet>
  );
}

import { lazy, Suspense } from 'react';
import { BookOpen } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { Skeleton } from '../components/ui/skeleton';

// The story data is large: load it only when the sheet opens.
const BusinessDocsBody = lazy(() => import('./BusinessDocsBody'));

/** Floating "Tài liệu nghiệp vụ" button of the demo (above the demo panel button): user stories R0 → R6. */
export function BusinessDocsPanel() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label="Tài liệu nghiệp vụ"
          title="Tài liệu nghiệp vụ"
          className="fixed right-4 bottom-[calc(9rem+env(safe-area-inset-bottom))] z-40 size-12 rounded-full border-primary/30 bg-card text-primary shadow-lg hover:bg-primary/5 hover:text-primary md:bottom-[5.5rem]"
        >
          <BookOpen className="size-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-x-hidden overflow-y-auto p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-border px-4 py-3 pr-12 text-left">
          <SheetTitle>Tài liệu nghiệp vụ</SheetTitle>
          <SheetDescription>User story Chiến dịch, Sàn chiến dịch, EP-01 Hồ sơ & xác thực kênh và EP-02 Tạo, đăng & quản lý chiến dịch theo đợt, đối soát với prototype. Mã lỗi là KOLHUB-xxxx.</SheetDescription>
        </SheetHeader>
        <Suspense
          fallback={
            <div className="space-y-3 p-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          }
        >
          <BusinessDocsBody />
        </Suspense>
      </SheetContent>
    </Sheet>
  );
}

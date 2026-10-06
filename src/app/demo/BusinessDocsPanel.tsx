import { useState } from 'react';
import { AlertTriangle, BookOpen } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { cn } from '../components/ui/utils';
import { ALL_STORIES, EPICS, epicName, RELEASES, STORY_ROLES, storiesFor, type StoryRole, type UserStory } from './userStories';

const CONFIRM_COUNT = ALL_STORIES.filter((s) => s.confirm).length;

function StoryItem({ s }: { s: UserStory }) {
  return (
    <AccordionItem value={s.id}>
      <AccordionTrigger className="min-h-11 gap-3 py-2.5 text-left hover:no-underline md:min-h-9">
        <span className="flex min-w-0 flex-1 items-start gap-2.5">
          <span className="mt-0.5 w-10 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{s.id}</span>
          <span className="min-w-0 flex-1 space-y-1">
            <span className="block text-sm font-medium text-foreground">{s.title}</span>
            <span className="flex flex-wrap items-center gap-1">
              <Badge variant="secondary" className="px-1.5 py-0 text-[11px] font-medium">
                {s.epic} · {epicName(s.epic)}
              </Badge>
              {s.roles.map((r) => (
                <Badge key={r} variant="outline" className="px-1.5 py-0 text-[11px] font-normal text-muted-foreground">
                  {r}
                </Badge>
              ))}
            </span>
          </span>
          {s.confirm && <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-label="Có điểm cần BA xác nhận" />}
        </span>
      </AccordionTrigger>
      <AccordionContent className="space-y-3 pb-4 pl-[3.125rem] text-sm">
        <p className="text-muted-foreground italic">{s.story}</p>
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-foreground">Tiêu chí nghiệm thu</h4>
          <ul className="list-disc space-y-1 pl-4 text-foreground/90">
            {s.criteria.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
        {s.confirm && (
          <div className="flex gap-2 rounded-[8px] border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
            <AlertTriangle className="mt-px size-4 shrink-0 text-amber-600" aria-hidden />
            <p>
              <span className="font-semibold">Cần BA xác nhận:</span> {s.confirm}
            </p>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Nguồn: spec chiến dịch & booking {s.source}</p>
      </AccordionContent>
    </AccordionItem>
  );
}

function DocsBody() {
  const [role, setRole] = useState<StoryRole | null>(null);

  return (
    <div className="space-y-4 p-4 pb-safe">
      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'User story', value: ALL_STORIES.length },
          { label: 'Epic', value: EPICS.length },
          { label: 'Cần BA xác nhận', value: CONFIRM_COUNT },
        ].map((m) => (
          <div key={m.label} className="rounded-[8px] bg-muted px-2 py-2">
            <dd className="text-lg font-semibold text-foreground tabular-nums">{m.value}</dd>
            <dt className="text-[11px] text-muted-foreground">{m.label}</dt>
          </div>
        ))}
      </dl>

      <div role="group" aria-label="Lọc theo vai trò" className="flex flex-wrap gap-1.5">
        {[null, ...STORY_ROLES].map((r) => {
          const active = role === r;
          return (
            <button
              key={r ?? 'all'}
              type="button"
              aria-pressed={active}
              onClick={() => setRole(r)}
              className={cn(
                'h-9 rounded-full border px-3 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:h-7',
                active ? 'border-primary bg-primary/10 font-semibold text-primary' : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {r ?? 'Tất cả vai trò'}
            </button>
          );
        })}
      </div>

      <Tabs defaultValue="R0">
        <TabsList className="grid h-auto w-full grid-cols-6">
          {RELEASES.map((r) => (
            <TabsTrigger key={r.key} value={r.key} className="flex-col gap-0 px-1 py-1">
              <span className="text-sm font-semibold">{r.key}</span>
              <span className="text-[11px] font-normal text-muted-foreground tabular-nums">{storiesFor(r, role).length} US</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {RELEASES.map((r) => {
          const stories = storiesFor(r, role);
          return (
            <TabsContent key={r.key} value={r.key} className="mt-3 space-y-2">
              <div className="space-y-1 border-l-2 border-primary pl-3">
                <h3 className="text-sm font-semibold text-foreground">
                  {r.key} · {r.name}
                </h3>
                <p className="text-xs text-muted-foreground">{r.goal}</p>
              </div>
              {stories.length > 0 ? (
                <Accordion type="multiple">
                  {stories.map((s) => (
                    <StoryItem key={s.id} s={s} />
                  ))}
                </Accordion>
              ) : (
                <p className="rounded-[8px] bg-muted p-3 text-sm text-muted-foreground">Đợt này không có US cho vai trò {role}.</p>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

/** Floating "Tài liệu nghiệp vụ" button of the demo (above the demo panel button): user stories R0 → R5. */
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
          <SheetDescription>User story Chiến dịch của tôi & Sàn chiến dịch, chia theo đợt R0 → R5.</SheetDescription>
        </SheetHeader>
        <DocsBody />
      </SheetContent>
    </Sheet>
  );
}

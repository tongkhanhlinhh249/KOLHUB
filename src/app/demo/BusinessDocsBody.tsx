import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Badge } from '../components/ui/badge';
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
      <AccordionContent className="space-y-3 pb-4 text-sm md:pl-[3.125rem]">
        <p className="text-muted-foreground italic">{s.story}</p>
        <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1.5 rounded-[8px] bg-muted/60 p-2.5 text-xs">
          <dt className="font-semibold text-foreground">Màn hình</dt>
          <dd className="space-y-0.5 text-foreground/90">
            {s.screens.map((x) => (
              <div key={x}>{x}</div>
            ))}
          </dd>
          {s.api.length > 0 && (
            <>
              <dt className="font-semibold text-foreground">API</dt>
              <dd className="min-w-0 space-y-0.5 font-mono text-[11px] break-words text-foreground/90">
                {s.api.map((x) => (
                  <div key={x}>{x}</div>
                ))}
              </dd>
            </>
          )}
          {s.states && (
            <>
              <dt className="font-semibold text-foreground">Trạng thái</dt>
              <dd className="min-w-0 text-foreground/90">{s.states}</dd>
            </>
          )}
        </dl>
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-foreground">Quy tắc nghiệm thu</h4>
          <ul className="list-disc space-y-1 pl-4 text-foreground/90">
            {s.rules.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
        {s.errors && s.errors.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-foreground">Lỗi</h4>
            <ul className="divide-y divide-border rounded-[8px] border border-border text-xs sm:hidden">
              {s.errors.map((e) => (
                <li key={e.code + e.when} className="space-y-0.5 px-2.5 py-2">
                  <p>
                    <span className="font-mono font-semibold tabular-nums">{e.code}</span>
                    <span className="text-foreground/90"> · {e.when}</span>
                  </p>
                  <p className="text-muted-foreground">{e.message}</p>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-hidden rounded-[8px] border border-border sm:block">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Mã</th>
                    <th className="px-2 py-1.5 font-medium">Khi nào</th>
                    <th className="px-2 py-1.5 font-medium">Thông báo hiển thị</th>
                  </tr>
                </thead>
                <tbody>
                  {s.errors.map((e) => (
                    <tr key={e.code + e.when} className="border-t border-border align-top">
                      <td className="px-2 py-1.5 font-mono tabular-nums">{e.code}</td>
                      <td className="px-2 py-1.5 text-foreground/90">{e.when}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {s.notes && s.notes.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-foreground">Ghi chú</h4>
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
              {s.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        )}
        {s.confirm && (
          <div className="flex gap-2 rounded-[8px] border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
            <AlertTriangle className="mt-px size-4 shrink-0 text-amber-600" aria-hidden />
            <p>
              <span className="font-semibold">Cần BA xác nhận:</span> {s.confirm}
            </p>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Nguồn: {s.source}</p>
      </AccordionContent>
    </AccordionItem>
  );
}

/** Body of the "Tài liệu nghiệp vụ" sheet (lazy-loaded with the story data). */
export default function BusinessDocsBody() {
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
        <TabsList className="grid h-auto w-full" style={{ gridTemplateColumns: `repeat(${RELEASES.length}, minmax(0, 1fr))` }}>
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

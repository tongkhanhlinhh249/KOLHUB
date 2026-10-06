import { useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { cn } from '../components/ui/utils';
import { GLOSSARY, RELEASE_PLAIN, STORY_STEPS } from './storySteps';
import { ALL_STORIES, EPICS, epicName, RELEASES, STORY_ROLES, storiesFor, type EpicKey, type StoryRole, type UserStory } from './userStories';

type Mode = 'plain' | 'dev';

const CONFIRM_COUNT = ALL_STORIES.filter((s) => s.confirm).length;
const MODE_KEY = 'kolhub.docs.mode';
const CHECKS_KEY = 'kolhub.docs.checks';
const ALL_EPICS = 'all';

// Per-viewer conveniences only (remembered mode, ticked checklist items); the page works without storage.
function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private window, blocked): keep the in-memory state only.
  }
}

function RoleBadges({ roles }: { roles: StoryRole[] }) {
  return (
    <>
      {roles.map((r) => (
        <Badge key={r} variant="outline" className="px-1.5 py-0 text-[11px] font-normal text-muted-foreground">
          {r}
        </Badge>
      ))}
    </>
  );
}

/** "Dễ hiểu": one summary line, then a checklist per screen in walking order. */
function PlainStoryItem({ s, checked, onToggle }: { s: UserStory; checked: Set<string>; onToggle(key: string): void }) {
  const plain = STORY_STEPS[s.id];
  const total = plain.steps.reduce((n, st) => n + st.checks.length, 0);
  const done = plain.steps.reduce((n, st, i) => n + st.checks.filter((_, j) => checked.has(`${s.id}:${i}:${j}`)).length, 0);
  return (
    <AccordionItem value={s.id}>
      <AccordionTrigger className="min-h-11 gap-3 py-2.5 text-left hover:no-underline md:min-h-9">
        <span className="flex min-w-0 flex-1 items-start gap-2.5">
          <span className="mt-0.5 w-10 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{s.id}</span>
          <span className="min-w-0 flex-1 space-y-1">
            <span className="block text-sm font-medium text-foreground">{plain.title}</span>
            <span className="flex flex-wrap items-center gap-1">
              <RoleBadges roles={s.roles} />
            </span>
          </span>
          <span className={cn('mt-0.5 shrink-0 text-xs tabular-nums', done === total ? 'font-semibold text-emerald-700' : 'text-muted-foreground')}>
            {done}/{total}
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="space-y-3 pb-4 text-sm md:pl-[3.125rem]">
        <p className="text-foreground">{plain.summary}</p>
        <ol className="space-y-3">
          {plain.steps.map((st, i) => (
            <li key={st.screen} className="space-y-1.5">
              <p className="flex items-start gap-2 text-xs font-semibold text-foreground">
                <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] text-primary tabular-nums">{i + 1}</span>
                <span className="pt-0.5">{st.screen}</span>
              </p>
              <ul className="space-y-1 pl-7">
                {st.checks.map((c, j) => {
                  const key = `${s.id}:${i}:${j}`;
                  const on = checked.has(key);
                  return (
                    <li key={c}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => onToggle(key)}
                        className="flex w-full items-start gap-2 rounded-[6px] py-0.5 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        <span
                          className={cn(
                            'mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border',
                            on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card',
                          )}
                        >
                          {on && <Check className="size-3" aria-hidden />}
                        </span>
                        <span className={cn('text-[13px]', on ? 'text-muted-foreground line-through' : 'text-foreground/90')}>{c}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
        {s.confirm && (
          <p className="flex gap-2 rounded-[8px] border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
            <AlertTriangle className="mt-px size-4 shrink-0 text-amber-600" aria-hidden />
            <span>Có điểm đang chờ BA chốt — xem ở chế độ "Cho dev".</span>
          </p>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

/** "Cho dev": screens, API, states, rules, errors, notes, source. */
function DevStoryItem({ s }: { s: UserStory }) {
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
              <RoleBadges roles={s.roles} />
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
  const [mode, setModeState] = useState<Mode>(() => (readStorage<string>(MODE_KEY, 'plain') === 'dev' ? 'dev' : 'plain'));
  const [role, setRole] = useState<StoryRole | null>(null);
  const [epic, setEpic] = useState<EpicKey | null>(null);
  const [checked, setChecked] = useState<Set<string>>(() => new Set(readStorage<string[]>(CHECKS_KEY, [])));

  const setMode = (m: Mode) => {
    setModeState(m);
    writeStorage(MODE_KEY, m);
  };
  const toggleCheck = (key: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      writeStorage(CHECKS_KEY, [...next]);
      return next;
    });
  };
  const plain = mode === 'plain';
  const filtered = RELEASES.reduce((n, r) => n + storiesFor(r, role, epic).length, 0);
  const firstWithStories = RELEASES.find((r) => storiesFor(r, role, epic).length > 0)?.key ?? 'R0';

  return (
    <div className="space-y-4 p-4 pb-safe">
      <div role="radiogroup" aria-label="Cách đọc" className="grid grid-cols-2 gap-1 rounded-[8px] bg-muted p-1">
        {(
          [
            { key: 'plain', label: 'Dễ hiểu', hint: 'Từng bước theo màn hình' },
            { key: 'dev', label: 'Cho dev', hint: 'API, quy tắc, mã lỗi' },
          ] as const
        ).map((m) => (
          <button
            key={m.key}
            type="button"
            role="radio"
            aria-checked={mode === m.key}
            onClick={() => setMode(m.key)}
            className={cn(
              'rounded-[6px] px-2 py-1.5 text-center transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              mode === m.key ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span className="block text-sm font-semibold">{m.label}</span>
            <span className="block text-[11px] text-muted-foreground">{m.hint}</span>
          </button>
        ))}
      </div>

      {plain ? (
        <Accordion type="single" collapsible className="rounded-[8px] border border-border px-3">
          <AccordionItem value="glossary" className="border-b-0">
            <AccordionTrigger className="min-h-11 py-2 text-sm hover:no-underline md:min-h-9">Giải nghĩa từ ngữ</AccordionTrigger>
            <AccordionContent className="pb-3">
              <dl className="space-y-1.5 text-xs">
                {GLOSSARY.map((g) => (
                  <div key={g.term}>
                    <dt className="inline font-semibold text-foreground">{g.term}: </dt>
                    <dd className="inline text-muted-foreground">{g.meaning}</dd>
                  </div>
                ))}
              </dl>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : (
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
      )}

      <div className="space-y-2">
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
        <div className="flex items-center gap-2">
          <Select value={epic ?? ALL_EPICS} onValueChange={(v) => setEpic(v === ALL_EPICS ? null : (v as EpicKey))}>
            <SelectTrigger aria-label="Lọc theo Epic" className="h-9 flex-1 text-xs md:h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_EPICS}>Tất cả Epic</SelectItem>
              {EPICS.map((e) => (
                <SelectItem key={e.key} value={e.key}>
                  {e.key} · {e.name} ({ALL_STORIES.filter((s) => s.epic === e.key).length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(role || epic) && (
            <button
              type="button"
              onClick={() => {
                setRole(null);
                setEpic(null);
              }}
              className="h-9 shrink-0 rounded-[6px] px-2 text-xs text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:h-8"
            >
              Bỏ lọc ({filtered})
            </button>
          )}
        </div>
      </div>

      <Tabs key={`${role}-${epic}`} defaultValue={firstWithStories}>
        <TabsList className="grid h-auto w-full" style={{ gridTemplateColumns: `repeat(${RELEASES.length}, minmax(0, 1fr))` }}>
          {RELEASES.map((r) => {
            const n = storiesFor(r, role, epic).length;
            return (
              <TabsTrigger key={r.key} value={r.key} className={cn('flex-col gap-0 px-1 py-1', n === 0 && 'opacity-50')}>
                <span className="text-sm font-semibold">{r.key}</span>
                <span className="text-[11px] font-normal text-muted-foreground tabular-nums">{n} US</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
        {RELEASES.map((r) => {
          const stories = storiesFor(r, role, epic);
          const name = plain ? RELEASE_PLAIN[r.key].name : r.name;
          const goal = plain ? RELEASE_PLAIN[r.key].goal : r.goal;
          return (
            <TabsContent key={r.key} value={r.key} className="mt-3 space-y-2">
              <div className="space-y-1 border-l-2 border-primary pl-3">
                <h3 className="text-sm font-semibold text-foreground">
                  {r.key} · {name}
                </h3>
                <p className="text-xs text-muted-foreground">{goal}</p>
              </div>
              {stories.length > 0 ? (
                <Accordion type="multiple">
                  {stories.map((s) => (plain ? <PlainStoryItem key={s.id} s={s} checked={checked} onToggle={toggleCheck} /> : <DevStoryItem key={s.id} s={s} />))}
                </Accordion>
              ) : (
                <p className="rounded-[8px] bg-muted p-3 text-sm text-muted-foreground">Đợt này không có US khớp bộ lọc.</p>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

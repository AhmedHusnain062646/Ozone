// ABOUTME: Shared console layout for seller and admin: title and section links in a sidebar, the current section beside it.
// ABOUTME: Sections are ?tab= links; below lg the sidebar becomes a header block with a horizontally scrolling link row.
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cx } from '../../lib/cx.ts';

export interface ConsoleItem {
  id: string;
  label: string;
  count?: number;
}

interface ConsoleShellProps {
  title: string;
  meta?: ReactNode;
  items: ConsoleItem[];
  current: string;
  graphite?: boolean;
  sidebarExtra?: ReactNode;
  children: ReactNode;
}

export function ConsoleShell({ title, meta, items, current, graphite, sidebarExtra, children }: ConsoleShellProps) {
  const line = graphite ? 'border-graphite-line' : 'border-linen';
  return (
    <div className={cx('min-h-[calc(100dvh-4rem-1px)] text-sm', graphite && 'on-graphite bg-graphite text-bone')}>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-margin py-6 md:px-8 lg:flex-row lg:gap-8 lg:py-8">
        <div className="min-w-0 lg:w-60 lg:shrink-0">
          <h1 className="font-display text-2xl leading-8 [overflow-wrap:anywhere]">{title}</h1>
          {meta && <div className="mt-2 space-y-2">{meta}</div>}
          <nav aria-label="Console" className={cx('relative mt-5 flex gap-1 overflow-x-auto border-y py-2 lg:flex-col lg:overflow-visible', line)}>
            {items.map((item) => {
              const selected = item.id === current;
              return (
                <Link
                  key={item.id}
                  to={`?tab=${item.id}`}
                  replace
                  aria-current={selected ? 'page' : undefined}
                  className={cx(
                    'flex min-h-10 shrink-0 items-center justify-between gap-3 rounded-sm px-3 font-medium focus-visible:-outline-offset-2',
                    selected
                      ? graphite ? 'bg-bone/10 text-mint' : 'bg-milk text-teal'
                      : graphite ? 'text-bone/80 hover:bg-bone/5 hover:text-bone' : 'text-sage hover:bg-milk hover:text-ink',
                  )}
                >
                  {item.label}{' '}
                  {!!item.count && (
                    <span className={cx('font-numeric rounded-sm border px-1.5 text-xs leading-5', line)}>
                      {item.count}
                      <span className="sr-only"> waiting</span>
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          {sidebarExtra && <div className="mt-4">{sidebarExtra}</div>}
        </div>
        <section aria-labelledby="console-section-heading" className="min-w-0 flex-1">
          <h2 id="console-section-heading" className="mb-5 font-sans text-lg font-semibold">
            {items.find((item) => item.id === current)?.label}
          </h2>
          {children}
        </section>
      </div>
    </div>
  );
}

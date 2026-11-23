// ABOUTME: Accessible tab list (WAI-ARIA tabs pattern): roving tabindex, Arrow/Home/End keys, controlled value.
// ABOUTME: Renders only the tab buttons; the caller renders the active panel with id `${idPrefix}-panel`.
import { useRef } from 'react';
import { cx } from '../../lib/cx.ts';

export interface TabItem {
  id: string;
  label: string;
}

export function Tabs({ tabs, value, onChange, idPrefix, graphite }: { tabs: TabItem[]; value: string; onChange: (id: string) => void; idPrefix: string; graphite?: boolean }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const move = (index: number) => {
    const next = (index + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  };
  return (
    <div role="tablist" aria-orientation="horizontal" className={cx('flex gap-1 overflow-x-auto border-b', graphite ? 'border-graphite-line' : 'border-linen')}>
      {tabs.map((t, i) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`${idPrefix}-tab-${t.id}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') (e.preventDefault(), move(i + 1));
              else if (e.key === 'ArrowLeft') (e.preventDefault(), move(i - 1));
              else if (e.key === 'Home') (e.preventDefault(), move(0));
              else if (e.key === 'End') (e.preventDefault(), move(tabs.length - 1));
            }}
            className={cx(
              'label-caps min-h-11 shrink-0 border-b-2 px-4 py-2 transition-colors',
              selected ? (graphite ? 'border-mint text-mint' : 'border-teal text-teal') : 'border-transparent text-sage hover:text-ink',
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

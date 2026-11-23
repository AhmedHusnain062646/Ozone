// ABOUTME: Loading placeholder block; decorative, so hidden from assistive tech (the region carries aria-busy).
// ABOUTME: Pulse animation is neutralised under prefers-reduced-motion by the global rule in index.css.
import { cx } from '../../lib/cx.ts';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx('animate-pulse rounded-sm bg-linen/70', className)} />;
}

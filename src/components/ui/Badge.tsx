// ABOUTME: Compact rectangular badge (label-caps, 4px radius, hairline border). "gold" is the verified-atelier mark.
// ABOUTME: Tones use desaturated functional colours; text colours are AA-safe on bone/milk.
import type { ReactNode } from 'react';
import { cx } from '../../lib/cx.ts';

export type BadgeTone = 'neutral' | 'gold' | 'success' | 'warning' | 'danger' | 'info' | 'dark';

const tones: Record<BadgeTone, string> = {
  neutral: 'border-linen-strong text-sage bg-transparent',
  gold: 'border-gold text-gold-ink bg-gold-wash',
  success: 'border-success text-success bg-transparent',
  warning: 'border-warning text-[#7a5410] bg-transparent',
  danger: 'border-danger text-danger bg-transparent',
  info: 'border-info text-info bg-transparent',
  dark: 'border-mint text-mint bg-transparent',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={cx('label-caps inline-flex items-center rounded-sm border px-2 py-0.5', tones[tone], className)}>
      {children}
    </span>
  );
}

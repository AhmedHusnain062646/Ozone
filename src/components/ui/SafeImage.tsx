// ABOUTME: <img> that swaps to an inline placeholder when the (possibly remote) URL fails to load.
// ABOUTME: Keeps layout stable via the caller's sizing classes; alt text is required.
import { useState, type ImgHTMLAttributes } from 'react';
import { cx } from '../../lib/cx.ts';

export function SafeImage({ alt, className, onError, ...rest }: ImgHTMLAttributes<HTMLImageElement> & { alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed || !rest.src) {
    return (
      <div role="img" aria-label={alt} className={cx('flex items-center justify-center bg-linen text-sage', className)}>
        <span className="label-caps">No image</span>
      </div>
    );
  }
  return (
    <img
      alt={alt}
      loading="lazy"
      className={className}
      onError={(e) => {
        setFailed(true);
        onError?.(e);
      }}
      {...rest}
    />
  );
}

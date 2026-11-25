// ABOUTME: Full-page NotFound, Forbidden, loading and failed-to-load screens used by the router.
// ABOUTME: Both are plain content (no data fetching) so they render even if the API is down.
import { Link } from 'react-router';
import { EmptyState, ErrorState, Skeleton } from '../ui/index.ts';

const home = (
  <Link to="/" className="label-caps text-teal underline underline-offset-4">
    Back to the collection
  </Link>
);

export const NotFound = () => (
  <div className="mx-auto max-w-3xl px-margin py-24">
    <EmptyState title="Page not found" message="The page you are looking for does not exist or has moved." action={home} />
  </div>
);

export const Forbidden = () => (
  <div className="mx-auto max-w-3xl px-margin py-24">
    <EmptyState title="Access restricted" message="Your account does not have permission to view this area." action={home} />
  </div>
);

/** Shown on a direct visit while a code-split screen downloads. */
export const PageLoading = () => (
  <div className="mx-auto max-w-3xl space-y-3 px-margin py-24" aria-busy="true">
    <span className="sr-only">Loading</span>
    <Skeleton className="h-8 w-1/3" />
    <Skeleton className="h-40 w-full" />
  </div>
);

/** A screen failed to download (offline, or replaced by a newer deploy) or crashed while rendering. */
export const PageError = () => (
  <div className="mx-auto max-w-3xl px-margin py-24">
    <ErrorState message="This page could not be loaded." onRetry={() => window.location.reload()} />
  </div>
);

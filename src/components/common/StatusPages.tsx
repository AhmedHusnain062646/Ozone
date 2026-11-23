// ABOUTME: Full-page NotFound and Forbidden screens used by the router.
// ABOUTME: Both are plain content (no data fetching) so they render even if the API is down.
import { Link } from 'react-router';
import { EmptyState } from '../ui/index.ts';

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

// ABOUTME: Wire types for the Ozone API (money in integer cents, ids are uuids, dates are ISO UTC strings).
// ABOUTME: Mirrors server responses; the API client is the only module that should construct them.

export type UserRole = 'buyer' | 'seller' | 'admin';

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  sellerId: string | null;
}

// ABOUTME: The single typed API client. Every network call in the SPA goes through `request`.
// ABOUTME: Server errors arrive as { error: { code, message, details } } and surface as ApiError.
import type { CartData, CatalogQuery, CheckoutInput, OrderData, CategoryData, Paginated, ProductCardData, ProductDetailData, SessionUser } from './types.ts';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

async function request<T>(method: Method, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check your connection and try again.');
  }
  if (res.status === 204) return undefined as T;
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const err = payload?.error;
    throw new ApiError(res.status, err?.code ?? 'UNKNOWN', err?.message ?? `Request failed (${res.status})`, err?.details);
  }
  return payload.data as T;
}

/** Builds "?a=1&b=2" from defined, non-empty values. */
export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>('GET', path, undefined, signal),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: <T = void>(path: string) => request<T>('DELETE', path),

  auth: {
    me: () => request<SessionUser>('GET', '/auth/me'),
    login: (input: { email: string; password: string }) => request<SessionUser>('POST', '/auth/login', input),
    register: (input: { email: string; password: string; displayName: string }) =>
      request<SessionUser>('POST', '/auth/register', input),
    logout: () => request<void>('POST', '/auth/logout', {}),
  },

  catalog: {
    list: (query: CatalogQuery, signal?: AbortSignal) =>
      request<Paginated<ProductCardData>>('GET', `/catalog/products${qs({ ...query })}`, undefined, signal),
    detail: (slug: string) => request<ProductDetailData>('GET', `/catalog/products/${encodeURIComponent(slug)}`),
    categories: () => request<CategoryData[]>('GET', '/catalog/categories'),
  },

  wishlist: {
    list: () => request<ProductCardData[]>('GET', '/wishlist'),
    add: (productId: string) => request<void>('PUT', `/wishlist/${productId}`, {}),
    remove: (productId: string) => request<void>('DELETE', `/wishlist/${productId}`),
  },

  cart: {
    get: () => request<CartData>('GET', '/cart'),
    add: (variantId: string, quantity: number) => request<CartData>('POST', '/cart/items', { variantId, quantity }),
    setQuantity: (variantId: string, quantity: number) => request<CartData>('PATCH', `/cart/items/${variantId}`, { quantity }),
    remove: (variantId: string) => request<void>('DELETE', `/cart/items/${variantId}`),
    clear: () => request<void>('DELETE', '/cart'),
  },

  checkout: {
    place: (input: CheckoutInput) => request<OrderData>('POST', '/checkout', input),
  },

  orders: {
    list: () => request<OrderData[]>('GET', '/orders'),
    get: (code: string) => request<OrderData>('GET', `/orders/${encodeURIComponent(code)}`),
  },

  reviews: {
    create: (productId: string, input: { rating: number; title: string; comment: string }) =>
      request<{ id: string }>('POST', `/products/${productId}/reviews`, input),
  },
};

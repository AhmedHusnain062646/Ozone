// ABOUTME: Wishlist (per-user, idempotent) and review rules (delivered purchase only, one per buyer per product).
// ABOUTME: Reviews recompute the product's average rating and count from rows, never from a client value.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.ts';
import { closeDb } from '../db/client.ts';
import { makePurchase, makeVariant, resetDb, signedInAgent } from './helpers.ts';

const app = createApp();
afterAll(closeDb);
const review = { rating: 5, title: 'Exquisite', comment: 'Worth the wait.' };

describe('wishlist', () => {
  beforeEach(resetDb);

  it('requires sign-in', async () => {
    const { product } = await makeVariant({ stock: 1 });
    expect((await request(app).get('/api/wishlist')).status).toBe(401);
    expect((await request(app).put(`/api/wishlist/${product.id}`)).status).toBe(401);
  });

  it('adds idempotently, lists, removes, and is isolated per user', async () => {
    const { product } = await makeVariant({ stock: 1 });
    const a = await signedInAgent(app);
    const b = await signedInAgent(app);
    expect((await a.agent.put(`/api/wishlist/${product.id}`)).status).toBe(204);
    expect((await a.agent.put(`/api/wishlist/${product.id}`)).status).toBe(204); // second add: no error, no duplicate
    const mine = await a.agent.get('/api/wishlist');
    expect(mine.body.data.map((p: { id: string }) => p.id)).toEqual([product.id]);
    expect((await b.agent.get('/api/wishlist')).body.data).toEqual([]);
    expect((await a.agent.delete(`/api/wishlist/${product.id}`)).status).toBe(204);
    expect((await a.agent.delete(`/api/wishlist/${product.id}`)).status).toBe(204);
    expect((await a.agent.get('/api/wishlist')).body.data).toEqual([]);
  });

  it('404s for an unknown product and 400s for a malformed id', async () => {
    const a = await signedInAgent(app);
    expect((await a.agent.put('/api/wishlist/00000000-0000-4000-8000-000000000000')).status).toBe(404);
    expect((await a.agent.put('/api/wishlist/not-a-uuid')).status).toBe(400);
  });
});

describe('reviews', () => {
  beforeEach(resetDb);

  it('requires sign-in', async () => {
    const { product } = await makeVariant({ stock: 1 });
    expect((await request(app).post(`/api/products/${product.id}/reviews`).send(review)).status).toBe(401);
  });

  it('rejects a buyer with no purchase, or a purchase that is not DELIVERED yet', async () => {
    const { product, variant } = await makeVariant({ stock: 1 });
    const { agent, user } = await signedInAgent(app);
    const none = await agent.post(`/api/products/${product.id}/reviews`).send(review);
    expect(none.status).toBe(403);
    expect(none.body.error.code).toBe('REVIEW_REQUIRES_DELIVERED_PURCHASE');
    await makePurchase(user.id, { product, variant }, 'SHIPPED');
    expect((await agent.post(`/api/products/${product.id}/reviews`).send(review)).status).toBe(403);
  });

  it("does not let one buyer review on the strength of another buyer's delivery", async () => {
    const { product, variant } = await makeVariant({ stock: 1 });
    const owner = await signedInAgent(app);
    const other = await signedInAgent(app);
    await makePurchase(owner.user.id, { product, variant });
    expect((await other.agent.post(`/api/products/${product.id}/reviews`).send(review)).status).toBe(403);
  });

  it('accepts one review after delivery, then 409s a second; aggregates come from rows', async () => {
    const { product, variant } = await makeVariant({ stock: 1 });
    const a = await signedInAgent(app);
    const b = await signedInAgent(app);
    await makePurchase(a.user.id, { product, variant });
    await makePurchase(b.user.id, { product, variant });

    const first = await a.agent.post(`/api/products/${product.id}/reviews`).send({ ...review, rating: 5 });
    expect(first.status).toBe(201);
    const dup = await a.agent.post(`/api/products/${product.id}/reviews`).send({ ...review, rating: 1 });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('ALREADY_REVIEWED');
    await b.agent.post(`/api/products/${product.id}/reviews`).send({ ...review, rating: 2 });

    const detail = await request(app).get(`/api/catalog/products/${product.slug}`);
    expect(detail.body.data.reviewCount).toBe(2);
    expect(detail.body.data.rating).toBeCloseTo(3.5, 5);
    expect(detail.body.data.reviews.every((r: { verifiedPurchase: boolean }) => r.verifiedPurchase)).toBe(true);
  });

  it('validates rating range and text; the buyer id comes from the session, not the body', async () => {
    const { product, variant } = await makeVariant({ stock: 1 });
    const a = await signedInAgent(app);
    await makePurchase(a.user.id, { product, variant });
    expect((await a.agent.post(`/api/products/${product.id}/reviews`).send({ ...review, rating: 6 })).status).toBe(400);
    expect((await a.agent.post(`/api/products/${product.id}/reviews`).send({ ...review, title: '' })).status).toBe(400);
    expect((await a.agent.post(`/api/products/${product.id}/reviews`).send({ ...review, buyerId: 'x' })).status).toBe(400);
  });

  it('detail reports review eligibility for the signed-in viewer', async () => {
    const { product, variant } = await makeVariant({ stock: 1 });
    const a = await signedInAgent(app);
    expect((await a.agent.get(`/api/catalog/products/${product.slug}`)).body.data.viewer).toMatchObject({ canReview: false, hasReviewed: false });
    await makePurchase(a.user.id, { product, variant });
    expect((await a.agent.get(`/api/catalog/products/${product.slug}`)).body.data.viewer.canReview).toBe(true);
    await a.agent.post(`/api/products/${product.id}/reviews`).send(review);
    expect((await a.agent.get(`/api/catalog/products/${product.slug}`)).body.data.viewer).toMatchObject({ canReview: false, hasReviewed: true });
  });
});

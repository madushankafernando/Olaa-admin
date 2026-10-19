import { describe, expect, it, vi } from 'vitest';
import { createDataProvider } from '../src/admin/dataProvider';

function fakeApi(response: unknown = { data: [], total: 0 }) {
  return vi.fn(async (_path: string, _init?: unknown) => response) as unknown as Parameters<typeof createDataProvider>[0] & ReturnType<typeof vi.fn>;
}

describe('dataProvider', () => {
  it('review queue = pending_review members, oldest first', async () => {
    const api = fakeApi();
    await createDataProvider(api).getList('review', { pagination: { page: 2, perPage: 10 }, sort: { field: 'x', order: 'DESC' }, filter: { q: 'mia' } });
    expect(api).toHaveBeenCalledWith('/admin/members', {
      query: { status: 'pending_review', page: 2, perPage: 10, sort: 'submitted_at', order: 'ASC', search: 'mia' },
    });
  });

  it('members passes status/search and only allows known sort fields', async () => {
    const api = fakeApi();
    await createDataProvider(api).getList('members', { pagination: { page: 1, perPage: 25 }, sort: { field: 'email', order: 'ASC' }, filter: { status: 'approved' } });
    expect(api).toHaveBeenCalledWith('/admin/members', {
      query: { status: 'approved', search: undefined, page: 1, perPage: 25, sort: 'created_at', order: 'ASC' },
    });
  });

  it('getOne loads the review detail and adds the id React-Admin needs', async () => {
    const api = fakeApi({ profile: { id: 'u1', status: 'pending_review' }, email: 'a@b.c', answers: {}, photos: [], history: [] });
    const r = await createDataProvider(api).getOne('members', { id: 'u1' });
    expect(api).toHaveBeenCalledWith('/admin/profiles/u1/review');
    expect(r.data.id).toBe('u1');
    expect(r.data.email).toBe('a@b.c');
  });

  it('decisions post to the backend; empty notes are dropped', async () => {
    const api = fakeApi({ ok: true });
    const dp = createDataProvider(api);
    await dp.decide('u1', 'approve', '');
    expect(api).toHaveBeenCalledWith('/admin/profiles/u1/decision', { method: 'POST', body: { decision: 'approve', note: undefined } });
    await dp.decide('u1', 'reject', 'Fake photos');
    expect(api).toHaveBeenLastCalledWith('/admin/profiles/u1/decision', { method: 'POST', body: { decision: 'reject', note: 'Fake photos' } });
  });

  it('editing members directly is refused (all changes go through review actions)', async () => {
    await expect(createDataProvider(fakeApi()).update('members', { id: 'u1', data: {}, previousData: { id: 'u1' } })).rejects.toThrow(/not supported/);
  });

  it('plans: list and edit only; an edit sends just the changed fields', async () => {
    const api = fakeApi({ id: 'weekly', matchesPerDay: 4 });
    const dp = createDataProvider(api);
    await dp.getList('plans', { pagination: { page: 1, perPage: 25 }, sort: { field: 'sort', order: 'ASC' }, filter: {} });
    expect(api).toHaveBeenCalledWith('/admin/plans');
    const previous = { id: 'weekly', label: 'Weekly', matchesPerDay: 3, visible: true };
    await dp.update('plans', { id: 'weekly', data: { ...previous, matchesPerDay: 4 }, previousData: previous });
    expect(api).toHaveBeenLastCalledWith('/admin/plans/weekly', { method: 'PUT', body: { matchesPerDay: 4 } });
    await expect(dp.create('plans', { data: {} })).rejects.toThrow(/not supported/);
    await expect(dp.delete('plans', { id: 'weekly', previousData: previous })).rejects.toThrow(/not supported/);
  });

  it('promo codes and campaigns: paged list, create, get, delete', async () => {
    const api = fakeApi({ id: 'p1' });
    const dp = createDataProvider(api);
    await dp.getList('promo-codes', { pagination: { page: 3, perPage: 10 }, sort: { field: 'createdAt', order: 'DESC' }, filter: {} });
    expect(api).toHaveBeenLastCalledWith('/admin/promo-codes', { query: { page: 3, perPage: 10 } });
    await dp.create('promo-codes', { data: { kind: 'premium_days', plan: 'monthly', days: 30 } });
    expect(api).toHaveBeenLastCalledWith('/admin/promo-codes', { method: 'POST', body: { kind: 'premium_days', plan: 'monthly', days: 30 } });
    await dp.getOne('campaigns', { id: 'c1' });
    expect(api).toHaveBeenLastCalledWith('/admin/campaigns/c1');
    await dp.delete('campaigns', { id: 'c1', previousData: { id: 'c1' } });
    expect(api).toHaveBeenLastCalledWith('/admin/campaigns/c1', { method: 'DELETE' });
  });

  it('member free premium: load, give and revoke', async () => {
    const api = fakeApi({ plan: { id: 'monthly' }, grants: [] });
    const dp = createDataProvider(api);
    await dp.memberSubscription('u1');
    expect(api).toHaveBeenLastCalledWith('/admin/profiles/u1/subscription');
    await dp.grantPremium('u1', { plan: 'monthly', days: 14, note: 'Outage' });
    expect(api).toHaveBeenLastCalledWith('/admin/profiles/u1/grants', { method: 'POST', body: { plan: 'monthly', days: 14, note: 'Outage' } });
    await dp.revokeGrant('g1');
    expect(api).toHaveBeenLastCalledWith('/admin/grants/g1/revoke', { method: 'POST', body: {} });
    await dp.saveSubscriptionSettings({ trialDays: 30 });
    expect(api).toHaveBeenLastCalledWith('/admin/subscription-settings', { method: 'PUT', body: { trialDays: 30 } });
  });

  it('push notifications: CRUD plus preview, publish and unschedule', async () => {
    const api = fakeApi({ id: 'b1', status: 'draft' });
    const dp = createDataProvider(api);
    await dp.getList('broadcasts', { pagination: { page: 1, perPage: 25 }, sort: { field: 'createdAt', order: 'DESC' }, filter: {} });
    expect(api).toHaveBeenLastCalledWith('/admin/broadcasts', { query: { page: 1, perPage: 25 } });
    await dp.create('broadcasts', { data: { title: 'Hi', body: 'There', audience: 'free' } });
    expect(api).toHaveBeenLastCalledWith('/admin/broadcasts', { method: 'POST', body: { title: 'Hi', body: 'There', audience: 'free' } });
    await dp.previewBroadcast('plans', ['weekly']);
    expect(api).toHaveBeenLastCalledWith('/admin/broadcasts/preview', { method: 'POST', body: { audience: 'plans', plans: ['weekly'] } });
    await dp.publishBroadcast('b1');
    expect(api).toHaveBeenLastCalledWith('/admin/broadcasts/b1/publish', { method: 'POST', body: { sendAt: null } });
    await dp.publishBroadcast('b1', '2026-11-01T09:00:00.000Z');
    expect(api).toHaveBeenLastCalledWith('/admin/broadcasts/b1/publish', { method: 'POST', body: { sendAt: '2026-11-01T09:00:00.000Z' } });
    await dp.unscheduleBroadcast('b1');
    expect(api).toHaveBeenLastCalledWith('/admin/broadcasts/b1/unschedule', { method: 'POST', body: {} });
    await dp.delete('broadcasts', { id: 'b1', previousData: { id: 'b1' } });
    expect(api).toHaveBeenLastCalledWith('/admin/broadcasts/b1', { method: 'DELETE' });
  });
});

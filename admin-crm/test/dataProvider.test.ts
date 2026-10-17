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

  it('editing records directly is refused (all changes go through review actions)', async () => {
    await expect(createDataProvider(fakeApi()).update('members', { id: 'u1', data: {}, previousData: { id: 'u1' } })).rejects.toThrow(/not supported/);
  });
});

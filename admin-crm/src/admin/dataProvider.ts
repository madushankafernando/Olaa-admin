import type { DataProvider, GetListParams, GetOneParams } from 'react-admin';
import { api as defaultApi } from './api';

/**
 * React-Admin ⇄ olaa backend admin API.
 *
 * Resources:
 *   review    – members waiting for review (status = pending_review), oldest first
 *   members   – everyone, filter by status / search
 *   matches   – matches with chat status
 *   reports   – members reported from a chat
 *
 * Plus custom actions used by the review screen (decide, suspend, reinstate, purge, moderatePhoto, stats).
 */
type Api = typeof defaultApi;

export interface ReviewDetail {
  id: string;
  profile: Record<string, unknown> & { id: string; status: string; display_name: string | null };
  email: string | null;
  answers: Record<string, string | string[]>;
  photos: { id: string; url: string; thumbUrl: string; moderation_status: string; moderation_score: { reasons?: string[] } | null; position: number }[];
  history: { decision: string | null; action?: string | null; note: string | null; created_at: string }[];
}

export type Decision = 'approve' | 'request_changes' | 'reject';

export interface OlaaDataProvider extends DataProvider {
  decide(id: string, decision: Decision, note?: string): Promise<unknown>;
  suspend(id: string, note: string): Promise<unknown>;
  reinstate(id: string): Promise<unknown>;
  purge(id: string): Promise<unknown>;
  moderatePhoto(photoId: string, status: 'approved' | 'rejected'): Promise<unknown>;
  stats(): Promise<Record<string, number>>;
}

const notSupported = (what: string) => () => Promise.reject(new Error(`${what} is not supported in the CRM`));

export function createDataProvider(api: Api = defaultApi): OlaaDataProvider {
  async function list(resource: string, params: GetListParams) {
    const { page = 1, perPage = 25 } = params.pagination ?? {};
    const { field = 'created_at', order = 'DESC' } = params.sort ?? {};
    const filter = params.filter ?? {};
    switch (resource) {
      case 'review':
        return api<{ data: { id: string }[]; total: number }>('/admin/members', {
          query: { status: 'pending_review', page, perPage, sort: 'submitted_at', order: 'ASC', search: filter.q },
        });
      case 'members':
        return api<{ data: { id: string }[]; total: number }>('/admin/members', {
          query: {
            status: filter.status,
            search: filter.q,
            page,
            perPage,
            sort: ['created_at', 'submitted_at', 'display_name'].includes(field) ? field : 'created_at',
            order,
          },
        });
      case 'matches':
        return api<{ data: { id: string }[]; total: number }>('/admin/matches', { query: { page, perPage } });
      case 'reports':
        return api<{ data: { id: string }[]; total: number }>('/admin/reports', { query: { page, perPage } });
      default:
        throw new Error(`Unknown resource ${resource}`);
    }
  }

  async function one(resource: string, params: GetOneParams) {
    if (resource !== 'members' && resource !== 'review') throw new Error(`No detail view for ${resource}`);
    const detail = await api<Omit<ReviewDetail, 'id'>>(`/admin/profiles/${params.id}/review`);
    return { data: { id: String(params.id), ...detail } as ReviewDetail };
  }

  return {
    getList: list as DataProvider['getList'],
    getOne: one as DataProvider['getOne'],
    getMany: (async (resource: string, params: { ids: (string | number)[] }) => {
      const rows = await Promise.all(params.ids.map((id) => one(resource, { id }).then((r) => r.data)));
      return { data: rows };
    }) as DataProvider['getMany'],
    getManyReference: notSupported('getManyReference') as DataProvider['getManyReference'],
    create: notSupported('Creating records') as DataProvider['create'],
    update: notSupported('Editing records') as DataProvider['update'],
    updateMany: notSupported('Bulk edits') as DataProvider['updateMany'],
    delete: notSupported('Deleting') as DataProvider['delete'],
    deleteMany: notSupported('Bulk deletes') as DataProvider['deleteMany'],

    decide: (id, decision, note) => api(`/admin/profiles/${id}/decision`, { method: 'POST', body: { decision, note: note || undefined } }),
    suspend: (id, note) => api(`/admin/profiles/${id}/suspend`, { method: 'POST', body: { note } }),
    reinstate: (id) => api(`/admin/profiles/${id}/reinstate`, { method: 'POST', body: {} }),
    purge: (id) => api(`/admin/profiles/${id}/purge`, { method: 'POST', body: {} }),
    moderatePhoto: (photoId, status) => api(`/admin/photos/${photoId}/moderation`, { method: 'POST', body: { status } }),
    stats: () => api<Record<string, number>>('/admin/stats'),
  };
}

export const dataProvider = createDataProvider();

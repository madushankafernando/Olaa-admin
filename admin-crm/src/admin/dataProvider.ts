import type { CreateParams, DataProvider, DeleteParams, GetListParams, GetOneParams, UpdateParams } from 'react-admin';
import type { Broadcast, BroadcastAudience, BroadcastPreview, MemberPlan, PaidPlanId, PremiumGrantRecord } from '@olaa/shared';
import { api as defaultApi } from './api';

/**
 * React-Admin ⇄ olaa backend admin API.
 *
 * Resources:
 *   review    – members waiting for review (status = pending_review), oldest first
 *   members   – everyone, filter by status / search
 *   matches   – matches with chat status
 *   reports   – members reported from a chat
 *   plans        – live plan settings (limits, labels, which plans are on sale); edit only
 *   promo-codes  – codes members redeem for free premium or a longer trial
 *   campaigns    – time-limited boosts, store discounts and banners
 *   broadcasts   – push notifications to a segment of members (draft → publish now or schedule)
 *
 * Plus custom actions used by the review screen (decide, suspend, reinstate, purge, moderatePhoto, stats),
 * the trial/store settings, a member's free premium (memberSubscription, grantPremium, revokeGrant), and
 * push notification actions (previewBroadcast, publishBroadcast, unscheduleBroadcast).
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

export interface SubscriptionSettings {
  id: 'settings';
  trialDays: number;
  defaultOffering: string | null;
}

export interface MemberSubscription {
  plan: MemberPlan;
  grants: (PremiumGrantRecord & { revokedAt: string | null })[];
}

export interface OlaaDataProvider extends DataProvider {
  decide(id: string, decision: Decision, note?: string): Promise<unknown>;
  suspend(id: string, note: string): Promise<unknown>;
  reinstate(id: string): Promise<unknown>;
  purge(id: string): Promise<unknown>;
  moderatePhoto(photoId: string, status: 'approved' | 'rejected'): Promise<unknown>;
  stats(): Promise<Record<string, number>>;
  subscriptionSettings(): Promise<SubscriptionSettings>;
  saveSubscriptionSettings(patch: Partial<Omit<SubscriptionSettings, 'id'>>): Promise<SubscriptionSettings>;
  memberSubscription(id: string): Promise<MemberSubscription>;
  grantPremium(id: string, grant: { plan: PremiumGrantRecord['plan']; days: number; note?: string }): Promise<MemberSubscription>;
  revokeGrant(grantId: string): Promise<MemberSubscription>;
  previewBroadcast(audience: BroadcastAudience, plans: PaidPlanId[]): Promise<BroadcastPreview>;
  /** sendAt empty = send now. */
  publishBroadcast(id: string, sendAt?: string | null): Promise<Broadcast>;
  unscheduleBroadcast(id: string): Promise<Broadcast>;
}

/** Resources backed by plain REST endpoints under /admin. */
const REST: Record<string, string> = {
  plans: '/admin/plans',
  'promo-codes': '/admin/promo-codes',
  campaigns: '/admin/campaigns',
  broadcasts: '/admin/broadcasts',
};
/** Resources the CRM can create and delete (plans are fixed). */
const CRUD = new Set(['promo-codes', 'campaigns', 'broadcasts']);

/** Only the fields the admin changed (React-Admin sends the whole record). */
function changed(data: Record<string, unknown>, previous: Record<string, unknown> = {}) {
  return Object.fromEntries(Object.entries(data).filter(([k, v]) => k !== 'id' && JSON.stringify(v) !== JSON.stringify(previous[k])));
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
      case 'plans':
        return api<{ data: { id: string }[]; total: number }>(REST.plans!);
      case 'promo-codes':
      case 'campaigns':
      case 'broadcasts':
        return api<{ data: { id: string }[]; total: number }>(REST[resource]!, { query: { page, perPage } });
      default:
        throw new Error(`Unknown resource ${resource}`);
    }
  }

  async function one(resource: string, params: GetOneParams) {
    if (REST[resource]) return { data: await api<{ id: string }>(`${REST[resource]}/${params.id}`) };
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
    create: (async (resource: string, params: CreateParams) => {
      if (!CRUD.has(resource)) throw new Error(`Creating ${resource} is not supported in the CRM`);
      return { data: await api<{ id: string }>(REST[resource]!, { method: 'POST', body: params.data }) };
    }) as DataProvider['create'],
    update: (async (resource: string, params: UpdateParams) => {
      if (!REST[resource]) throw new Error(`Editing ${resource} is not supported in the CRM`);
      const body = changed(params.data as Record<string, unknown>, params.previousData as Record<string, unknown>);
      return { data: await api<{ id: string }>(`${REST[resource]}/${params.id}`, { method: 'PUT', body }) };
    }) as DataProvider['update'],
    updateMany: notSupported('Bulk edits') as DataProvider['updateMany'],
    delete: (async (resource: string, params: DeleteParams) => {
      if (!CRUD.has(resource)) throw new Error(`Deleting ${resource} is not supported in the CRM`);
      return { data: await api<{ id: string }>(`${REST[resource]}/${params.id}`, { method: 'DELETE' }) };
    }) as DataProvider['delete'],
    deleteMany: notSupported('Bulk deletes') as DataProvider['deleteMany'],

    decide: (id, decision, note) => api(`/admin/profiles/${id}/decision`, { method: 'POST', body: { decision, note: note || undefined } }),
    suspend: (id, note) => api(`/admin/profiles/${id}/suspend`, { method: 'POST', body: { note } }),
    reinstate: (id) => api(`/admin/profiles/${id}/reinstate`, { method: 'POST', body: {} }),
    purge: (id) => api(`/admin/profiles/${id}/purge`, { method: 'POST', body: {} }),
    moderatePhoto: (photoId, status) => api(`/admin/photos/${photoId}/moderation`, { method: 'POST', body: { status } }),
    stats: () => api<Record<string, number>>('/admin/stats'),
    subscriptionSettings: () => api<SubscriptionSettings>('/admin/subscription-settings'),
    saveSubscriptionSettings: (patch) => api<SubscriptionSettings>('/admin/subscription-settings', { method: 'PUT', body: patch }),
    memberSubscription: (id) => api<MemberSubscription>(`/admin/profiles/${id}/subscription`),
    grantPremium: (id, grant) => api<MemberSubscription>(`/admin/profiles/${id}/grants`, { method: 'POST', body: grant }),
    revokeGrant: (grantId) => api<MemberSubscription>(`/admin/grants/${grantId}/revoke`, { method: 'POST', body: {} }),
    previewBroadcast: (audience, plans) => api<BroadcastPreview>('/admin/broadcasts/preview', { method: 'POST', body: { audience, plans } }),
    publishBroadcast: (id, sendAt) => api<Broadcast>(`/admin/broadcasts/${id}/publish`, { method: 'POST', body: { sendAt: sendAt || null } }),
    unscheduleBroadcast: (id) => api<Broadcast>(`/admin/broadcasts/${id}/unschedule`, { method: 'POST', body: {} }),
  };
}

export const dataProvider = createDataProvider();

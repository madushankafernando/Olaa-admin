import type { Entitlement, PaidPlanId } from './plans';

/**
 * Push notifications admins publish from the CRM ("broadcasts"). Each one goes to a segment of members, lands in
 * their in-app inbox, and is pushed to their devices unless they turned announcements off.
 */

/** all = every member · free = free plan · trial = on the free trial · premium = paid or free premium · plans = chosen paid plans */
export type BroadcastAudience = 'all' | 'free' | 'trial' | 'premium' | 'plans';
export const BROADCAST_AUDIENCES: readonly BroadcastAudience[] = ['all', 'free', 'trial', 'premium', 'plans'];

/** Screen the app opens when the notification is tapped. null = the inbox. */
export type BroadcastLink = 'home' | 'cid' | 'matches' | 'subscription';
export const BROADCAST_LINKS: readonly BroadcastLink[] = ['home', 'cid', 'matches', 'subscription'];

export type BroadcastStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';

export const BROADCAST_TITLE_MAX = 65;
export const BROADCAST_BODY_MAX = 240;

export interface Broadcast {
  id: string;
  title: string;
  body: string;
  audience: BroadcastAudience;
  /** Only for audience 'plans'. */
  plans: PaidPlanId[];
  link: BroadcastLink | null;
  status: BroadcastStatus;
  /** When a scheduled broadcast goes out. */
  sendAt: string | null;
  sentAt: string | null;
  /** Members it went to (all of them get it in their inbox). */
  recipientCount: number;
  /** Devices it was pushed to, and how many Expo accepted / rejected. */
  deviceCount: number;
  deliveredCount: number;
  failedCount: number;
  readCount: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BroadcastPreview {
  /** Members in the segment. */
  members: number;
  /** Of those, how many will get a push (have a device registered and announcements on). */
  reachable: number;
  devices: number;
}

/** Does a member with this entitlement belong to the segment? Uses the member's own plan, not campaign upgrades. */
export function inBroadcastAudience(audience: BroadcastAudience, plans: readonly PaidPlanId[], e: Pick<Entitlement, 'plan' | 'source'>): boolean {
  const premium = e.source === 'paid' || e.source === 'grant';
  switch (audience) {
    case 'all':
      return true;
    case 'free':
      return e.source === 'free';
    case 'trial':
      return e.source === 'trial';
    case 'premium':
      return premium;
    case 'plans':
      return premium && (plans as readonly string[]).includes(e.plan.id);
  }
}

export interface InboxItem {
  id: string;
  title: string;
  body: string;
  link: BroadcastLink | null;
  sentAt: string;
  read: boolean;
}

export interface InboxResponse {
  items: InboxItem[];
  unread: number;
  /** The member's "announcements & offers" push setting. The inbox still fills when it's off. */
  announcements: boolean;
}

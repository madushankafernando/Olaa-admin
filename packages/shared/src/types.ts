/** Domain types shared across apps. Mirrors the Supabase schema (see supabase/migrations). */
import type { CidPersonaId } from './cid';
import type { BoostPack, BoostState, EntitlementSource, PaidPlanId, Plan, PlanId } from './plans';

export type Gender = 'man' | 'woman' | 'nonbinary';

/**
 * Profile review lifecycle:
 *   draft → pending_review → approved
 *                         ↘ changes_requested → (edit) → pending_review
 *                         ↘ rejected (data purged within 30 days)
 */
export type ProfileStatus = 'draft' | 'pending_review' | 'changes_requested' | 'approved' | 'rejected' | 'suspended';

export type ReviewDecision = 'approve' | 'request_changes' | 'reject';

export interface Profile {
  id: string;
  display_name: string | null;
  birthdate: string | null;
  gender: Gender | null;
  seeking: Gender[];
  age_min: number;
  age_max: number;
  max_distance_km: number;
  city: string | null;
  bio: string | null;
  status: ProfileStatus;
  review_note: string | null;
  cid_persona: CidPersonaId | null;
  approved_at: string | null;
  created_at: string;
}

export interface Photo {
  id: string;
  user_id: string;
  storage_key: string;
  position: number;
  moderation_status: 'pending' | 'approved' | 'rejected';
}

export type SuggestionStatus = 'suggested' | 'liked' | 'passed' | 'expired';

export interface Conversation {
  id: string;
  match_id: string;
  status: 'open' | 'closed';
  closed_by: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface MeResponse {
  profile: Profile;
  photos: Photo[];
  answers: Record<string, string | string[]>;
  plan: MemberPlan;
}

/** The plan a member has right now (see resolveEntitlement). matchesPerDay includes campaign boosts. */
export interface MemberPlan {
  id: PlanId;
  label: string;
  matchesPerDay: number;
  source: EntitlementSource;
  /** When the plan in force ends: paid period, free premium or trial. null on free. */
  endsAt: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
}

/** GET /subscription: everything the subscription screen needs, from the live (admin-edited) catalog. */
export interface SubscriptionInfo {
  /** Paid plans on sale, in display order. */
  plans: Plan[];
  freePlan: Plan;
  trialPlan: Plan;
  trialDays: number;
  current: MemberPlan & { extraMatches: number; willRenew: boolean | null };
  /** A running campaign aimed at this member (banner, maybe a store discount). */
  campaign: { id: string; name: string; bannerTitle: string | null; bannerBody: string | null; endsAt: string } | null;
  /** RevenueCat offering to load. null = RevenueCat's "current" offering. */
  offeringId: string | null;
  /** Boost packs on sale, in display order, and the member's boosts. */
  boostPacks: BoostPack[];
  boost: BoostState;
}

/** premium_days: free premium on `plan` for `days`. trial_extension: add `days` to the free trial. */
export type PromoKind = 'premium_days' | 'trial_extension';

export interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  kind: PromoKind;
  plan: PaidPlanId | null;
  days: number;
  maxRedemptions: number | null;
  redemptionCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

export interface RedeemResult {
  ok: true;
  message: string;
  plan: MemberPlan;
}

export function ageFromBirthdate(birthdate: string, now: Date = new Date()): number {
  const b = new Date(birthdate);
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

/** A member's free premium, as the admin CRM shows it. */
export interface PremiumGrantRecord {
  id: string;
  plan: PaidPlanId;
  startsAt: string;
  endsAt: string;
  source: 'promo_code' | 'admin';
  promoCode: string | null;
  note: string | null;
  createdAt: string;
}

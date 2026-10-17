/**
 * Subscription plans and daily match limits.
 *
 * - Every approved member gets a 14-day free trial (no card needed), starting the day the
 *   admin approves their profile.
 * - After the trial, a member without a paid plan is on `free`: 1 suggested match per day.
 * - Paid plans are sold through RevenueCat. The product IDs must match the ones you create
 *   in App Store Connect / Google Play and attach to the RevenueCat offering.
 */
export type PlanId = 'trial' | 'free' | 'weekly' | 'monthly' | 'quarterly';

export interface Plan {
  id: PlanId;
  label: string;
  priceUsd: number | null;
  billingPeriod: string | null;
  matchesPerDay: number;
  /** RevenueCat / store product identifier (paid plans only). */
  productId: string | null;
}

export const TRIAL_DAYS = 14;

export const PLANS: Record<PlanId, Plan> = {
  // ASSUMPTION: the brief doesn't give a trial limit; the trial gets the top tier (5/day)
  // so people see the product at its best. Change here — nothing else needs editing.
  trial: { id: 'trial', label: '14-day free trial', priceUsd: 0, billingPeriod: null, matchesPerDay: 5, productId: null },
  free: { id: 'free', label: 'Free', priceUsd: 0, billingPeriod: null, matchesPerDay: 1, productId: null },
  weekly: { id: 'weekly', label: 'Weekly', priceUsd: 10, billingPeriod: 'week', matchesPerDay: 3, productId: 'olaa_weekly' },
  monthly: { id: 'monthly', label: 'Monthly', priceUsd: 30, billingPeriod: 'month', matchesPerDay: 5, productId: 'olaa_monthly' },
  quarterly: { id: 'quarterly', label: '3 months', priceUsd: 75, billingPeriod: '3 months', matchesPerDay: 5, productId: 'olaa_quarterly' },
};

export const PAID_PLANS: Plan[] = [PLANS.weekly, PLANS.monthly, PLANS.quarterly];

export function planForProductId(productId: string): Plan | null {
  return PAID_PLANS.find((p) => productId.startsWith(p.productId!)) ?? null;
}

export interface SubscriptionState {
  plan: PlanId;
  /** ISO timestamp; only for paid plans. */
  currentPeriodEnd: string | null;
  /** ISO timestamp; set when the profile is approved. */
  trialEndsAt: string | null;
}

/** Works out which plan is in force right now. Paid beats trial beats free. */
export function effectivePlan(sub: SubscriptionState | null, now: Date = new Date()): Plan {
  if (!sub) return PLANS.free;
  const paid = sub.plan === 'weekly' || sub.plan === 'monthly' || sub.plan === 'quarterly';
  if (paid && sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > now) return PLANS[sub.plan];
  if (sub.trialEndsAt && new Date(sub.trialEndsAt) > now) return PLANS.trial;
  return PLANS.free;
}

export function trialEndDate(approvedAt: Date): Date {
  return new Date(approvedAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Subscription plans, daily match limits and promotions.
 *
 * - Every approved member gets a free trial (no card needed), starting the day the admin approves their profile.
 * - After the trial, a member without a paid plan is on `free`.
 * - Paid plans are sold through RevenueCat. The product IDs must match the ones you create
 *   in App Store Connect / Google Play and attach to the RevenueCat offering.
 *
 * The live values (limits, labels, trial length, which plans are on sale) are edited in the admin CRM and stored in
 * the `plan_settings` / `subscription_settings` tables. DEFAULT_CATALOG below seeds those tables and is the fallback
 * if they can't be read. Promotions (free premium from a promo code or an admin, and time-limited campaigns) sit on
 * top; resolveEntitlement() combines everything into the plan a member actually has right now.
 */
export type PlanId = 'trial' | 'free' | 'weekly' | 'monthly' | 'quarterly';

export const PAID_PLAN_IDS = ['weekly', 'monthly', 'quarterly'] as const satisfies readonly PlanId[];
export type PaidPlanId = (typeof PAID_PLAN_IDS)[number];

export interface Plan {
  id: PlanId;
  label: string;
  priceUsd: number | null;
  billingPeriod: string | null;
  matchesPerDay: number;
  /** RevenueCat / store product identifier (paid plans only). */
  productId: string | null;
  /** Paid plans only: offered on the subscription screen. */
  visible: boolean;
  /** Optional tag on the subscription screen, e.g. "best value". */
  badge: string | null;
  sort: number;
}

export interface PlanCatalog {
  plans: Record<PlanId, Plan>;
  trialDays: number;
  /** RevenueCat offering the app shows when no campaign picks another one. null = RevenueCat's "current" offering. */
  defaultOffering: string | null;
}

export const MAX_MATCHES_PER_DAY = 50;

export const DEFAULT_CATALOG: PlanCatalog = {
  trialDays: 14,
  defaultOffering: null,
  plans: {
    // ASSUMPTION: the brief doesn't give a trial limit; the trial gets the top tier (5/day)
    // so people see the product at its best.
    trial: { id: 'trial', label: 'Free trial', priceUsd: 0, billingPeriod: null, matchesPerDay: 5, productId: null, visible: false, badge: null, sort: 0 },
    free: { id: 'free', label: 'Free', priceUsd: 0, billingPeriod: null, matchesPerDay: 1, productId: null, visible: false, badge: null, sort: 1 },
    weekly: { id: 'weekly', label: 'Weekly', priceUsd: 10, billingPeriod: 'week', matchesPerDay: 3, productId: 'olaa_weekly', visible: true, badge: null, sort: 2 },
    monthly: { id: 'monthly', label: 'Monthly', priceUsd: 30, billingPeriod: 'month', matchesPerDay: 5, productId: 'olaa_monthly', visible: true, badge: null, sort: 3 },
    quarterly: { id: 'quarterly', label: '3 months', priceUsd: 75, billingPeriod: '3 months', matchesPerDay: 5, productId: 'olaa_quarterly', visible: true, badge: 'best value', sort: 4 },
  },
};

/** Defaults; the live values come from the catalog the API serves. */
export const PLANS = DEFAULT_CATALOG.plans;
export const TRIAL_DAYS = DEFAULT_CATALOG.trialDays;

export const isPaidPlan = (id: PlanId): id is PaidPlanId => (PAID_PLAN_IDS as readonly PlanId[]).includes(id);

/** Paid plans on sale, in display order. */
export function paidPlans(catalog: PlanCatalog = DEFAULT_CATALOG): Plan[] {
  return PAID_PLAN_IDS.map((id) => catalog.plans[id])
    .filter((p) => p.visible)
    .sort((a, b) => a.sort - b.sort);
}

export const PAID_PLANS: Plan[] = paidPlans(DEFAULT_CATALOG);

/**
 * Which plan a store product belongs to. Matches by prefix, so discounted products (olaa_monthly_promo) and
 * Android base-plan ids (olaa_monthly:monthly-base) map to their plan. Longest product id wins.
 */
export function planForProductId(productId: string, catalog: PlanCatalog = DEFAULT_CATALOG): Plan | null {
  return (
    PAID_PLAN_IDS.map((id) => catalog.plans[id])
      .filter((p) => p.productId && productId.startsWith(p.productId))
      .sort((a, b) => b.productId!.length - a.productId!.length)[0] ?? null
  );
}

export interface SubscriptionState {
  plan: PlanId;
  /** ISO timestamp; only for paid plans. */
  currentPeriodEnd: string | null;
  /** ISO timestamp; set when the profile is approved. */
  trialEndsAt: string | null;
}

/** The store/trial plan alone, ignoring promotions. Paid beats trial beats free. */
export function effectivePlan(sub: SubscriptionState | null, now: Date = new Date(), catalog: PlanCatalog = DEFAULT_CATALOG): Plan {
  if (!sub) return catalog.plans.free;
  if (isPaidPlan(sub.plan) && sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > now) return catalog.plans[sub.plan];
  if (sub.trialEndsAt && new Date(sub.trialEndsAt) > now) return catalog.plans.trial;
  return catalog.plans.free;
}

export function trialEndDate(approvedAt: Date, trialDays: number = TRIAL_DAYS): Date {
  return new Date(approvedAt.getTime() + trialDays * 24 * 60 * 60 * 1000);
}

// ───────────────────────── promotions

/** Free premium on a plan for a period: from a promo code or given by an admin. */
export interface PremiumGrant {
  plan: PaidPlanId;
  startsAt: string;
  endsAt: string;
}

/** Who a campaign applies to. `paid` means premium members: a paid plan or free premium. */
export type CampaignAudience = 'all' | 'free' | 'trial' | 'paid';

export interface Campaign {
  id: string;
  name: string;
  active: boolean;
  startsAt: string;
  endsAt: string;
  audience: CampaignAudience;
  /** Extra introductions a day on top of the member's plan. */
  extraMatches: number;
  /** Treat members as being on this plan while the campaign runs (only if it's better than theirs). */
  upgradePlan: PaidPlanId | null;
  /** RevenueCat offering to show while the campaign runs (a store discount). */
  offeringId: string | null;
  bannerTitle: string | null;
  bannerBody: string | null;
  /** Higher wins when campaigns overlap (banner and offering). */
  priority: number;
}

export type EntitlementSource = 'paid' | 'grant' | 'trial' | 'free';

export interface Entitlement {
  /** The plan in force, with matchesPerDay already including campaign boosts. */
  plan: Plan;
  source: EntitlementSource;
  /** When the plan in force ends (paid period, free premium or trial). null for free. */
  endsAt: string | null;
  /** Extra introductions a day from a campaign (already included in plan.matchesPerDay). */
  extraMatches: number;
  /** The campaign whose banner/offering the member sees, if any. */
  campaign: Campaign | null;
  /** RevenueCat offering the subscription screen should show. null = RevenueCat's "current" offering. */
  offeringId: string | null;
}

export function campaignIsLive(c: Campaign, now: Date = new Date()): boolean {
  return c.active && new Date(c.startsAt) <= now && now < new Date(c.endsAt);
}

const audienceOf = (source: EntitlementSource): Exclude<CampaignAudience, 'all'> => (source === 'grant' || source === 'paid' ? 'paid' : source);

/**
 * The plan a member actually has right now.
 *
 * 1. Premium = the better of their paid plan and any free premium (more introductions a day wins; a paid plan wins a tie).
 * 2. Premium beats the trial, the trial beats free — the same order as before promotions existed.
 * 3. Live campaigns for the member's group then apply: the best `upgradePlan` (if it beats their plan) and the largest
 *    `extraMatches` (boosts don't stack). The highest-priority campaign with a banner or offering is the one they see.
 */
export function resolveEntitlement(input: {
  sub: SubscriptionState | null;
  grants?: PremiumGrant[];
  campaigns?: Campaign[];
  catalog?: PlanCatalog;
  now?: Date;
}): Entitlement {
  const { sub, grants = [], campaigns = [], catalog = DEFAULT_CATALOG, now = new Date() } = input;
  const plans = catalog.plans;

  const premium: { plan: Plan; source: EntitlementSource; endsAt: string }[] = [];
  if (sub && isPaidPlan(sub.plan) && sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > now) {
    premium.push({ plan: plans[sub.plan], source: 'paid', endsAt: sub.currentPeriodEnd });
  }
  for (const g of grants) {
    if (new Date(g.startsAt) <= now && now < new Date(g.endsAt)) premium.push({ plan: plans[g.plan], source: 'grant', endsAt: g.endsAt });
  }
  premium.sort((a, b) => b.plan.matchesPerDay - a.plan.matchesPerDay || (a.source === 'paid' ? -1 : 1) - (b.source === 'paid' ? -1 : 1));

  let base: { plan: Plan; source: EntitlementSource; endsAt: string | null };
  if (premium[0]) base = premium[0];
  else if (sub?.trialEndsAt && new Date(sub.trialEndsAt) > now) base = { plan: plans.trial, source: 'trial', endsAt: sub.trialEndsAt };
  else base = { plan: plans.free, source: 'free', endsAt: null };

  const group = audienceOf(base.source);
  const live = campaigns
    .filter((c) => campaignIsLive(c, now) && (c.audience === 'all' || c.audience === group))
    .sort((a, b) => b.priority - a.priority || new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

  let plan = base.plan;
  for (const c of live) {
    const upgrade = c.upgradePlan ? plans[c.upgradePlan] : null;
    if (upgrade && upgrade.matchesPerDay > plan.matchesPerDay) plan = upgrade;
  }
  const extraMatches = Math.max(0, ...live.map((c) => c.extraMatches));
  const shown = live.find((c) => c.bannerTitle || c.offeringId) ?? null;

  return {
    plan: { ...plan, matchesPerDay: Math.min(MAX_MATCHES_PER_DAY, plan.matchesPerDay + extraMatches) },
    source: base.source,
    endsAt: base.endsAt,
    extraMatches,
    campaign: shown,
    offeringId: live.find((c) => c.offeringId)?.offeringId ?? catalog.defaultOffering,
  };
}

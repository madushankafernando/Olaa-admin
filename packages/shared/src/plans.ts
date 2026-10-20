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

/**
 * One price a package can be sold at: a store product (App Store / Google Play / RevenueCat Test Store) created at that
 * price. Stores don't let apps set prices, so the admin creates a few and picks which one is live in the CRM.
 */
export interface PriceOption {
  productId: string;
  priceUsd: number;
}

export interface Plan {
  id: PlanId;
  label: string;
  /** Price of the live product (productId), for display when the store can't be reached. */
  priceUsd: number | null;
  billingPeriod: string | null;
  matchesPerDay: number;
  /** The live store product (paid plans only); one of priceOptions. */
  productId: string | null;
  /** Price points this plan can be sold at. Older ones stay listed so existing subscribers still map to the plan. */
  priceOptions: PriceOption[];
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
    trial: { id: 'trial', label: 'Free trial', priceUsd: 0, billingPeriod: null, matchesPerDay: 5, productId: null, priceOptions: [], visible: false, badge: null, sort: 0 },
    free: { id: 'free', label: 'Free', priceUsd: 0, billingPeriod: null, matchesPerDay: 1, productId: null, priceOptions: [], visible: false, badge: null, sort: 1 },
    weekly: { id: 'weekly', label: 'Weekly', priceUsd: 10, billingPeriod: 'week', matchesPerDay: 3, productId: 'olaa_weekly', priceOptions: [{ productId: 'olaa_weekly', priceUsd: 10 }], visible: true, badge: null, sort: 2 },
    monthly: { id: 'monthly', label: 'Monthly', priceUsd: 30, billingPeriod: 'month', matchesPerDay: 5, productId: 'olaa_monthly', priceOptions: [{ productId: 'olaa_monthly', priceUsd: 30 }], visible: true, badge: null, sort: 3 },
    quarterly: { id: 'quarterly', label: '3 months', priceUsd: 75, billingPeriod: '3 months', matchesPerDay: 5, productId: 'olaa_quarterly', priceOptions: [{ productId: 'olaa_quarterly', priceUsd: 75 }], visible: true, badge: 'best value', sort: 4 },
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

/** Store product ids that belong to a package: the live one and every price option. */
const productIdsOf = (p: { productId: string | null; priceOptions: PriceOption[] }) =>
  [p.productId, ...p.priceOptions.map((o) => o.productId)].filter((id): id is string => !!id);

/** Longest id that `productId` starts with (exact match or a store suffix like Android's ":monthly-base"). */
function bestPrefix<T extends { productId: string | null; priceOptions: PriceOption[] }>(productId: string, items: T[]): T | null {
  let best: { item: T; len: number } | null = null;
  for (const item of items)
    for (const id of productIdsOf(item)) if (productId.startsWith(id) && (!best || id.length > best.len)) best = { item, len: id.length };
  return best?.item ?? null;
}

/**
 * Which plan a store product belongs to. Matches by prefix against the live product and every price option, so
 * discounted products (olaa_monthly_promo), older price points and Android base-plan ids (olaa_monthly:monthly-base)
 * map to their plan. Longest product id wins.
 */
export function planForProductId(productId: string, catalog: PlanCatalog = DEFAULT_CATALOG): Plan | null {
  return bestPrefix(productId, PAID_PLAN_IDS.map((id) => catalog.plans[id]));
}

// ───────────── Profile boosts

/**
 * A boost puts a member at the front of other members' introductions for a while (BoostSettings.hours). Members buy
 * boosts in packs (one-off store purchases) and use them whenever they like. Pack contents, prices and the boost
 * length are edited in the admin CRM.
 */
export type BoostPackId = 'boost_1' | 'boost_3' | 'boost_5';
export const BOOST_PACK_IDS = ['boost_1', 'boost_3', 'boost_5'] as const satisfies readonly BoostPackId[];

export interface BoostPack {
  id: BoostPackId;
  label: string;
  /** Boosts the member gets. */
  boosts: number;
  /** The live store product; one of priceOptions. */
  productId: string;
  priceUsd: number;
  priceOptions: PriceOption[];
  visible: boolean;
  badge: string | null;
  sort: number;
}

export const DEFAULT_BOOST_HOURS = 24;
/** Score added to a boosted member when ranking someone's introductions (scores are 0..1). */
export const BOOST_SCORE_BONUS = 0.2;

export const DEFAULT_BOOST_PACKS: BoostPack[] = [
  { id: 'boost_1', label: '1 boost', boosts: 1, productId: 'olaa_boost_1', priceUsd: 3.99, priceOptions: [{ productId: 'olaa_boost_1', priceUsd: 3.99 }], visible: true, badge: null, sort: 1 },
  { id: 'boost_3', label: '3 boosts', boosts: 3, productId: 'olaa_boost_3', priceUsd: 9.99, priceOptions: [{ productId: 'olaa_boost_3', priceUsd: 9.99 }], visible: true, badge: 'popular', sort: 2 },
  { id: 'boost_5', label: '5 boosts', boosts: 5, productId: 'olaa_boost_5', priceUsd: 14.99, priceOptions: [{ productId: 'olaa_boost_5', priceUsd: 14.99 }], visible: true, badge: 'best value', sort: 3 },
];

/** Which boost pack a store product belongs to (live product or any price option, prefix match). */
export function boostPackForProductId(productId: string, packs: BoostPack[] = DEFAULT_BOOST_PACKS): BoostPack | null {
  return bestPrefix(productId, packs);
}

/** Score used to rank introductions: boosted members move up, but a boost never rescues a deal-breaker (score < 0). */
export function boostedScore(score: number, boosted: boolean): number {
  return boosted && score >= 0 ? score + BOOST_SCORE_BONUS : score;
}

export interface BoostState {
  /** Unused boosts. */
  balance: number;
  /** When the running boost ends; null when none is running. */
  activeUntil: string | null;
  /** Length of one boost, from the CRM. */
  hours: number;
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

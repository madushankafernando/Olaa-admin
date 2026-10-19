import { describe, expect, it } from 'vitest';
import { buildPhotoUrl, DEFAULT_CATALOG, effectivePlan, inBroadcastAudience, PLANS, ageFromBirthdate, planForProductId, resolveEntitlement, type Campaign } from './index';

describe('effectivePlan', () => {
  const now = new Date('2026-10-18T00:00:00Z');
  it('gives trial during the 14 days', () => {
    expect(effectivePlan({ plan: 'free', currentPeriodEnd: null, trialEndsAt: '2026-10-20T00:00:00Z' }, now).id).toBe('trial');
  });
  it('drops to free (1/day) after trial', () => {
    const p = effectivePlan({ plan: 'free', currentPeriodEnd: null, trialEndsAt: '2026-10-01T00:00:00Z' }, now);
    expect(p.id).toBe('free');
    expect(p.matchesPerDay).toBe(1);
  });
  it('paid plan wins over trial', () => {
    expect(effectivePlan({ plan: 'weekly', currentPeriodEnd: '2026-10-25T00:00:00Z', trialEndsAt: '2026-10-20T00:00:00Z' }, now).matchesPerDay).toBe(3);
  });
  it('expired paid plan falls back', () => {
    expect(effectivePlan({ plan: 'monthly', currentPeriodEnd: '2026-10-01T00:00:00Z', trialEndsAt: null }, now)).toBe(PLANS.free);
  });
});

describe('resolveEntitlement', () => {
  const now = new Date('2026-10-18T00:00:00Z');
  const afterTrial = { plan: 'free' as const, currentPeriodEnd: null, trialEndsAt: '2026-10-01T00:00:00Z' };
  const inTrial = { plan: 'free' as const, currentPeriodEnd: null, trialEndsAt: '2026-10-20T00:00:00Z' };
  const weekly = { plan: 'weekly' as const, currentPeriodEnd: '2026-10-25T00:00:00Z', trialEndsAt: null };
  const campaign = (over: Partial<Campaign>): Campaign => ({
    id: 'c1',
    name: 'Weekend boost',
    active: true,
    startsAt: '2026-10-17T00:00:00Z',
    endsAt: '2026-10-19T00:00:00Z',
    audience: 'all',
    extraMatches: 0,
    upgradePlan: null,
    offeringId: null,
    bannerTitle: null,
    bannerBody: null,
    priority: 0,
    ...over,
  });

  it('matches effectivePlan when there are no promotions', () => {
    expect(resolveEntitlement({ sub: afterTrial, now }).plan).toEqual(PLANS.free);
    expect(resolveEntitlement({ sub: inTrial, now }).source).toBe('trial');
    expect(resolveEntitlement({ sub: weekly, now }).plan.matchesPerDay).toBe(3);
  });

  it('uses the live catalog, not the defaults', () => {
    const catalog = { ...DEFAULT_CATALOG, plans: { ...DEFAULT_CATALOG.plans, free: { ...PLANS.free, matchesPerDay: 2 } } };
    expect(resolveEntitlement({ sub: afterTrial, catalog, now }).plan.matchesPerDay).toBe(2);
  });

  it('free premium lifts a free member, and the better of paid and free premium wins', () => {
    const grant = { plan: 'monthly' as const, startsAt: '2026-10-10T00:00:00Z', endsAt: '2026-11-10T00:00:00Z' };
    const e = resolveEntitlement({ sub: afterTrial, grants: [grant], now });
    expect(e).toMatchObject({ source: 'grant', endsAt: grant.endsAt });
    expect(e.plan.id).toBe('monthly');
    expect(resolveEntitlement({ sub: weekly, grants: [grant], now }).plan.id).toBe('monthly');
    expect(resolveEntitlement({ sub: afterTrial, grants: [{ ...grant, endsAt: '2026-10-15T00:00:00Z' }], now }).source).toBe('free');
  });

  it('campaign boosts apply to their audience only, and do not stack', () => {
    const boostFree = campaign({ audience: 'free', extraMatches: 2 });
    expect(resolveEntitlement({ sub: afterTrial, campaigns: [boostFree], now }).plan.matchesPerDay).toBe(3);
    expect(resolveEntitlement({ sub: weekly, campaigns: [boostFree], now }).plan.matchesPerDay).toBe(3);
    const both = [boostFree, campaign({ id: 'c2', audience: 'all', extraMatches: 1 })];
    expect(resolveEntitlement({ sub: afterTrial, campaigns: both, now }).extraMatches).toBe(2);
  });

  it('campaign upgrades only when better, and ignores inactive or ended campaigns', () => {
    const upgrade = campaign({ upgradePlan: 'monthly' });
    expect(resolveEntitlement({ sub: afterTrial, campaigns: [upgrade], now }).plan.id).toBe('monthly');
    expect(resolveEntitlement({ sub: afterTrial, campaigns: [{ ...upgrade, active: false }], now }).plan.id).toBe('free');
    expect(resolveEntitlement({ sub: afterTrial, campaigns: [{ ...upgrade, endsAt: '2026-10-18T00:00:00Z' }], now }).plan.id).toBe('free');
  });

  it('the highest-priority campaign picks the banner and store offering', () => {
    const sale = campaign({ id: 'sale', offeringId: 'black_friday', bannerTitle: '50% off', priority: 5 });
    const other = campaign({ id: 'other', offeringId: 'spring', bannerTitle: 'Spring', priority: 1 });
    const e = resolveEntitlement({ sub: afterTrial, campaigns: [other, sale], now });
    expect(e.campaign?.id).toBe('sale');
    expect(e.offeringId).toBe('black_friday');
    expect(resolveEntitlement({ sub: afterTrial, catalog: { ...DEFAULT_CATALOG, defaultOffering: 'default' }, now }).offeringId).toBe('default');
  });
});

describe('planForProductId', () => {
  it('maps discounted store products to their plan', () => {
    expect(planForProductId('olaa_monthly_promo')?.id).toBe('monthly');
    expect(planForProductId('something_else')).toBeNull();
  });
});

describe('buildPhotoUrl', () => {
  it('builds a resized Cloudflare URL from a key', () => {
    expect(buildPhotoUrl('users/u1/p1', 'card', { cdnBaseUrl: 'https://img.olaa.io/' })).toBe(
      'https://img.olaa.io/cdn-cgi/image/width=600,height=800,fit=cover,format=auto/originals/users/u1/p1',
    );
  });
});

describe('misc', () => {
  it('ageFromBirthdate', () => {
    expect(ageFromBirthdate('2000-10-19', new Date('2026-10-18'))).toBe(25);
  });
  it('maps store product ids (incl. Android base-plan suffix)', () => {
    expect(planForProductId('olaa_monthly:monthly-base')?.id).toBe('monthly');
  });
});

describe('inBroadcastAudience', () => {
  const free = { plan: PLANS.free, source: 'free' as const };
  const trial = { plan: PLANS.trial, source: 'trial' as const };
  const weekly = { plan: PLANS.weekly, source: 'paid' as const };
  const grantMonthly = { plan: PLANS.monthly, source: 'grant' as const };
  it('segments by the member’s own plan', () => {
    expect([free, trial, weekly, grantMonthly].map((e) => inBroadcastAudience('all', [], e))).toEqual([true, true, true, true]);
    expect([free, trial, weekly, grantMonthly].map((e) => inBroadcastAudience('free', [], e))).toEqual([true, false, false, false]);
    expect([free, trial, weekly, grantMonthly].map((e) => inBroadcastAudience('trial', [], e))).toEqual([false, true, false, false]);
    expect([free, trial, weekly, grantMonthly].map((e) => inBroadcastAudience('premium', [], e))).toEqual([false, false, true, true]);
    expect([free, trial, weekly, grantMonthly].map((e) => inBroadcastAudience('plans', ['monthly'], e))).toEqual([false, false, false, true]);
    expect(inBroadcastAudience('plans', [], weekly)).toBe(false);
  });
});

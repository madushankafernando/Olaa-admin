import { describe, expect, it } from 'vitest';
import { buildPhotoUrl, effectivePlan, PLANS, ageFromBirthdate, planForProductId } from './index';

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

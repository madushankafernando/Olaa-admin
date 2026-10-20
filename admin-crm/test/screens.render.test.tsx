// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { Admin, Resource, memoryStore, type DataProvider } from 'react-admin';
import { MemoryRouter } from 'react-router-dom';
import { CampaignCreate, CampaignEdit, CampaignList } from '../src/admin/subscriptions/Campaigns';
import { PromoCodeCreate, PromoCodeEdit, PromoCodeList } from '../src/admin/subscriptions/PromoCodes';
import { BroadcastCreate, BroadcastEdit, BroadcastList, BroadcastShow } from '../src/admin/notifications/Broadcasts';
import { BoostPackEdit, BoostPackList } from '../src/admin/subscriptions/BoostPacks';
import { PlanEdit, PlanList } from '../src/admin/subscriptions/Plans';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const empty = { data: [], total: 0 };
const broadcast = {
  title: 'Double intros',
  body: 'This weekend only',
  audience: 'plans',
  plans: ['monthly'],
  link: null,
  sendAt: null,
  sentAt: null,
  recipientCount: 0,
  deviceCount: 0,
  deliveredCount: 0,
  failedCount: 0,
  readCount: 0,
  error: null,
};
const records: Record<string, (id: string) => object> = {
  broadcasts: (id) => ({ ...broadcast, id, status: id === 'sent' ? 'sent' : 'draft' }),
  plans: (id) => ({ id, label: 'Monthly', matchesPerDay: 5, priceUsd: 24.99, billingPeriod: 'month', productId: 'olaa_monthly_2499', priceOptions: [{ productId: 'olaa_monthly', priceUsd: 30 }, { productId: 'olaa_monthly_2499', priceUsd: 24.99 }], visible: true, badge: null, sort: 3 }),
  'boost-packs': (id) => ({ id, label: '3 boosts', boosts: 3, productId: 'olaa_boost_3', priceUsd: 9.99, priceOptions: [{ productId: 'olaa_boost_3', priceUsd: 9.99 }], visible: true, badge: 'popular', sort: 2 }),
};

const dataProvider = {
  getList: vi.fn(async () => empty),
  getOne: vi.fn(async (resource: string, p: { id: string }) => ({ data: records[resource]?.(p.id) ?? { id: p.id } })),
  getMany: vi.fn(async () => ({ data: [] })),
  getManyReference: vi.fn(async () => empty),
  create: vi.fn(async (_r: string, p: { data: object }) => ({ data: { id: 'new', ...p.data } })),
  update: vi.fn(),
  updateMany: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
  previewBroadcast: vi.fn(async () => ({ members: 12, reachable: 7, devices: 9 })),
  subscriptionSettings: vi.fn(async () => ({ id: 'settings', trialDays: 14, defaultOffering: null, boostHours: 24 })),
} as unknown as DataProvider;

async function renderAt(path: string) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <Admin dataProvider={dataProvider} store={memoryStore()} disableTelemetry>
          <Resource name="promo-codes" list={PromoCodeList} create={PromoCodeCreate} edit={PromoCodeEdit} />
          <Resource name="campaigns" list={CampaignList} create={CampaignCreate} edit={CampaignEdit} />
          <Resource name="plans" list={PlanList} edit={PlanEdit} />
          <Resource name="boost-packs" list={BoostPackList} edit={BoostPackEdit} />
          <Resource name="broadcasts" list={BroadcastList} create={BroadcastCreate} edit={BroadcastEdit} show={BroadcastShow} />
        </Admin>
      </MemoryRouter>,
    );
  });
  await act(async () => new Promise((r) => setTimeout(r, 600)));
  const text = el.textContent ?? '';
  root.unmount();
  return text;
}

describe('subscription and notification screens render without crashing', () => {
  it.each(['/campaigns/create', '/campaigns/x', '/promo-codes/create', '/promo-codes/x', '/broadcasts/create'])('%s', async (path) => {
    const text = await renderAt(path);
    expect(text).not.toMatch(/client error occurred|Something went wrong/);
    expect(text).toMatch(/Save/);
  });

  it('push notification draft shows the preview, the reach and the publish panel', async () => {
    const text = await renderAt('/broadcasts/d1');
    expect(text).not.toMatch(/client error occurred|Something went wrong/);
    expect(text).toMatch(/Double intros/);
    expect(text).toMatch(/Reaches 12 members/);
    expect(text).toMatch(/Send now/);
  });

  it('plan pricing: price points and the live price', async () => {
    const text = await renderAt('/plans/monthly');
    expect(text).not.toMatch(/client error occurred|Something went wrong/);
    expect(text).toMatch(/Price points/);
    expect(text).toMatch(/Live price/);
  });

  it('boost pack edit and list (with the boost length card)', async () => {
    expect(await renderAt('/boost-packs/boost_3')).toMatch(/Boosts in the pack/);
    const list = await renderAt('/boost-packs');
    expect(list).not.toMatch(/client error occurred|Something went wrong/);
    expect(list).toMatch(/Hours per boost/);
  });

  it('a sent push notification opens its stats page', async () => {
    const text = await renderAt('/broadcasts/sent/show');
    expect(text).not.toMatch(/client error occurred|Something went wrong/);
    expect(text).toMatch(/Pushes delivered/);
  });
});

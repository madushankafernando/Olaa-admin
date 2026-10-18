// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { Admin, Resource, memoryStore, type DataProvider } from 'react-admin';
import { MemoryRouter } from 'react-router-dom';
import { CampaignCreate, CampaignEdit, CampaignList } from '../src/admin/subscriptions/Campaigns';
import { PromoCodeCreate, PromoCodeEdit, PromoCodeList } from '../src/admin/subscriptions/PromoCodes';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const empty = { data: [], total: 0 };
const dataProvider = {
  getList: vi.fn(async () => empty),
  getOne: vi.fn(async () => ({ data: { id: 'x' } })),
  getMany: vi.fn(async () => ({ data: [] })),
  getManyReference: vi.fn(async () => empty),
  create: vi.fn(async (_r: string, p: { data: object }) => ({ data: { id: 'new', ...p.data } })),
  update: vi.fn(),
  updateMany: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
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
        </Admin>
      </MemoryRouter>,
    );
  });
  await act(async () => new Promise((r) => setTimeout(r, 300)));
  const text = el.textContent ?? '';
  root.unmount();
  return text;
}

describe('subscription screens render without crashing', () => {
  it.each(['/campaigns/create', '/campaigns/x', '/promo-codes/create', '/promo-codes/x'])('%s', async (path) => {
    const text = await renderAt(path);
    expect(text).not.toMatch(/client error occurred|Something went wrong/);
    expect(text).toMatch(/Save/);
  });
});

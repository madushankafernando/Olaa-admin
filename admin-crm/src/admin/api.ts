import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Settings come from NEXT_PUBLIC_* env vars at build time (see .env.example). */
export const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/+$/, ''),
};

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  if (!client) {
    client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'olaa-admin-auth' },
    });
  }
  return client;
}

/** Error carrying the HTTP status so React-Admin's checkError can react to 401/403. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
  }
}

export type TokenGetter = () => Promise<string | null>;

export const defaultToken: TokenGetter = async () => (await supabase().auth.getSession()).data.session?.access_token ?? null;

/** Calls the olaa backend with the admin's Supabase access token. */
export async function api<T = unknown>(
  path: string,
  init: { method?: string; body?: unknown; query?: Record<string, string | number | undefined> } = {},
  getToken: TokenGetter = defaultToken,
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const token = await getToken();
  const qs = init.query
    ? '?' +
      new URLSearchParams(
        Object.entries(init.query)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => [k, String(v)]),
      ).toString()
    : '';
  const res = await fetchImpl(`${config.apiUrl}${path}${qs === '?' ? '' : qs}`, {
    method: init.method ?? 'GET',
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, data?.message ?? `Request failed (${res.status})`, data);
  return data as T;
}

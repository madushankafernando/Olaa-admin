import type { AuthProvider } from 'react-admin';
import { api, ApiError, supabase } from './api';

/**
 * Admins sign in with their Supabase email + password. Being signed in isn't enough:
 * the backend's GET /admin/me must confirm the account is in `admin_users`.
 */
export const authProvider: AuthProvider = {
  async login({ username, password }: { username: string; password: string }) {
    const { error } = await supabase().auth.signInWithPassword({ email: username, password });
    if (error) throw new Error(error.message);
    try {
      await api('/admin/me');
    } catch (e) {
      await supabase().auth.signOut();
      throw new Error(e instanceof ApiError && e.status === 403 ? 'This account is not an olaa admin.' : 'Could not reach the olaa API.');
    }
  },

  async logout() {
    await supabase().auth.signOut();
  },

  async checkAuth() {
    const { data } = await supabase().auth.getSession();
    if (!data.session) throw new Error('Please sign in');
  },

  async checkError(error: unknown) {
    const status = (error as { status?: number })?.status;
    if (status === 401 || status === 403) throw new Error('Session expired or not an admin');
  },

  async getIdentity() {
    const { data } = await supabase().auth.getUser();
    if (!data.user) throw new Error('Not signed in');
    return { id: data.user.id, fullName: data.user.email ?? 'Admin' };
  },

  async getPermissions() {
    return 'admin';
  },
};

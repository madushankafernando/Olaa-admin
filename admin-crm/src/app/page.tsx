'use client';
import dynamic from 'next/dynamic';

// React-Admin is a browser-only single-page app; skip server rendering entirely.
const AdminApp = dynamic(() => import('../admin/AdminApp'), { ssr: false, loading: () => null });

export default function Page() {
  return <AdminApp />;
}

/** Static export: the whole CRM is one client-side app, served from Cloudflare Pages (`out/`). */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  transpilePackages: ['@olaa/shared'],
  reactStrictMode: true,
};
export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow connections from any hostname
  hostname: "0.0.0.0",
  // Disable strict mode for external URLs
  images: {
    domains: ['*'],
  },
  // Trust the proxy headers
  poweredByHeader: false,
  // Required for working behind a reverse proxy
  assetPrefix: process.env.NODE_ENV === 'production' ? '/' : '',
  // Trust the X-Forwarded-* headers
  experimental: {
    trustHostHeader: true,
  },
  // Ensure Next.js binds to all network interfaces
  server: {
    hostname: '0.0.0.0',
    port: parseInt(process.env.PORT || '5000'),
  },
};

export default nextConfig;

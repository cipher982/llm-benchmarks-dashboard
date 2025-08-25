/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable strict mode for external URLs
  images: {
    domains: ['*'],
  },
  // Trust the proxy headers
  poweredByHeader: false,
  // Required for working behind a reverse proxy
  assetPrefix: (process.env.NODE_ENV === 'production') ? '/' : '',
  // Allow CSS imports from node_modules
  transpilePackages: ['@mui/x-data-grid'],
  // Add CORS headers to all responses in development mode only
  async headers() {
    return process.env.NODE_ENV !== 'production' 
      ? [
          {
            // Apply these headers to all routes in development
            source: '/(.*)',
            headers: [
              {
                key: 'Access-Control-Allow-Origin',
                value: '*', // In development, allow all origins
              },
              {
                key: 'Access-Control-Allow-Methods',
                value: 'GET, POST, PUT, DELETE, OPTIONS',
              },
              {
                key: 'Access-Control-Allow-Headers',
                value: 'X-Requested-With, Content-Type, Accept',
              },
            ],
          },
        ]
      : []; // In production, use the corsMiddleware instead
  },
};

export default nextConfig;

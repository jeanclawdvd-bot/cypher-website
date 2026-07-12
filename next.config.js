/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  async redirects() {
    return [
      { source: '/vehicles/vera-solace', destination: '/vehicles/vera-solis', permanent: true },
      { source: '/vehicles/vera-solace/:path*', destination: '/vehicles/vera-solis/:path*', permanent: true },
      { source: '/ghostline/vera-solace', destination: '/vehicles/vera-solis', permanent: true },
      { source: '/ghostline/vera-solace/:path*', destination: '/vehicles/vera-solis/:path*', permanent: true },
      { source: '/ghostline', destination: '/vehicles', permanent: true },
      { source: '/ghostline/:path*', destination: '/vehicles/:path*', permanent: true },
    ];
  },
  // Windows/virtualized filesystems often miss native file-change events, so
  // Fast Refresh wouldn't pick up edits without a manual restart. Polling the
  // source tree in dev makes hot reload reliable. (node_modules is excluded to
  // keep CPU usage low.)
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 800,
        aggregateTimeout: 300,
        ignored: ['**/node_modules/**', '**/.next/**', '**/.git/**'],
      };
    }
    return config;
  },
};

module.exports = nextConfig;

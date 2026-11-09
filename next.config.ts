import type { NextConfig } from "next";
const config: NextConfig = {
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
};
export default config;

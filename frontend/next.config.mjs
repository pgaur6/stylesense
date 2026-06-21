/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ESLint is run separately — skip during production builds
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
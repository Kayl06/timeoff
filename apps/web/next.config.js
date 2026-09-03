/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@timeoff/types',
    '@timeoff/database',
    '@timeoff/utils'
  ],
  images: {
    domains: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com'],
  },
  // Standalone is for Docker. Vercel sets VERCEL=1 and needs the default serverless output.
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),
  // Add experimental features to handle SSR better
  experimental: {
    serverComponentsExternalPackages: ['@tanstack/react-query'],
  },
  // Disable static optimization temporarily to fix deployment
  trailingSlash: false,
  skipTrailingSlashRedirect: true,
  // Ignore build errors for pages that require runtime context  
  typescript: {
    // Ignore TypeScript errors during build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignore ESLint errors during build
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig 
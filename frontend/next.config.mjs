/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // SEO optimizations
  trailingSlash: false,
  generateEtags: false,
  poweredByHeader: false,
  compress: true,
  // Image optimization
  images: {
    domains: ['localhost', 'media.tycsports.com', 'www.clarin.com', 'imagenes.20minutos.es', 'localhost:8000', 'www.excelsior.com.mx', 'videos.openai.com'],
    formats: ['image/webp', 'image/avif', 'image/jpeg', 'image/png'],
    minimumCacheTTL: 86400, // 24 hours
  },
  // Headers for SEO and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'media.tycsports.com', 'www.clarin.com', 'imagenes.20minutos.es'],
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'media.tycsports.com', 'www.clarin.com', 'imagenes.20minutos.es', 'localhost:8000', 'www.excelsior.com.mx', 'videos.openai.com'],
  },
};

export default nextConfig;

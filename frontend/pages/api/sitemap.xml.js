// API route para generar sitemap.xml dinámico
const SITE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://fotomorfia.com' 
  : 'http://localhost:3000';

// Páginas estáticas del sitio
const staticPages = [
  {
    url: '/',
    changefreq: 'weekly',
    priority: '1.0',
    lastmod: new Date().toISOString(),
  },
  {
    url: '/sobre-nosotros',
    changefreq: 'monthly',
    priority: '0.8',
    lastmod: new Date().toISOString(),
  },
  {
    url: '/blog',
    changefreq: 'weekly',
    priority: '0.9',
    lastmod: new Date().toISOString(),
  },
  {
    url: '/contacto',
    changefreq: 'monthly',
    priority: '0.7',
    lastmod: new Date().toISOString(),
  },
  {
    url: '/legal/aviso-legal',
    changefreq: 'yearly',
    priority: '0.3',
    lastmod: '2025-08-14T00:00:00.000Z',
  },
  {
    url: '/legal/politica-privacidad',
    changefreq: 'yearly',
    priority: '0.3',
    lastmod: '2025-08-14T00:00:00.000Z',
  },
  {
    url: '/legal/politica-cookies',
    changefreq: 'yearly',
    priority: '0.3',
    lastmod: '2025-08-14T00:00:00.000Z',
  },
];

function generateSitemapXML(pages) {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `  <url>
    <loc>${SITE_URL}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return sitemap;
}

export default function handler(req, res) {
  // Solo responder a GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const sitemap = generateSitemapXML(staticPages);
    
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache por 24 horas
    res.status(200).send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).json({ message: 'Error generating sitemap' });
  }
}

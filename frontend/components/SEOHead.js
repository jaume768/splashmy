import Head from 'next/head';

const SEOHead = ({ 
  title = "Fotomorfia - Transformador de estilos de imágenes IA", 
  description = "Transformador de estilos de imágenes IA que te permite transformar tus imágenes en cualquier estilo que desees. Prueba 100% gratis.",
  canonical,
  ogImage = "/og-fotomorfia.png",
  ogType = "website",
  noindex = false,
  keywords,
  author = "Fotomorfia",
  twitterCard = "summary_large_image"
}) => {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://fotomorfia.com' 
    : 'http://localhost:3000';
  
  const fullCanonical = canonical ? `${baseUrl}${canonical}` : baseUrl;
  const fullOgImage = ogImage.startsWith('http') ? ogImage : `${baseUrl}${ogImage}`;

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      
      {keywords && <meta name="keywords" content={keywords} />}
      {author && <meta name="author" content={author} />}
      
      {/* Canonical URL */}
      <link rel="canonical" href={fullCanonical} />
      
      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={fullCanonical} />
      <meta property="og:image" content={fullOgImage} />
      <meta property="og:site_name" content="Fotomorfia" />
      <meta property="og:locale" content="es_ES" />
      
      {/* Twitter Cards */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullOgImage} />
      
      {/* Robots */}
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      
      {/* Favicons and Icons */}
      <link rel="icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      
      {/* Preconnect to external domains */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
    </Head>
  );
};

export default SEOHead;

import { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function MyCreationsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace({ pathname: '/dashboard', query: { tab: 'my-gallery' } }, undefined, { shallow: true });
  }, [router]);

  return (
    <>
      <Head>
        <title>Mis Creaciones - SplashMy</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div style={{ padding: '24px' }}>Redirigiendo a tu galería…</div>
    </>
  );
}

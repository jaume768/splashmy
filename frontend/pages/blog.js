import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/home/Header';
import Footer from '../components/home/Footer';
import styles from '../styles/Contact.module.css';

export default function BlogPage() {
  return (
    <>
      <Head>
        <title>Blog - SplashMy</title>
        <meta name="description" content="Nuestro blog estará disponible próximamente." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Header />

      <main className={styles.page}>
        <header className={`${styles.header} container`}>
          <h1 className={styles.title}>Blog</h1>
          <p className={styles.subtitle}>Próximamente estará disponible. ¡Estamos preparando contenido increíble!</p>
        </header>

        <section className={`${styles.content} container`}>
          <div className={styles.grid}>
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>¿Qué publicarémos?</h2>
              <p className={styles.secondaryText}>
                Noticias, guías y consejos sobre diseño con IA, flujos de trabajo y novedades de SplashMy.
              </p>
              <p className={styles.secondaryText} style={{ marginTop: '1.5rem' }}>
                Mientras tanto, puedes explorar el{' '}
                <Link href="/dashboard">dashboard</Link>{' '}o contactar con nosotros en el{' '}
                <Link href="/contacto">Centro de Ayuda</Link>.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

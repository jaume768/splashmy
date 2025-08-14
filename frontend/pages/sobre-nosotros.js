import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/home/Header';
import Footer from '../components/home/Footer';
import styles from '../styles/Contact.module.css';

export default function SobreNosotrosPage() {
  return (
    <>
      <Head>
        <title>Sobre Nosotros - SplashMy</title>
        <meta name="description" content="Conoce a SplashMy: nuestra misión, visión y valores." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Header />

      <main className={styles.page}>
        <header className={`${styles.header} container`}>
          <h1 className={styles.title}>Sobre Nosotros</h1>
          <p className={styles.subtitle}>Impulsamos la creatividad con IA para transformar imágenes de forma simple y accesible.</p>
        </header>

        <section className={`${styles.content} container`}>
          <div className={styles.grid}>
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Nuestra misión</h2>
              <p className={styles.secondaryText}>
                En SplashMy creemos que la inteligencia artificial debe potenciar a las personas creativas. 
                Por eso construimos herramientas sencillas, potentes y seguras para crear, editar y compartir imágenes.
              </p>
              <h3 className={styles.sectionTitle} style={{ marginTop: '1.5rem' }}>Lo que nos guía</h3>
              <ul className={styles.secondaryText} style={{ lineHeight: 1.8 }}>
                <li>Diseño centrado en el usuario</li>
                <li>Privacidad y seguridad como prioridad</li>
                <li>Rendimiento y calidad de resultados</li>
                <li>Transparencia y soporte cercano</li>
              </ul>
              <p className={styles.secondaryText} style={{ marginTop: '1.5rem' }}>
                ¿Tienes ideas o sugerencias? Nos encantará escucharte en nuestro{' '}
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

import SEOHead from '../components/SEOHead';
import Link from 'next/link';
import Header from '../components/home/Header';
import Footer from '../components/home/Footer';
import styles from '../styles/Contact.module.css';

export default function BlogPage() {
  return (
    <>
      <SEOHead 
        title="Blog - Fotomorfia"
        description="Nuestro blog estará disponible próximamente con contenido sobre IA, diseño y transformación de imágenes."
        canonical="/blog"
      />

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
                Noticias, guías y consejos sobre diseño con IA, flujos de trabajo y novedades de Fotomorfia.
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

import Head from 'next/head';
import Link from 'next/link';
import styles from '@/styles/Legal.module.css';

const UPDATED_AT = '14/08/2025';

export default function PoliticaCookies() {
  return (
    <>
      <Head>
        <title>Política de Cookies | Fotomorfia</title>
        <meta name="description" content="Política de cookies de Fotomorfia" />
      </Head>

      <div className={styles.header}>
        <div className="container">
          <h1 className={styles.title}>Política de Cookies</h1>
          <p className={styles.meta}>Última actualización: {UPDATED_AT}</p>
        </div>
      </div>

      <main className={`container ${styles.legalPage}`}>
        <section className={styles.content}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>1. ¿Qué son las cookies?</h2>
            <p className={styles.paragraph}>
              Las cookies son pequeños archivos de texto que se almacenan en tu navegador cuando visitas un sitio web. 
              Sirven para recordar preferencias o mantener sesiones de usuario, entre otras funcionalidades.
            </p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>2. Tipos de cookies que utilizamos</h2>
            <p className={styles.paragraph}>
              En este momento únicamente utilizamos cookies <strong>estrictamente necesarias</strong> para el 
              funcionamiento del sitio, por ejemplo para la autenticación y la seguridad. No empleamos cookies de 
              analítica ni de publicidad.
            </p>
            <ul className={styles.list}>
              <li className={styles.listItem}><strong>Cookies necesarias:</strong> requeridas para iniciar sesión, mantener tu sesión y proteger la plataforma.</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>3. Gestión del consentimiento</h2>
            <p className={styles.paragraph}>
              Mostramos un aviso de cookies en tu primera visita donde puedes <strong>Aceptar</strong> o 
              <strong> Rechazar</strong> el uso de cookies. Dado que solo usamos cookies necesarias, el sitio puede requerir 
              algunas cookies para funcionar correctamente (por ejemplo, para el proceso de autenticación). 
              Puedes cambiar tu elección eliminando las cookies desde la configuración de tu navegador.
            </p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>4. ¿Cómo eliminar o bloquear cookies?</h2>
            <p className={styles.paragraph}>
              Puedes permitir, bloquear o eliminar las cookies instaladas en tu equipo mediante la configuración de las opciones del navegador. 
              Consulta las instrucciones de tu navegador para más detalles.
            </p>
          </div>

          <div className={styles.section}>
            <p className={styles.paragraph}>
              Para más información sobre cómo tratamos tus datos personales, visita la{' '}
              <Link className={styles.link} href="/legal/politica-privacidad">Política de Privacidad</Link>.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}

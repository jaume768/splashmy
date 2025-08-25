import SEOHead from '@/components/SEOHead';
import Link from 'next/link';
import styles from '@/styles/Legal.module.css';

const UPDATED_AT = '14/08/2025';

export default function AvisoLegal() {
  return (
    <>
      <SEOHead 
        title="Aviso Legal | Fotomorfia"
        description="Aviso legal del sitio Fotomorfia - Información legal sobre el uso del servicio"
        canonical="/legal/aviso-legal"
      />

      <div className={styles.header}>
        <div className="container">
          <h1 className={styles.title}>Aviso Legal</h1>
          <p className={styles.meta}>Última actualización: {UPDATED_AT}</p>
        </div>
      </div>

      <main className={`container ${styles.legalPage}`}>
        <section className={styles.content}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>1. Identificación del titular</h2>
            <p className={styles.paragraph}>Titular: Jaume Fernández Suñer (persona física)</p>
            <p className={styles.paragraph}>DNI: 41621021Z</p>
            <p className={styles.paragraph}>Domicilio fiscal: Calle Mallorca, n.50, 07500, Manacor, Islas Baleares, España</p>
            <p className={styles.paragraph}>Email de contacto: <a className={styles.link} href="mailto:contacto@fotomorfia.com">contacto@fotomorfia.com</a></p>
            <p className={styles.paragraph}>Teléfono: 683472110</p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>2. Objeto del sitio</h2>
            <p className={styles.paragraph}>
              Fotomorfia es una plataforma de procesamiento de imágenes con inteligencia artificial que permite
              generación, edición y transformación de estilo de imágenes.
            </p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>3. Condiciones de uso</h2>
            <p className={styles.paragraph}>
              El acceso y uso del sitio implica la aceptación de las presentes condiciones. El usuario se compromete a
              hacer un uso adecuado y lícito de los contenidos, a no realizar actividades ilícitas o contrarias a la
              buena fe y al orden público, y a respetar los derechos de propiedad intelectual e industrial.
            </p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>4. Propiedad intelectual e industrial</h2>
            <p className={styles.paragraph}>
              Los elementos del sitio (marcas, logotipos, diseño, textos, imágenes de la interfaz y software) están
              protegidos por derechos de propiedad intelectual e industrial. Queda prohibida su reproducción, distribución
              o transformación salvo autorización expresa del titular o cuando esté permitido por la ley.
            </p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>5. Responsabilidad</h2>
            <p className={styles.paragraph}>
              El titular no garantiza la disponibilidad ininterrumpida del servicio ni la ausencia de errores, aunque se
              adoptan medidas para prevenirlos y mitigarlos. El uso del sitio por parte del usuario se realiza bajo su
              propia responsabilidad.
            </p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>6. Enlaces</h2>
            <p className={styles.paragraph}>
              Este sitio puede incluir enlaces a sitios de terceros. El titular no se hace responsable de los contenidos o
              políticas de dichos sitios. Se recomienda revisar sus respectivos avisos legales y políticas de privacidad.
            </p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>7. Legislación aplicable</h2>
            <p className={styles.paragraph}>
              Este Aviso Legal se rige por la legislación española. Para cualquier controversia, las partes se someterán a
              los juzgados y tribunales competentes conforme a la normativa aplicable.
            </p>
          </div>

          <div className={styles.section}>
            <p className={styles.paragraph}>
              Consulta también nuestra{' '}
              <Link className={styles.link} href="/legal/politica-privacidad">Política de Privacidad</Link> y{' '}
              <Link className={styles.link} href="/legal/politica-cookies">Política de Cookies</Link>.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}

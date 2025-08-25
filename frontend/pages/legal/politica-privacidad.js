import SEOHead from '@/components/SEOHead';
import styles from '@/styles/Legal.module.css';

const UPDATED_AT = '14/08/2025';

export default function PoliticaPrivacidad() {
  return (
    <>
      <SEOHead 
        title="Política de Privacidad | Fotomorfia"
        description="Política de privacidad de Fotomorfia - Información sobre el tratamiento de datos personales"
        canonical="/legal/politica-privacidad"
      />

      <div className={styles.header}>
        <div className="container">
          <h1 className={styles.title}>Política de Privacidad</h1>
          <p className={styles.meta}>Última actualización: {UPDATED_AT}</p>
        </div>
      </div>

      <main className={`container ${styles.legalPage}`}>
        <section className={styles.content}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>1. Responsable del tratamiento</h2>
            <p className={styles.paragraph}>Jaume Fernández Suñer (persona física)</p>
            <p className={styles.paragraph}>DNI: 41621021Z</p>
            <p className={styles.paragraph}>Domicilio fiscal: Calle Mallorca, n.50, 07500, Manacor, Islas Baleares, España</p>
            <p className={styles.paragraph}>Correo de contacto: contacto@fotomorfia.com</p>
            <p className={styles.paragraph}>No existe Delegado de Protección de Datos (DPO).</p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>2. Datos personales que tratamos</h2>
            <ul className={styles.list}>
              <li className={styles.listItem}>Datos de cuenta: email, nombre de usuario, nombre y apellidos.</li>
              <li className={styles.listItem}>Datos de verificación: estado de verificación de correo.</li>
              <li className={styles.listItem}>Contenido: imágenes subidas y generadas, prompts y parámetros de procesamiento.</li>
              <li className={styles.listItem}>Metadatos técnicos: IP, dispositivo/navegador, registros de acceso y uso para seguridad.</li>
              <li className={styles.listItem}>En caso de pagos, datos de facturación/identificación gestionados por terceros de pago (si se incorporan en el futuro).</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>3. Finalidades y base jurídica</h2>
            <ul className={styles.list}>
              <li className={styles.listItem}><strong>Prestación del servicio</strong> (ejecución de contrato): crear y gestionar tu cuenta, permitir el procesamiento de imágenes con IA, y proporcionar funcionalidad de producto.</li>
              <li className={styles.listItem}><strong>Seguridad y prevención del fraude</strong> (interés legítimo y cumplimiento legal): controles de acceso, moderación de contenido, y prevención de usos indebidos.</li>
              <li className={styles.listItem}><strong>Comunicaciones</strong> (ejecución de contrato y, en su caso, consentimiento): notificaciones operativas y, si se implementan, comunicaciones comerciales con tu consentimiento.</li>
              <li className={styles.listItem}><strong>Atención al usuario</strong> (interés legítimo/ejecución de contrato): gestionar consultas y soporte.</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>4. Destinatarios y encargados</h2>
            <p className={styles.paragraph}>Podemos compartir datos con proveedores que actúan como encargados del tratamiento para la prestación del servicio, incluyendo:</p>
            <ul className={styles.list}>
              <li className={styles.listItem}>Amazon Web Services (S3) para almacenamiento y Amazon Rekognition para moderación.</li>
              <li className={styles.listItem}>OpenAI para el procesamiento/generación de imágenes mediante IA.</li>
              <li className={styles.listItem}>Google (OAuth) para autenticación.</li>
            </ul>
            <p className={styles.paragraph}>Estos proveedores tratarán los datos conforme a nuestras instrucciones y con las garantías adecuadas.</p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>5. Transferencias internacionales</h2>
            <p className={styles.paragraph}>Algunos proveedores pueden estar ubicados fuera del Espacio Económico Europeo (EEE). En tal caso, se adoptarán las salvaguardas adecuadas, como cláusulas contractuales tipo aprobadas por la Comisión Europea, cuando sea necesario.</p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>6. Plazos de conservación</h2>
            <p className={styles.paragraph}>Conservamos tus datos mientras tu cuenta permanezca activa. Tras su baja, los bloquearemos durante los plazos legalmente establecidos para atender posibles responsabilidades.</p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>7. Derechos de las personas usuarias</h2>
            <p className={styles.paragraph}>Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad enviando un email a contacto@fotomorfia.com, acreditando tu identidad.</p>
            <p className={styles.paragraph}>También tienes derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD) si consideras que el tratamiento no se ajusta a la normativa.</p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>8. Menores de edad</h2>
            <p className={styles.paragraph}>No dirigimos nuestros servicios a menores de 14 años. Si detectamos que se ha registrado un menor sin autorización, procederemos a eliminar la cuenta.</p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>9. Seguridad</h2>
            <p className={styles.paragraph}>Aplicamos medidas técnicas y organizativas apropiadas para proteger los datos personales frente a accesos no autorizados, pérdida o alteración.</p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>10. Cambios en la política</h2>
            <p className={styles.paragraph}>Podremos actualizar esta política para reflejar cambios legales o del servicio. Publicaremos la versión actualizada indicando la fecha de última actualización.</p>
          </div>
        </section>
      </main>
    </>
  );
}

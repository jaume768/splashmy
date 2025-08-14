import { useRouter } from 'next/router';
import styles from '../../styles/components/home/Hero.module.css';

// SVG Icons Components
const UploadIcon = () => (
  <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 15V3M12 3L8 7M12 3L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 17L2 19C2 20.1046 2.89543 21 4 21L20 21C21.1046 21 22 20.1046 22 19L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const EditIcon = () => (
  <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 4H4C2.89543 4 2 4.89543 2 6V18C2 19.1046 2.89543 20 4 20H16C17.1046 20 18 19.1046 18 18V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18.5 2.5C19.3284 1.67157 20.6716 1.67157 21.5 2.5C22.3284 3.32843 22.3284 4.67157 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function Hero() {
  const router = useRouter();
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.content}>
          <h1 className={styles.title}>
            <span className={styles.titleMain}>CAMBIA DE ESTILO</span>
            <span className={styles.titleHighlight}>TUS IMÁGENES</span>
            <span className={styles.titleMain}>CON IA!</span>
          </h1>
          <p className={styles.subtitle}>
            Transformador de estilos de imágenes con IA y generador de imágenes
          </p>
          
          <div className={styles.buttons}>
            <button className={styles.primaryButton} onClick={() => router.push('/dashboard')}>
              <UploadIcon />
              Abrir estilos de imágenes IA
            </button>
            <button className={styles.secondaryButton}>
              <EditIcon />
              Generador de imágenes IA
            </button>
          </div>
          
          <button className={styles.trialButton} onClick={() => router.push('/dashboard')}>
            INICIAR PRUEBA GRATUITA
          </button>
        </div>
      </div>
    </section>
  );
}

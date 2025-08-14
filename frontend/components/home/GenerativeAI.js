import { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../../styles/components/home/GenerativeAI.module.css';

export default function GenerativeAI() {
  const [inputValue, setInputValue] = useState('Estilo anime');
  const router = useRouter();

  return (
    <section className={styles.generativeAI}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.textSection}>
            <span className={styles.badge}>IA GENERATIVA</span>
            <h2 className={styles.title}>Increíble ¡Transformador de estilos de imágenes IA!</h2>
            <p className={styles.description}>
              Transformador de estilos de imágenes IA que te permite transformar 
              tus imágenes en cualquier estilo que desees.
            </p>
            <button className={styles.ctaButton} onClick={() => router.push('/dashboard')}>
              Probar transformador
            </button>
          </div>
          
          <div className={styles.imageSection}>
            <div className={styles.imageContainer}>
              <div className={styles.imageStack}>
                <div className={styles.imageWrapper}>
                  <img 
                    src="/demo-image-1.png" 
                    alt="Mujer corriendo - imagen original" 
                    className={`${styles.image} ${styles.imageBack}`}
                  />
                </div>
                <div className={styles.imageWrapper}>
                  <img 
                    src="/demo-image-2.png" 
                    alt="Mujer corriendo con estilo anime - imagen generada" 
                    className={`${styles.image} ${styles.imageFront}`}
                  />
                </div>
              </div>
              
              <div className={styles.inputContainer}>
                <div className={styles.inputWrapper}>
                  <input 
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className={styles.styleInput}
                    placeholder="Describe el estilo..."
                  />
                  <button className={styles.generateButton} onClick={() => router.push('/dashboard')}>
                    Generar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

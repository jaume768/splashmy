import { useState } from 'react';
import styles from '../../styles/components/home/GenerativeAI.module.css';

export default function GenerativeAI() {
  const [inputValue, setInputValue] = useState('Estilo anime');

  return (
    <section className={styles.generativeAI}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.textSection}>
            <span className={styles.badge}>IA GENERATIVA</span>
            <h2 className={styles.title}>Increíble ¡Relleno generativo IA!</h2>
            <p className={styles.description}>
              Desde la conceptualización de ideas creativas hasta la realización de 
              ediciones y refinamientos completos, el relleno generativo puede 
              ayudarte a materializar rápidamente tu visión mientras te da control 
              total sobre cada creación.
            </p>
            <button className={styles.ctaButton}>
              Probar relleno generativo
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
                  <button className={styles.generateButton}>
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

import { useState } from 'react';
import styles from '../../styles/components/home/FAQ.module.css';

const faqData = [
  {
    id: 1,
    question: "¿Qué es SplashMy y cómo funciona?",
    answer: "SplashMy es una plataforma de IA que permite transformar y editar imágenes utilizando inteligencia artificial avanzada. Puedes aplicar diferentes estilos artísticos, generar nuevas imágenes desde texto, y editar fotos de manera profesional directamente desde tu navegador."
  },
  {
    id: 2,
    question: "¿Es gratis usar SplashMy?",
    answer: "Ofrecemos una prueba gratuita que te permite experimentar con nuestras herramientas. Después puedes elegir entre nuestros planes de suscripción que se adaptan a diferentes necesidades, desde uso personal hasta profesional."
  },
  {
    id: 3,
    question: "¿Qué formatos de imagen son compatibles?",
    answer: "SplashMy es compatible con los formatos más populares: JPG, PNG, WebP, y HEIC. Las imágenes pueden tener una resolución de hasta 4K para obtener resultados de la más alta calidad."
  },
  {
    id: 4,
    question: "¿Cuánto tiempo toma procesar una imagen?",
    answer: "El tiempo de procesamiento varía según la complejidad de la transformación, pero generalmente toma entre 10-30 segundos. Los usuarios Premium tienen acceso a procesamiento prioritario para resultados más rápidos."
  },
  {
    id: 5,
    question: "¿Puedo usar las imágenes generadas comercialmente?",
    answer: "Sí, todas las imágenes que generes o edites con SplashMy son tuyas para uso comercial. Te otorgamos una licencia completa para usar el contenido creado en tus proyectos profesionales."
  },
  {
    id: 6,
    question: "¿Funciona en dispositivos móviles?",
    answer: "¡Por supuesto! SplashMy está optimizado para funcionar perfectamente en móviles, tablets y escritorio. Puedes editar y generar imágenes desde cualquier dispositivo con conexión a internet."
  },
  {
    id: 7,
    question: "¿Cómo cancelo mi suscripción?",
    answer: "Puedes cancelar tu suscripción en cualquier momento desde tu panel de usuario. No hay penalizaciones por cancelación y mantendrás acceso hasta el final de tu período de facturación actual."
  }
];

const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={styles.chevron}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export default function FAQ() {
  const [openItems, setOpenItems] = useState(new Set([1])); // Primer item abierto por defecto

  const toggleItem = (id) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <section className={styles.faq}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Preguntas Frecuentes</h2>
          <p className={styles.subtitle}>
            Encuentra respuestas a las preguntas más comunes sobre SplashMy
          </p>
        </div>

        <div className={styles.faqList}>
          {faqData.map((item) => (
            <div 
              key={item.id} 
              className={`${styles.faqItem} ${openItems.has(item.id) ? styles.faqItemOpen : ''}`}
            >
              <button
                className={styles.question}
                onClick={() => toggleItem(item.id)}
                aria-expanded={openItems.has(item.id)}
              >
                <span className={styles.questionText}>{item.question}</span>
                <ChevronDownIcon />
              </button>
              
              <div className={styles.answerWrapper}>
                <div className={styles.answer}>
                  <p>{item.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.cta}>
          <h3 className={styles.ctaTitle}>¿Aún tienes preguntas?</h3>
          <p className={styles.ctaText}>
            Nuestro equipo de soporte está aquí para ayudarte
          </p>
          <button className={styles.ctaButton}>
            Contactar Soporte
          </button>
        </div>
      </div>
    </section>
  );
}

import { useState } from 'react';
import styles from '../../styles/components/home/Testimonials.module.css';

const testimonials = [
  {
    id: 1,
    name: "María González",
    role: "Diseñadora Gráfica",
    avatar: "MG",
    rating: 5,
    text: "SplashMy ha revolucionado mi flujo de trabajo. La calidad de las transformaciones de estilo es increíble y me ahorra horas de edición manual."
  },
  {
    id: 2,
    name: "Carlos Ruiz",
    role: "Fotógrafo",
    avatar: "CR",
    rating: 5,
    text: "Como fotógrafo profesional, necesito herramientas que me den resultados rápidos y de calidad. SplashMy supera todas mis expectativas."
  },
  {
    id: 3,
    name: "Ana Martínez",
    role: "Content Creator",
    avatar: "AM",
    rating: 5,
    text: "La facilidad de uso es impresionante. Puedo crear contenido único para mis redes sociales en minutos. ¡Totalmente recomendado!"
  },
  {
    id: 4,
    name: "David López",
    role: "Director Creativo",
    avatar: "DL",
    rating: 5,
    text: "La precisión de la IA para mantener la esencia de las imágenes mientras aplica nuevos estilos es extraordinaria. Un game changer total."
  }
];

const StarIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={styles.star}>
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
  </svg>
);

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className={styles.testimonials}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Lo que dicen nuestros usuarios</h2>
          <p className={styles.subtitle}>
            Miles de creadores confían en SplashMy para transformar sus imágenes
          </p>
        </div>

        <div className={styles.testimonialContainer}>
          <div className={styles.testimonialSlider} style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className={styles.testimonialCard}>
                <div className={styles.rating}>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarIcon key={i} />
                  ))}
                </div>
                <blockquote className={styles.quote}>
                  "{testimonial.text}"
                </blockquote>
                <div className={styles.author}>
                  <div className={styles.avatar}>
                    {testimonial.avatar}
                  </div>
                  <div className={styles.authorInfo}>
                    <cite className={styles.authorName}>{testimonial.name}</cite>
                    <span className={styles.authorRole}>{testimonial.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.navigation}>
          <button 
            onClick={prevTestimonial}
            className={styles.navButton}
            aria-label="Testimonial anterior"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className={styles.dots}>
            {testimonials.map((_, index) => (
              <button
                key={index}
                className={`${styles.dot} ${index === currentIndex ? styles.dotActive : ''}`}
                onClick={() => setCurrentIndex(index)}
                aria-label={`Ver testimonial ${index + 1}`}
              />
            ))}
          </div>

          <button 
            onClick={nextTestimonial}
            className={styles.navButton}
            aria-label="Siguiente testimonial"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

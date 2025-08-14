import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/home/Header';
import Footer from '../components/home/Footer';
import styles from '../styles/Contact.module.css';
import { useEffect, useState } from 'react';
import { sendContactMessage, getCurrentUser } from '../utils/api';

export default function ContactoPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('soporte');
  const [message, setMessage] = useState('');
  const [spamTrap, setSpamTrap] = useState(''); // honeypot
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      if (user.email) setEmail(user.email);
      if (user.full_name) setName(user.full_name);
      else if (user.username) setName(user.username);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!name || !email || !message) {
      setError('Por favor, completa todos los campos obligatorios.');
      return;
    }
    if (message.trim().length < 10) {
      setError('El mensaje debe tener al menos 10 caracteres.');
      return;
    }
    setLoading(true);
    try {
      await sendContactMessage({ name, email, subject, message, spam_trap: spamTrap });
      setSuccess('Mensaje enviado. Te contactaremos pronto.');
      // Mantener nombre/email por comodidad, limpiar mensaje
      setMessage('');
    } catch (err) {
      const status = err?.status || err?.response?.status || 0;
      if (status === 429) {
        setError('Has alcanzado el límite de envíos. Inténtalo de nuevo más tarde.');
      } else {
        setError('No se pudo enviar el mensaje. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Contacto y Soporte - SplashMy</title>
        <meta name="description" content="Ponte en contacto con el equipo de soporte de SplashMy. Estamos aquí para ayudarte." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Header />

      <main className={styles.page}>
        <header className={`${styles.header} container`}>
          <h1 className={styles.title}>Contacto y Soporte</h1>
          <p className={styles.subtitle}>¿Necesitas ayuda? Envíanos un mensaje y te responderemos lo antes posible.</p>
        </header>

        <section className={`${styles.content} container`}>
          <div className={styles.grid}>
            {/* Formulario */}
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Envíanos un mensaje</h2>
              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="name">Nombre completo</label>
                  <input
                    className={styles.input}
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Tu nombre"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="email">Correo electrónico</label>
                  <input
                    className={styles.input}
                    id="email"
                    name="email"
                    type="email"
                    placeholder="tucorreo@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="topic">Asunto</label>
                  <select
                    className={styles.select}
                    id="subject"
                    name="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  >
                    <option value="soporte">Soporte técnico</option>
                    <option value="facturacion">Facturación</option>
                    <option value="sugerencias">Sugerencias</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="message">Mensaje</label>
                  <textarea
                    className={styles.textarea}
                    id="message"
                    name="message"
                    placeholder="Cuéntanos en qué podemos ayudarte..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  ></textarea>
                </div>

                {/* Campo honeypot invisible para bots */}
                <input
                  type="text"
                  name="spam_trap"
                  value={spamTrap}
                  onChange={(e) => setSpamTrap(e.target.value)}
                  style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
                  tabIndex="-1"
                  autoComplete="off"
                  aria-hidden="true"
                />

                {success && (
                  <p className={styles.secondaryText} style={{ color: 'var(--green-400, #16a34a)' }}>{success}</p>
                )}
                {error && (
                  <p className={styles.secondaryText} style={{ color: 'var(--red-400, #ef4444)' }}>{error}</p>
                )}

                <div className={styles.actions}>
                  <span className={styles.secondaryText}>
                    Al enviar, aceptas nuestra{' '}
                    <Link href="/legal/politica-privacidad">Política de Privacidad</Link>.
                  </span>
                  <button type="submit" className={styles.submit} disabled={loading} aria-busy={loading}>
                    {loading ? 'Enviando…' : 'Enviar'}
                  </button>
                </div>
              </form>
            </div>

            {/* Información de contacto */}
            <aside className={styles.card}>
              <h2 className={styles.sectionTitle}>Información</h2>
              <div className={styles.infoList}>
                <div className={styles.infoItem}>
                  <div>
                    <div className={styles.infoTitle}>Correo</div>
                    <div className={styles.infoValue}><a href="mailto:contacto@splashmy.com">contacto@splashmy.com</a></div>
                  </div>
                </div>
                <div className={styles.infoItem}>
                  <div>
                    <div className={styles.infoTitle}>Horario</div>
                    <div className={styles.infoValue}>Lunes a Viernes, 9:00 - 18:00</div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 'var(--spacing-lg)' }}>
                <p className={styles.secondaryText}>
                  ¿Buscas respuestas rápidas? Visita las{' '}
                  <Link href="/#faq">Preguntas Frecuentes</Link>.
                </p>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

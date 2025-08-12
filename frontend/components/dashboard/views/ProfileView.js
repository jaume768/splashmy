import React, { useEffect, useState } from 'react';
import styles from '../../../styles/ProfileView.module.css';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchUserProfile, updateUserProfile } from '../../../utils/api';

export default function ProfileView() {
  const { authenticated, logout, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ first_name: '', last_name: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchUserProfile();
        if (!mounted) return;
        setProfile(data);
        setForm({
          first_name: data?.first_name || '',
          last_name: data?.last_name || '',
        });
      } catch (e) {
        console.error('Error loading profile:', e);
        if (mounted) setError('No se pudo cargar tu perfil.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (authenticated) {
      load();
    } else {
      setLoading(false);
    }
    return () => { mounted = false; };
  }, [authenticated]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const payload = { first_name: form.first_name, last_name: form.last_name };
      const updated = await updateUserProfile(payload);
      setProfile((prev) => ({ ...prev, ...updated }));
      setMessage('Cambios guardados.');
      await refreshUser?.();
    } catch (e) {
      console.error('Error updating profile:', e);
      setError('No se pudieron guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  if (!authenticated) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <p>Debes iniciar sesión para ver tu perfil.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <section className={styles.header}>
        <h1 className={styles.title}>Mi perfil</h1>
        <p className={styles.subtitle}>Información básica de tu cuenta</p>
      </section>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Información</h2>
          {loading ? (
            <p className={styles.muted}>Cargando…</p>
          ) : (
            <form className={styles.form} onSubmit={onSubmit}>
              <div className={styles.field}>
                <label className={styles.label}>Usuario</label>
                <input className={styles.input} type="text" value={profile?.username || ''} disabled />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Email</label>
                <input className={styles.input} type="email" value={profile?.email || ''} disabled />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Nombre</label>
                <input
                  className={styles.input}
                  name="first_name"
                  type="text"
                  value={form.first_name}
                  onChange={onChange}
                  placeholder="Tu nombre"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Apellidos</label>
                <input
                  className={styles.input}
                  name="last_name"
                  type="text"
                  value={form.last_name}
                  onChange={onChange}
                  placeholder="Tus apellidos"
                />
              </div>

              {message && <div className={styles.success}>{message}</div>}
              {error && <div className={styles.error}>{error}</div>}

              <div className={styles.actions}>
                <button type="submit" className={styles.primaryButton} disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Sesión</h2>
          <p className={styles.muted}>Cierra tu sesión en este dispositivo.</p>
          <button className={styles.dangerButton} onClick={logout}>Cerrar sesión</button>
        </div>
      </div>
    </div>
  );
}

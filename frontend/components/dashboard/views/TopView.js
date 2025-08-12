import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from '../../../styles/ImagesView.module.css';
import { getPublicProcessingResults, getProcessingResultDetail, toggleProcessingResultLike, downloadProcessingResult, toggleProcessingResultVisibility } from '../../../utils/api';
import { useAuth } from '../../../contexts/AuthContext';

export default function TopView() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [nextPage, setNextPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);
  const PAGE_SIZE = 30;
  const { authenticated } = useAuth();
  const [likeLoadingId, setLikeLoadingId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [visibilityLoading, setVisibilityLoading] = useState(false);

  const loadPage = useCallback(async (nextPage) => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getPublicProcessingResults(nextPage, PAGE_SIZE, '-like_count');
      const results = Array.isArray(data) ? data : (data?.results || []);
      setItems((prev) => (nextPage === 1 ? results : [...prev, ...results]));

      // Determine if more pages exist
      if (data && typeof data === 'object') {
        if (data.next) {
          // Parse next page from URL to stay compatible with apiFetch base
          try {
            const url = new URL(data.next);
            const next = parseInt(url.searchParams.get('page') || '', 10);
            setNextPage(Number.isFinite(next) ? next : null);
            setHasMore(Number.isFinite(next));
          } catch {
            // If parsing fails, fallback using results length
            const more = results.length === PAGE_SIZE;
            setHasMore(more);
            setNextPage(more ? (page + 1) : null);
          }
        } else {
          setHasMore(false);
          setNextPage(null);
        }
      } else {
        // Non-paginated fallback
        const more = results.length === PAGE_SIZE;
        setHasMore(more);
        setNextPage(more ? (page + 1) : null);
      }

      setPage(nextPage);
    } catch (err) {
      console.error('Error loading top images:', err);
      // Gracefully handle out-of-range page requests
      const is404 = err?.status === 404 || (typeof err?.message === 'string' && err.message.includes('"status":404'));
      const invalidPage = is404 && (err?.response?.errors?.detail === 'Invalid page.' || (typeof err?.message === 'string' && err.message.includes('Invalid page')));
      if (invalidPage) {
        setHasMore(false);
        setNextPage(null);
      } else {
        setError('No se pudieron cargar las imágenes top.');
      }
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page]);

  // Initial load
  useEffect(() => {
    loadPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting && !loading && hasMore) {
        if (nextPage) {
          loadPage(nextPage);
        }
      }
    }, { rootMargin: '200px' });

    observerRef.current.observe(sentinelRef.current);

    return () => observerRef.current && observerRef.current.disconnect();
  }, [page, hasMore, nextPage, loading, loadPage]);

  // Handlers for likes
  const handleToggleLike = useCallback(async (item) => {
    try {
      if (!authenticated) {
        alert('Debes iniciar sesión para dar like.');
        return;
      }
      setLikeLoadingId(item.id);
      const res = await toggleProcessingResultLike(item.id);

      // Update items list
      setItems((prev) => prev.map((it) => (
        it.id === item.id ? { ...it, user_has_liked: res.liked, like_count: res.like_count } : it
      )));

      // Update selected item if open
      setSelectedItem((prev) => prev && prev.id === item.id ? { ...prev, user_has_liked: res.liked, like_count: res.like_count } : prev);
    } catch (err) {
      console.error('Error toggling like:', err);
      setError('No se pudo actualizar el like.');
    } finally {
      setLikeLoadingId(null);
    }
  }, [authenticated]);

  // Modal handlers
  const openModal = useCallback(async (item) => {
    try {
      setSelectedItem(item);
      setIsModalOpen(true);
      // Refresh details for accuracy (like count, signed url)
      const detail = await getProcessingResultDetail(item.id);
      setSelectedItem((prev) => ({ ...prev, ...detail }));
    } catch (err) {
      // If detail fails, keep basic info
      console.warn('No se pudo cargar el detalle de la imagen:', err);
    }
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedItem(null);
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleString('es-ES', {
        year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return '';
    }
  }, []);

  const handleDownload = useCallback(async (item) => {
    try {
      setDownloadLoading(true);
      const res = await downloadProcessingResult(item.id);
      const url = res.download_url || res.url || item.s3_url || item.signed_url;
      if (url) {
        window.open(url, '_blank');
      } else {
        alert('No se pudo obtener el enlace de descarga.');
      }
    } catch (err) {
      console.error('Error al descargar:', err);
      alert('No se pudo descargar la imagen.');
    } finally {
      setDownloadLoading(false);
    }
  }, []);

  const handleToggleVisibility = useCallback(async (item) => {
    try {
      if (!authenticated) {
        alert('Debes iniciar sesión para cambiar la visibilidad.');
        return;
      }
      if (!item?.is_owner) {
        alert('Solo el propietario puede cambiar la visibilidad.');
        return;
      }
      setVisibilityLoading(true);
      const res = await toggleProcessingResultVisibility(item.id);
      const newPublic = !!res.is_public;
      // Update selected item and list item
      setSelectedItem((prev) => prev && prev.id === item.id ? { ...prev, is_public: newPublic } : prev);
      setItems((prev) => prev.map((it) => (
        it.id === item.id ? { ...it, is_public: newPublic } : it
      )));
    } catch (err) {
      console.error('Error al cambiar visibilidad:', err);
      alert(err?.message || 'No se pudo cambiar la visibilidad.');
    } finally {
      setVisibilityLoading(false);
    }
  }, [authenticated]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Top imágenes</h1>
        <p className={styles.subtitle}>Resultados públicos con más me gusta</p>
      </header>

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      <section className={styles.masonry}>
        {items.map((item) => (
          <article key={item.id} className={styles.card} onClick={() => openModal(item)}>
            <div className={styles.imageWrap}>
              <button
                className={`${styles.likeButton} ${item.user_has_liked ? styles.liked : ''}`}
                disabled={likeLoadingId === item.id}
                onClick={(e) => { e.stopPropagation(); handleToggleLike(item); }}
                aria-label={item.user_has_liked ? 'Quitar me gusta' : 'Dar me gusta'}
                title={item.user_has_liked ? 'Quitar me gusta' : 'Dar me gusta'}
              >
                <svg className={styles.likeIcon} viewBox="0 0 24 24" fill={item.user_has_liked ? '#dc2626' : 'none'} stroke="#dc2626" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span className={styles.likeCount}>{item.like_count || 0}</span>
              </button>
              <img
                src={item.s3_url || item.signed_url}
                alt={item.job_prompt ? `Imagen generada: ${item.job_prompt}` : 'Imagen generada'}
                loading="lazy"
                className={styles.image}
              />
            </div>
          </article>
        ))}
      </section>

      {isModalOpen && selectedItem && (
        <div className={styles.modalBackdrop} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>Detalle de imagen</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  className={`${styles.likeButton} ${selectedItem.user_has_liked ? styles.liked : ''}`}
                  disabled={likeLoadingId === selectedItem.id}
                  onClick={() => handleToggleLike(selectedItem)}
                  aria-label={selectedItem.user_has_liked ? 'Quitar me gusta' : 'Dar me gusta'}
                >
                  <svg className={styles.likeIcon} viewBox="0 0 24 24" fill={selectedItem.user_has_liked ? '#dc2626' : 'none'} stroke="#dc2626" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span className={styles.likeCount}>{selectedItem.like_count || 0}</span>
                </button>
                <button className={styles.modalClose} onClick={closeModal} aria-label="Cerrar">✕</button>
              </div>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalImageWrap}>
                <img
                  src={selectedItem.s3_url || selectedItem.signed_url}
                  alt={selectedItem.job_prompt ? `Imagen generada: ${selectedItem.job_prompt}` : 'Imagen generada'}
                  className={styles.modalImage}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <div className={styles.metaLeft}>
                <span className={`${styles.badge} ${selectedItem.is_public ? styles.badgePublic : styles.badgePrivate}`}>
                  {selectedItem.is_public ? 'Pública' : 'Privada'}
                </span>
                {selectedItem.created_at && (
                  <span className={styles.dateText}>{formatDate(selectedItem.created_at)}</span>
                )}
              </div>
              <div className={styles.metaRight}>
                <button
                  className={styles.actionButton}
                  onClick={() => handleDownload(selectedItem)}
                  disabled={downloadLoading}
                >
                  {downloadLoading ? 'Descargando…' : 'Descargar'}
                </button>
                {selectedItem.is_owner && (
                  <button
                    className={styles.actionButton}
                    onClick={() => handleToggleVisibility(selectedItem)}
                    disabled={visibilityLoading}
                    title={selectedItem.is_public ? 'Hacer privada' : 'Hacer pública'}
                  >
                    {visibilityLoading ? 'Guardando…' : (selectedItem.is_public ? 'Hacer privada' : 'Hacer pública')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loader and sentinel */}
      <div className={styles.loaderWrap}>
        {loading && (
          <div className={styles.loader} aria-label="Cargando…" />
        )}
      </div>
      <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />

      {!loading && !hasMore && items.length === 0 && (
        <div className={styles.empty}>No hay imágenes públicas aún.</div>
      )}
    </div>
  );
}

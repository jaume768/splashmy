import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from '../../../styles/ImagesView.module.css';
import { getPublicProcessingResults } from '../../../utils/api';

export default function ImagesView() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [nextPage, setNextPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);
  const PAGE_SIZE = 30;

  const loadPage = useCallback(async (nextPage) => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getPublicProcessingResults(nextPage, PAGE_SIZE);
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
      console.error('Error loading public images:', err);
      // Gracefully handle out-of-range page requests
      const is404 = err?.status === 404 || (typeof err?.message === 'string' && err.message.includes('"status":404'));
      const invalidPage = is404 && (err?.response?.errors?.detail === 'Invalid page.' || (typeof err?.message === 'string' && err.message.includes('Invalid page')));
      if (invalidPage) {
        setHasMore(false);
        setNextPage(null);
      } else {
        setError('No se pudieron cargar las imágenes.');
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

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Imágenes públicas</h1>
        <p className={styles.subtitle}>Resultados generados más recientes</p>
      </header>

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      <section className={styles.masonry}>
        {items.map((item) => (
          <article key={item.id} className={styles.card}>
            <div className={styles.imageWrap}>
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

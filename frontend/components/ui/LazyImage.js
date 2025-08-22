import React, { useState, useRef, useEffect } from 'react';
import styles from './LazyImage.module.css';

const LazyImage = ({ 
  src, 
  alt = '', 
  className = '', 
  onClick = null,
  style = {},
  isModal = false,
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoaded(false);
    setHasError(true);
  };

  // Additional check after image ref is set
  const checkImageStatus = () => {
    if (imgRef.current && src && !isLoaded && !hasError) {
      const img = imgRef.current;
      if (img.complete && img.naturalWidth > 0) {
        setIsLoaded(true);
        setHasError(false);
      }
    }
  };

  const handleClick = (e) => {
    if (onClick && isLoaded) {
      onClick(e);
    }
  };

  // Reset states when src changes and check if image is already cached
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    
    // Check if image is already loaded in cache
    if (imgRef.current && src) {
      const img = imgRef.current;
      
      // If image is already complete (cached), set loaded immediately
      if (img.complete && img.naturalWidth > 0) {
        setIsLoaded(true);
        setHasError(false);
      }
    }
  }, [src]);

  if (isModal) {
    // For modals, use simpler layout without absolute positioning
    return (
      <div 
        className={`${styles.lazyImageContainer} ${className}`} 
        style={style}
        onClick={handleClick}
        {...props}
      >
        {/* Shimmer placeholder for modal */}
        {!isLoaded && !hasError && (
          <div className={styles.shimmerPlaceholder}>
            <div className={styles.shimmerWave}></div>
          </div>
        )}
        
        {/* Error placeholder for modal */}
        {hasError && (
          <div className={styles.errorPlaceholder}>
            <div className={styles.errorIcon}>⚠️</div>
            <div className={styles.errorText}>No se pudo cargar la imagen</div>
          </div>
        )}
        
        {/* Actual image for modal */}
        {src && (
          <img
            ref={(el) => {
              imgRef.current = el;
              if (el) {
                setTimeout(checkImageStatus, 0);
              }
            }}
            src={src}
            alt={alt}
            loading="lazy"
            onLoad={handleLoad}
            onError={handleError}
            className={`${styles.imageModal} ${isLoaded ? styles.loaded : styles.loading}`}
          />
        )}
      </div>
    );
  }

  return (
    <div 
      className={`${styles.lazyImageContainer} ${className}`} 
      style={style}
      onClick={handleClick}
      {...props}
    >
      {/* Shimmer placeholder */}
      {!isLoaded && !hasError && (
        <div className={styles.shimmerPlaceholder}>
          <div className={styles.shimmerWave}></div>
        </div>
      )}
      
      {/* Error placeholder */}
      {hasError && (
        <div className={styles.errorPlaceholder}>
          <div className={styles.errorIcon}>⚠️</div>
          <div className={styles.errorText}>No se pudo cargar la imagen</div>
        </div>
      )}
      
      {/* Actual image */}
      {src && (
        <img
          ref={(el) => {
            imgRef.current = el;
            if (el) {
              setTimeout(checkImageStatus, 0);
            }
          }}
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
          className={`${styles.image} ${isLoaded ? styles.loaded : styles.loading}`}
        />
      )}
    </div>
  );
};

export default LazyImage;

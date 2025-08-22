import React, { useState, useRef, useEffect } from 'react';
import { getAuthToken, getApiBaseUrl } from '../../utils/api';
import styles from './LazyImage.module.css';

const LazyAuthenticatedImage = ({ 
  src, 
  alt = '', 
  className = '', 
  onClick = null,
  style = {},
  isPrivate = false,
  fallbackSrc = null,
  isModal = false,
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [authenticatedSrc, setAuthenticatedSrc] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const imgRef = useRef(null);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoaded(false);
    setHasError(true);
  };

  const handleClick = (e) => {
    if (onClick && isLoaded) {
      onClick(e);
    }
  };

  // Check if image is already cached
  const checkImageStatus = () => {
    if (imgRef.current && authenticatedSrc && !isLoaded && !hasError) {
      const img = imgRef.current;
      if (img.complete && img.naturalWidth > 0) {
        setIsLoaded(true);
        setHasError(false);
      }
    }
  };

  // Fetch authenticated image for private images
  const fetchAuthenticatedImage = async (imageSrc) => {
    try {
      setIsLoadingAuth(true);
      setHasError(false);
      
      const token = getAuthToken();
      if (!token) {
        setHasError(true);
        return;
      }

      // Convert s3_url to authenticated proxy URL
      let imageUrl = imageSrc;
      if (imageSrc.includes('/media/processed/') || imageSrc.includes('/media/images/')) {
        const mediaIndex = imageSrc.indexOf('/media/');
        if (mediaIndex !== -1) {
          const mediaPath = imageSrc.substring(mediaIndex + 7);
          imageUrl = `${getApiBaseUrl()}/api/v1/media/${mediaPath}`;
        }
      }

      const response = await fetch(imageUrl, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const objectURL = URL.createObjectURL(blob);
      setAuthenticatedSrc(objectURL);
    } catch (err) {
      console.error('Error fetching authenticated image:', err);
      setHasError(true);
      if (fallbackSrc) {
        setAuthenticatedSrc(fallbackSrc);
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Handle src changes and authentication
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setAuthenticatedSrc(null);
    
    if (!src) return;

    if (!isPrivate) {
      // For public images, use src directly
      setAuthenticatedSrc(src);
      // Check if already cached
      if (imgRef.current) {
        const img = imgRef.current;
        if (img.complete && img.naturalWidth > 0) {
          setIsLoaded(true);
          setHasError(false);
        }
      }
    } else {
      // For private images, fetch authenticated version
      fetchAuthenticatedImage(src);
    }

    // Cleanup blob URL on unmount
    return () => {
      if (authenticatedSrc && authenticatedSrc.startsWith('blob:')) {
        URL.revokeObjectURL(authenticatedSrc);
      }
    };
  }, [src, isPrivate, fallbackSrc]);

  // Show shimmer while loading authentication or image
  const showShimmer = !isLoaded && !hasError && (!authenticatedSrc || isLoadingAuth);

  return (
    <div 
      className={`${styles.lazyImageContainer} ${className}`} 
      style={style}
      onClick={handleClick}
      {...props}
    >
      {/* Shimmer placeholder */}
      {showShimmer && (
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
      {authenticatedSrc && (
        <img
          ref={(el) => {
            imgRef.current = el;
            if (el) {
              setTimeout(checkImageStatus, 0);
            }
          }}
          src={authenticatedSrc}
          alt={alt}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
          className={`${isModal ? styles.imageModal : styles.image} ${isLoaded ? styles.loaded : styles.loading}`}
        />
      )}
    </div>
  );
};

export default LazyAuthenticatedImage;

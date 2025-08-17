import React from 'react';
import styles from './ImageShimmer.module.css';

const ImageShimmer = ({ count = 12, type = 'gallery' }) => {
  const placeholders = Array.from({ length: count }, (_, index) => (
    <div key={index} className={`${styles.shimmerCard} ${styles[type]}`}>
      <div className={styles.shimmerImage}>
        <div className={styles.shimmerWave}></div>
      </div>
      {type === 'gallery' && (
        <div className={styles.shimmerMeta}>
          <div className={styles.shimmerLine} style={{ width: '60%' }}></div>
          <div className={styles.shimmerLine} style={{ width: '40%' }}></div>
        </div>
      )}
    </div>
  ));

  return (
    <div className={`${styles.shimmerGrid} ${styles[`${type}Grid`]}`}>
      {placeholders}
    </div>
  );
};

export default ImageShimmer;

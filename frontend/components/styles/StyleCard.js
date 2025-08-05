import Image from 'next/image';
import styles from './StyleCard.module.css';

const StyleCard = ({ style }) => {
  const {
    id,
    name,
    description,
    category_name,
    category_color,
    preview_image,
    thumbnail,
    is_premium,
    average_rating
  } = style;

  // Use thumbnail if available, fallback to preview_image
  const imageUrl = thumbnail || preview_image;

  return (
    <div className={styles.card}>
      <div className={styles.imageContainer}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className={styles.image}
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            priority={false}
          />
        ) : (
          <div className={styles.placeholderImage}>
            <span className={styles.placeholderText}>No Image</span>
          </div>
        )}
        
        {/* Premium badge */}
        {is_premium && (
          <div className={styles.premiumBadge}>
            <span>Premium</span>
          </div>
        )}

        {/* Category badge */}
        <div 
          className={styles.categoryBadge}
          style={{ backgroundColor: category_color }}
        >
          <span>{category_name}</span>
        </div>
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>{name}</h3>
        {description && (
          <p className={styles.description}>{description}</p>
        )}
        
        {/* Rating */}
        {average_rating > 0 && (
          <div className={styles.rating}>
            <span className={styles.stars}>
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className={`${styles.star} ${
                    i < Math.round(average_rating) ? styles.filled : ''
                  }`}
                >
                  ★
                </span>
              ))}
            </span>
            <span className={styles.ratingValue}>
              {average_rating.toFixed(1)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StyleCard;

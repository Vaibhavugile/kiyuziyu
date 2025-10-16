import React from "react";
import "./CollectionCard.css";

/**
 * CollectionCard
 * - image visible by default
 * - Explore button always visible
 * - hover/focus triggers slide-up info panel and glow animations
 */
const CollectionCard = ({ id, title, description, image, alt, startingPrice, onClick }) => {
  return (
    <article
      className="collection-card"
      role="group"
      aria-labelledby={id ? `collection-title-${id}` : undefined}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && onClick) onClick(e);
      }}
    >
      <div className="collection-card-media" aria-hidden="false">
        {image ? (
          <img
            src={image}
            alt={alt || title}
            className="collection-image"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="collection-image--placeholder" />
        )}

        {/* subtle shimmer layer */}
        <div className="image-shimmer" aria-hidden="true" />
      </div>

      {/* Explore button (always visible). Keep native button for accessibility */}
      <div className="collection-hover-button">
        <button
          type="button"
          className="btn-explore"
          aria-haspopup="true"
          aria-label={`Explore ${title}`}
        >
          <span className="explore-text">Explore</span>
          <span className="arrow" aria-hidden="true">›</span>

          {/* glow element under the button */}
          <span className="btn-glow" aria-hidden="true" />
        </button>
      </div>

      {/* Hover / focus info panel (appears on hover or keyboard focus) */}
      <div className="hover-info" aria-hidden="true">
        <h3 id={id ? `collection-title-${id}` : undefined} className="hover-title">
          {title}
        </h3>
        {description && <p className="hover-desc">{description}</p>}
        {startingPrice && <div className="hover-price">From ₹{startingPrice}</div>}
      </div>
    </article>
  );
};

export default CollectionCard;

import React from 'react';
import './CollectionCard.css'; // <-- Import the new CSS file

const CollectionCard = ({ title, description, image, tieredPricing, children }) => {
  // Find the lowest retail price
  const getStartingPrice = (tiers) => {
    if (!tiers || tiers.length === 0) return null;
    const sortedTiers = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);
    return sortedTiers[0]?.price;
  };

  const startingPrice = getStartingPrice(tieredPricing?.retail);

  return (
    <div className="collection-card">
      <div className="collection-image-container">
        <img src={image} alt={title} className="collection-image" />
      </div>
      <div className="collection-info">
        <div className="title">{title}</div>
        {description && <p className="description">{description}</p>}
        {startingPrice && <p className="price">Starting from: ₹{startingPrice}</p>}
      </div>
      {children}
    </div>
  );
};

export default CollectionCard;
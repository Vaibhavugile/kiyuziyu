import React, { useState, useEffect } from 'react';
import './ProductCard.css';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';

const ProductCard = ({ product, cartQuantity, onIncrement, onDecrement, onEdit, onDelete, isCart = false }) => {
  const { productName, productCode, quantity, images, tieredPricing } = product;
  const isOutOfStock = quantity === 0;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Determine the correct image source to use
  const imagesToDisplay = images && images.length > 0 ? images : (product.image ? [product.image] : []);

  // Auto-scroll the image carousel
  useEffect(() => {
    if (imagesToDisplay.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex(prevIndex => (prevIndex + 1) % imagesToDisplay.length);
      }, 2000); // Change image every 5 seconds
      return () => clearInterval(interval);
    }
  }, [imagesToDisplay]);

  // Handle manual navigation for the carousel
  const handlePrevImage = (e) => {
    e.stopPropagation(); // Prevent clicks from bubbling up
    setCurrentImageIndex(prevIndex => (prevIndex - 1 + imagesToDisplay.length) % imagesToDisplay.length);
  };

  const handleNextImage = (e) => {
    e.stopPropagation(); // Prevent clicks from bubbling up
    setCurrentImageIndex(prevIndex => (prevIndex + 1) % imagesToDisplay.length);
  };

  const renderActions = () => {
    if (isCart) {
      return (
        <div className="cart-actions">
          {cartQuantity > 0 ? (
            <div className="quantity-controls">
              <button onClick={onDecrement} className="quantity-btn">-</button>
              <span className="cart-quantity">{cartQuantity}</span>
              <button onClick={onIncrement} className="quantity-btn">+</button>
            </div>
          ) : (
            <button onClick={onIncrement} className="add-to-cart-btn" disabled={isOutOfStock}>
              {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </button>
          )}
        </div>
      );
    } else {
      // Admin actions
      return (
        <div className="admin-actions">
          <button onClick={onEdit}>Edit</button>
          <button onClick={onDelete}>Delete</button>
        </div>
      );
    }
  };

  return (
    <div className={`product-card ${isOutOfStock ? 'out-of-stock' : ''}`}>
      {isOutOfStock && <div className="out-of-stock-overlay">Out of Stock</div>}
      <div className="product-image-container">
        {imagesToDisplay.length > 1 && (
          <button onClick={handlePrevImage} className="carousel-btn prev">&#10094;</button>
        )}
        <Zoom>
          <img
            alt={productName}
            src={imagesToDisplay[currentImageIndex]}
            className="product-image"
          />
        </Zoom>
        {imagesToDisplay.length > 1 && (
          <button onClick={handleNextImage} className="carousel-btn next">&#10095;</button>
        )}
      </div>

      <div className="product-info">
        <h4 className="product-title">{productName}</h4>
        <p className="product-code">{productCode}</p>
        <p className="product-quantity">In Stock: {quantity}</p>

        {tieredPricing && (
          <div className="tiered-pricing-container">
            {tieredPricing.map((tier, index) => {
              const quantityDisplay = tier.min_quantity === tier.max_quantity
                ? `Buy 1`
                : `Buy ${tier.min_quantity}+`;

              const priceDisplay = tier.min_quantity === tier.max_quantity
                ? `₹${tier.price}`
                : `₹${tier.price} each`;

              return (
                <span key={index} className="pricing-badge">
                  {quantityDisplay} @<span className="pricing-price">{priceDisplay}</span>
                </span>
              );
            })}
          </div>
        )}

        {renderActions()}
      </div>
    </div>
  );
};

export default ProductCard;
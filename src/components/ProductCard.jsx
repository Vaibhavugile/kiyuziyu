import React, { useState, useEffect } from 'react';
import './ProductCard.css';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';

const ProductCard = ({ product, cartQuantity, onIncrement, onDecrement, onEdit, onDelete, isCart = false }) => {
  // Destructure both 'variations' (for new products) and 'quantity' (for old products)
  const { productName, productCode, image, variations, quantity, tieredPricing } = product;
  
  // State for image carousel
  // This line was missing from your last provided code block.
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // State to manage the selected variation
  const [selectedVariation, setSelectedVariation] = useState(null);

  // Use the new 'images' array if it exists, otherwise fall back to the single 'image'
  // We also ensure we have a consistent object structure with a 'url' key for both old and new data.
  const imagesToDisplay = product.images && product.images.length > 0
    ? product.images
    : (product.image ? [{ url: product.image }] : []);

  // Auto-scroll the image carousel
  useEffect(() => {
    if (imagesToDisplay.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex(prevIndex => (prevIndex + 1) % imagesToDisplay.length);
      }, 2000); 
      return () => clearInterval(interval);
    }
  }, [imagesToDisplay]);

  // Handle manual navigation for the carousel
  const handlePrevImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex(prevIndex => (prevIndex - 1 + imagesToDisplay.length) % imagesToDisplay.length);
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex(prevIndex => (prevIndex + 1) % imagesToDisplay.length);
  };

  useEffect(() => {
    // Set the default selected variation to the first one available
    if (variations && variations.length > 0) {
      setSelectedVariation(variations[0]);
    }
  }, [variations]);

  // Calculate total quantity by summing quantities of all variations or use the single quantity field
  const totalQuantity = variations ? variations.reduce((sum, v) => sum + Number(v.quantity), 0) : Number(quantity || 0);

  // Determine the quantity to display: either the selected variation's quantity or the total quantity
  const quantityToDisplay = selectedVariation ? Number(selectedVariation.quantity) : totalQuantity;

  // Logic to handle out-of-stock for the entire product
  const isOutOfStock = totalQuantity === 0;

  // Logic to handle out-of-stock for a specific variation
  const isVariationOutOfStock = selectedVariation?.quantity === 0;

  // Use a unique identifier for the product/variation combo
  const getProductIdentifier = (variant) => {
    if (variant && variant.color && variant.size) {
      return `${product.id}_${variant.color.replace(/\s+/g, '-')}_${variant.size.replace(/\s+/g, '-')}`;
    }
    return product.id;
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
            <button
              onClick={onIncrement}
              className={`add-to-cart-btn ${isOutOfStock ? 'disabled' : ''}`}
              disabled={isOutOfStock}
            >
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
            src={imagesToDisplay[currentImageIndex]?.url}
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

        {/* Display the quantity from the selected variation or the total product quantity */}
        <p className="product-quantity">In Stock: {quantityToDisplay}</p>
        
        {/* Show variation selector only if there is at least one variation */}
        {variations && variations.length > 0 && (
          <div className="variations-selector">
            {variations.map((v, index) => (
              <button
                key={index}
                className={`variation-btn ${selectedVariation?.color === v.color && selectedVariation?.size === v.size ? 'selected' : ''}`}
                onClick={() => setSelectedVariation(v)}
                title={`Color: ${v.color}, Size: ${v.size}`}
              >
                {v.color} {v.size}
              </button>
            ))}
          </div>
        )}

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
      </div>
      <div className="product-actions">
        {renderActions()}
      </div>
    </div>
  );
};

export default ProductCard;
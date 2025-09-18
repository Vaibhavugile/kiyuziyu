import React, { useState, useEffect } from 'react';
import './ProductCard.css';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';

const ProductCard = ({ product, cartQuantity, onIncrement, onDecrement, onEdit, onDelete, isCart = false }) => {
  // Destructure both 'variations' (for new products) and 'quantity' (for old products)
  const { productName, productCode, image, variations, quantity, tieredPricing } = product;

  // State for image carousel
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Use the new 'images' array if it exists, otherwise fall back to the single 'image'
  const imagesToDisplay = product.images && product.images.length > 0 ? product.images : (product.image ? [{ url: product.image }] : []);

  // Auto-scroll the image carousel
  useEffect(() => {
    if (imagesToDisplay.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex(prevIndex => (prevIndex + 1) % imagesToDisplay.length);
      }, 5000);
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

  // State to manage the selected variation
  const [selectedVariation, setSelectedVariation] = useState(null);

  useEffect(() => {
    if (variations && variations.length > 0) {
      setSelectedVariation(variations[0]);
    }
  }, [variations]);

  // Use this new logic to calculate the total quantity.
  // It checks for the 'variations' array first, otherwise it uses the old 'quantity' field.
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

  // Render the actions (add/remove from cart buttons)
  const renderActions = () => {
    if (isCart) {
      return (
        <div className="cart-actions">
          <button onClick={onDecrement} className="quantity-btn">-</button>
          <span className="cart-quantity">{cartQuantity}</span>
          <button onClick={onIncrement} className="quantity-btn">+</button>
        </div>
      );
    }

    const currentQuantityInCart = cartQuantity || 0;
    
    // Pass the selected variation to the cart functions
    const incrementAction = () => onIncrement({ ...product, variation: selectedVariation });
    const decrementAction = () => onDecrement(getProductIdentifier(selectedVariation));
    
    return (
      <div className="product-actions">
        {currentQuantityInCart === 0 ? (
          <button
            onClick={incrementAction}
            className={`add-to-cart-btn ${isVariationOutOfStock ? 'disabled' : ''}`}
            disabled={isVariationOutOfStock}
          >
            {isVariationOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
        ) : (
          <div className="quantity-controls">
            <button onClick={decrementAction} className="quantity-btn">-</button>
            <span className="cart-quantity-display">{currentQuantityInCart}</span>
            <button
              onClick={incrementAction}
              className={`quantity-btn ${isVariationOutOfStock ? 'disabled' : ''}`}
              disabled={isVariationOutOfStock}
            >
              +
            </button>
          </div>
        )}
        {onEdit && onDelete && (
          <div className="admin-actions">
            <button onClick={onEdit}>Edit</button>
            <button onClick={onDelete}>Delete</button>
          </div>
        )}
      </div>
    );
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

        {/* Display the quantity from the selected variation or the total product quantity if no variations */}
        <p className="product-quantity">In Stock: {quantityToDisplay}</p>
        
        {/* Corrected: Show variation selector if there is more than one variation */}
        {variations && variations.length > 1 && (
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
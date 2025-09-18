import React, { useState, useEffect } from 'react';
import './ProductCard.css';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';
import { getCartItemId } from './CartContext';


const ProductCard = ({ product, cartQuantity, onIncrement, onDecrement, onEdit, onDelete, isCart = false }) => {
  const { productName, productCode, image, variations, quantity, tieredPricing } = product;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imagesToDisplay = product.images && product.images.length > 0 ? product.images : (product.image ? [{ url: product.image }] : []);
  useEffect(() => {
    if (imagesToDisplay.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex(prevIndex => (prevIndex + 1) % imagesToDisplay.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [imagesToDisplay]);
  const handlePrevImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex(prevIndex => (prevIndex - 1 + imagesToDisplay.length) % imagesToDisplay.length);
  };
  const handleNextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex(prevIndex => (prevIndex + 1) % imagesToDisplay.length);
  };
  const [selectedVariation, setSelectedVariation] = useState(null);
  useEffect(() => {
    if (variations && variations.length > 0) {
      setSelectedVariation(variations[0]);
    }
  }, [variations]);
  const totalQuantity = variations ? variations.reduce((sum, v) => sum + Number(v.quantity), 0) : Number(quantity || 0);
  const quantityToDisplay = selectedVariation ? Number(selectedVariation.quantity) : totalQuantity;
  const isOutOfStock = totalQuantity === 0;
  const isVariationOutOfStock = selectedVariation?.quantity === 0;
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
    const productDataWithVariation = { ...product, variation: selectedVariation };
    const incrementAction = () => onIncrement(productDataWithVariation);
    const decrementAction = () => onDecrement(getCartItemId(productDataWithVariation));
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
        <p className="product-quantity">In Stock: {quantityToDisplay}</p>
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
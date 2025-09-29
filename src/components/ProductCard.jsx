import React, { useState, useEffect } from 'react';
import './ProductCard.css';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';
import { getCartItemId } from './CartContext';


const ProductCard = ({ product, onIncrement, onDecrement, onEdit, onDelete, isCart = false, cart, tieredPricing }) => {
  // Now destructure tieredPricing from the product object as a fallback
  const { productName, productCode, image, variations, quantity, tieredPricing: productTieredPricing } = product;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imagesToDisplay = product.images && product.images.length > 0 ? product.images : (product.image ? [{ url: product.image }] : []);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [cartQuantity, setCartQuantity] = useState(0);
  
  // NEW STATE: Manages the visibility of the tiered pricing list
  const [showTiers, setShowTiers] = useState(false); 

  // Use the tieredPricing prop if it exists, otherwise fall back to the one on the product object
  const pricingData = tieredPricing || productTieredPricing;
  
  // Set the default variation on component mount
  useEffect(() => {
    if (variations && variations.length > 0) {
      setSelectedVariation(variations[0]);
    }
  }, [variations]);

  // Update cartQuantity whenever the selected variation or the cart changes
 useEffect(() => {
    // Only update cartQuantity if the cart prop is provided
    if (cart) {
      if (selectedVariation) {
        const productWithVariation = { ...product, variation: selectedVariation };
        const cartItemId = getCartItemId(productWithVariation);
        setCartQuantity(cart[cartItemId]?.quantity || 0);
      } else {
        const cartItemId = getCartItemId(product);
        setCartQuantity(cart[cartItemId]?.quantity || 0);
      }
    }
  }, [selectedVariation, cart, product]);
  
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
  
  // Sort the tiers by min_quantity
  const sortedTiers = pricingData ? [...pricingData].sort((a, b) => a.min_quantity - b.min_quantity) : null;
  
  let pricingOverlay = null;
  let tieredPricingButton = null;

  if (sortedTiers && sortedTiers.length > 1) {
    
    // Calculate max saving for the button text
    const basePrice = sortedTiers[0].price;
    const bestPrice = sortedTiers[sortedTiers.length - 1].price;
    let maxDiscountText = 'Show Bulk Pricing Details';
    if (basePrice > bestPrice) {
        // Calculate percentage saved, round to nearest whole number
        const percentageSaved = ((basePrice - bestPrice) / basePrice) * 100;
        const roundedPercentage = Math.round(percentageSaved);
        maxDiscountText = `Show Bulk Pricing (Save Up to ${roundedPercentage}%)`;
    }
    
    // 1. Define the button
    tieredPricingButton = (
        <button 
            className={`toggle-tiers-btn ${showTiers ? 'active' : ''}`}
            onClick={(e) => { 
                // Prevent accidental card navigation/selection
                e.stopPropagation(); 
                setShowTiers(!showTiers); 
            }}
        >
            <span>{showTiers ? 'Hide Bulk Pricing Details' : maxDiscountText}</span>
            <span className="dropdown-icon">{showTiers ? '▲' : '▼'}</span>
        </button>
    );

    // 2. Define the collapsible content (rendered only if showTiers is true)
    if (showTiers) {
        pricingOverlay = (
            <div className="tiered-pricing-container">
                <h4 className="pricing-overlay-title">Quantity Discounts</h4>
                {sortedTiers.map((tier, index) => (
                    <div key={index} className="pricing-tier-row">
                        <span className="tier-quantity">
                            {`Buy ${tier.min_quantity}${tier.max_quantity ? ` - ${tier.max_quantity}` : '+'}`}
                        </span>
                        <span className="tier-price-each">
                            @ ₹{tier.price} each
                        </span>
                    </div>
                ))}
            </div>
        );
    }
  }

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

        {/* Base Price Display */}
        <p className="product-price">Price: ₹{sortedTiers && sortedTiers.length > 0 ? sortedTiers[0].price : 'N/A'}</p>
        
        {/* Tiered Pricing Button and Collapsible Content */}
        {tieredPricingButton}
        {pricingOverlay}

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
      </div>

      <div className="product-actions">
        {renderActions()}
      </div>
    </div>
  );
};
export default ProductCard;
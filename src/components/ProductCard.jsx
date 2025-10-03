// src/components/ProductCard.jsx - UPDATED

import React, { useState, useEffect } from 'react';
import './ProductCard.css';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';
import { getCartItemId } from './CartContext';


// 🎯 CRITICAL FIX: Set a default value for the 'cart' prop to {}
// This prevents the 'Cannot read properties of undefined' error when ProductCard
// is used in the AdminPage where the cart prop is not supplied.
const ProductCard = ({ product, onIncrement, onDecrement, onEdit, onDelete, isCart = false, cart = {}, tieredPricing }) => {
  // CRITICAL FIX: Ensure 'id' is destructured here for stable use in useEffect dependencies
  const { productName, productCode, images, image, variations, quantity, tieredPricing: productTieredPricing, id } = product; 
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imagesToDisplay = images && images.length > 0 ? images : (image ? [{ url: image }] : []);
  const [selectedVariation, setSelectedVariation] = useState(null);
  // REMOVED: const [cartQuantity, setCartQuantity] = useState(0); - We calculate directly in renderActions
  const [showTiers, setShowTiers] = useState(false); 

  // Use the tieredPricing prop if it exists, otherwise fall back to the one on the product object
  const pricingData = tieredPricing || productTieredPricing;
  
  // Set the default variation on component mount
  useEffect(() => {
    if (variations && variations.length > 0) {
      setSelectedVariation(variations[0]);
    }
  }, [variations, id]);
  
  // Function to get the current quantity in cart for the selected item/variation
  const getCurrentCartQuantity = () => {
    // If cart is used in the cart page (isCart=true), the 'product' object IS the cart item.
    if (isCart) {
      return product.quantity || 0;
    }
    
    // If not in cart view, and no variation is selected (simple product)
    if (!selectedVariation && !variations) {
      const cartItemId = getCartItemId(product);
      return cart[cartItemId]?.quantity || 0;
    }
    
    // If variations exist and one is selected (or defaulted)
    if (selectedVariation) {
      // Create a temporary object with the selected variation to generate the unique ID
      const productDataWithVariation = { ...product, variation: selectedVariation };
      const cartItemId = getCartItemId(productDataWithVariation);
      return cart[cartItemId]?.quantity || 0;
    }

    // Default case (shouldn't happen often)
    return 0;
  };
  
  const quantityInCart = getCurrentCartQuantity();
  
  // Logic to determine if the add/quantity button should be disabled
  const isAddDisabled = () => {
    let stockLimit = 0;
    if (variations && selectedVariation) {
      stockLimit = Number(selectedVariation.quantity);
    } else if (quantity) {
      stockLimit = Number(quantity);
    } else {
      // If stock is not specified, assume infinite or don't disable
      return false;
    }
    
    // Disable if the current cart quantity matches or exceeds the stock limit
    return quantityInCart >= stockLimit;
  };
  
  // Logic for display quantity
  const quantityToDisplay = (variations && selectedVariation) ? selectedVariation.quantity : quantity;


  // --- Action Buttons and Logic ---
  const renderActions = () => {
    // 1. Admin Actions (High Priority)
    if (onEdit || onDelete) {
      return (
        <div className="admin-actions">
          {onEdit && <button onClick={onEdit} className="edit-btn">Edit</button>}
          {onDelete && <button onClick={onDelete} className="delete-btn">Delete</button>}
        </div>
      );
    }

    // 2. Cart Page Actions (isCart = true)
    if (isCart) {
      // The product object passed here *already contains* the cart quantity.
      return (
        <div className="cart-actions">
          <button onClick={() => onDecrement(product.cartItemId)} className="quantity-btn">-</button>
          <span className="cart-quantity-display">{product.quantity}</span> 
          <button onClick={() => onIncrement(product.cartItemId)} className="quantity-btn" disabled={isAddDisabled()}>+</button>
        </div>
      );
    }
    
    // 3. Product Page Actions (Standard Shopping View)
    // The functions (onIncrement/onDecrement) are actually handlers passed from ProductsPage.jsx
    if (quantityInCart > 0) {
      // Show quantity controls if item is already in cart
      const productDataForCart = { ...product, variation: selectedVariation };
      const cartItemId = getCartItemId(productDataForCart);
      
      return (
        <div className="quantity-controls-container">
          <button onClick={() => onDecrement(cartItemId)} className="quantity-btn">-</button>
          <span className="cart-quantity-display">{quantityInCart}</span>
          <button 
            onClick={() => onIncrement(product, selectedVariation)} 
            className="quantity-btn" 
            disabled={isAddDisabled()}
          >
            +
          </button>
        </div>
      );
    }
    
    // Show 'Add to Cart' button if item is not in cart
    // The variation must be selected if variations exist
    const isVariationMissing = variations && !selectedVariation;
    
    return (
      <button 
        onClick={() => onIncrement(product, selectedVariation)} 
        className="add-to-cart-btn"
        disabled={isAddDisabled() || isVariationMissing}
        title={isVariationMissing ? "Please select a variation" : (isAddDisabled() ? "Out of Stock" : "Add to Cart")}
      >
        {isAddDisabled() ? 'Out of Stock' : (isVariationMissing ? 'Select Option' : 'Add to Cart')}
      </button>
    );
  };
  
  // --- Image Navigation ---
  const showPrev = () => setCurrentImageIndex(i => (i - 1 + imagesToDisplay.length) % imagesToDisplay.length);
  const showNext = () => setCurrentImageIndex(i => (i + 1) % imagesToDisplay.length);
  
  // --- Price Display Logic ---
  const currentPrice = isCart ? product.price : (pricingData?.currentPrice || '---'); 
  const nextTierInfo = isCart ? (pricingData?.nextTierInfo || null) : (pricingData?.nextTierInfo || null);
  const tieredPrices = isCart ? pricingData?.tieredPrices : (pricingData?.tieredPrices || null);


  return (
    <div className="product-card">
      <div className="product-image-container">
        {/* Navigation Arrows */}
        {imagesToDisplay.length > 1 && (
          <>
            <button className="prev-btn" onClick={showPrev}>&lt;</button>
            <button className="next-btn" onClick={showNext}>&gt;</button>
          </>
        )}
        
        {/* Main Image with Zoom */}
        {imagesToDisplay.length > 0 ? (
          <Zoom wrapStyle={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <img 
              src={imagesToDisplay[currentImageIndex].url} 
              alt={productName} 
              className="product-image" 
            />
          </Zoom>
        ) : (
          <div className="no-image-placeholder">No Image</div>
        )}

      </div>

      <div className="product-details">
        {/* Product Info */}
        <h3 className="product-name">{productName}</h3>
        <p className="product-code">Code: {productCode}</p>
        
        {/* Price and Tiering Toggle */}
        <div className="price-and-tiers">
          <p className="product-price">₹{currentPrice}</p>
          
          {/* Tiers Toggle Button */}
          {tieredPrices && (
            <button className="tiers-toggle-btn" onClick={() => setShowTiers(s => !s)}>
              {showTiers ? 'Hide Tiers' : 'Show Tiers'}
            </button>
          )}
        </div>

        {/* Tiered Pricing List (Collapsible) */}
        {tieredPrices && (
          <div className={`tiers-list-container ${showTiers ? 'open' : ''}`}>
            {tieredPrices.map((tier, index) => (
              <div key={index} className="tier-item">
                <span>{tier.min_quantity} +</span>
                <span className="tier-price">₹{tier.price}</span>
              </div>
            ))}
          </div>
        )}

        {/* Next Tier Hint */}
        {nextTierInfo && (
          <p className="next-tier-hint">
            Buy {nextTierInfo.quantityNeeded} more to get to ₹{nextTierInfo.price}.
          </p>
        )}
        
        {/* Stock Info */}
        <p className="product-stock">In Stock: {quantityToDisplay}</p>
        
        {/* Variations Selector with inline cart quantity badge */}
        {variations && variations.length > 1 && (
          <div className="variations-selector">
            {variations.map((v, index) => {
              // Get the cart quantity for *this specific variation* button
              const tempProductWithVariation = { ...product, variation: v };
              const cartItemId = getCartItemId(tempProductWithVariation);
              const quantityInCart = cart[cartItemId]?.quantity || 0;

              return (
                <button
                  key={index}
                  className={`variation-btn 
                    ${selectedVariation?.color === v.color && selectedVariation?.size === v.size ? 'selected' : ''}
                    ${quantityInCart > 0 ? 'in-cart' : ''}
                  `}
                  onClick={() => setSelectedVariation(v)} // This sets the selection
                  title={`Color: ${v.color}, Size: ${v.size}`}
                >
                  {v.color} {v.size}
                  {/* Display the cart quantity as a small badge */}
                  {quantityInCart > 0 && <span className="variation-cart-qty">({quantityInCart})</span>}
                </button>
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
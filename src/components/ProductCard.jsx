import React from 'react';
import './ProductCard.css';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';

const ProductCard = ({ productName, productCode, quantity, price, image, cartQuantity, onIncrement, onDecrement, children, tieredPricing }) => {
  return (
    <div className="product-card">
      <div className="product-image-container">
        <Zoom>
          <img
            alt={productName}
            src={image}
            width="100%"
            className="product-image"
          />
        </Zoom>
      </div>

      <div className="product-info">
        <h4 className="product-title">{productName}</h4>
        <p className="product-code">Product Code: {productCode}</p>
        <p className="product-quantity">Quantity: {quantity}</p>

        {/* Updated Tiered Pricing Display with better UI/UX */}
        {tieredPricing && (
          <div className="tiered-pricing-container">
            {tieredPricing.map((tier, index) => {
              // Create a display string for the quantity range
              const quantityDisplay = tier.min_quantity === tier.max_quantity
                ? `Buy  Any ${tier.min_quantity}`
                : `Buy  Any ${tier.min_quantity}`;
              
              const priceDisplay = `₹${ tier.min_quantity * tier.price}`;

              return (
                <span key={index} className="pricing-badge">
                  {quantityDisplay}@{priceDisplay}
                </span>
              );
            })}
          </div>
        )}
        
        {/* Current Price Display */}
        {price !== null && <p className="product-price">Current Price: ₹{price}</p>}
        
        {cartQuantity !== undefined && (
          <div className="cart-actions">
            {cartQuantity > 0 ? (
              <div className="quantity-controls">
                <button onClick={onDecrement} className="quantity-btn">-</button>
                <span className="cart-quantity">{cartQuantity}</span>
                <button onClick={onIncrement} className="quantity-btn">+</button>
              </div>
            ) : (
              <button onClick={onIncrement} className="add-to-cart-btn">Add to Cart</button>
            )}
          </div>
        )}
      </div>
      {children}
    </div>
  );
};

export default ProductCard;
import React from 'react';
import './ProductCard.css';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';

const ProductCard = ({ productName, productCode, quantity, price, image, cartQuantity, onIncrement, onDecrement, tieredPricing }) => {
  const isOutOfStock = quantity === 0;

  return (
    <div className={`product-card ${isOutOfStock ? 'out-of-stock' : ''}`}>
      {isOutOfStock && <div className="out-of-stock-overlay">Out of Stock</div>}
      <div className="product-image-container">
        <Zoom>
          <img
            alt={productName}
            src={image}
            className="product-image"
          />
        </Zoom>
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
      </div>
    </div>
  );
};

export default ProductCard;
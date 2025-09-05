import React from 'react';
import './ProductCard.css';

const ProductCard = ({ productCode, quantity, price, image, cartQuantity, onIncrement, onDecrement, children }) => {
  return (
    <div className="product-card">
      <img src={image} alt={productCode} className="product-image" />
      <div className="product-info">
        <h4 className="product-title">{productCode}</h4>
        <p className="product-quantity">Quantity: {quantity}</p>
        {price !== null && <p className="product-price">₹{price}</p>}
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
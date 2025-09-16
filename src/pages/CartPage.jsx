import React from 'react';
import { useCart } from '../components/CartContext';
import { Link } from 'react-router-dom';
import './CheckoutPage.css';

const CartPage = () => {
  const { cart, addToCart, removeFromCart, getCartTotal } = useCart();
  const cartItems = Object.values(cart);

  return (
    <div className="cart-page-container">
      <h2 className="cart-title">Your Shopping Cart</h2>

      {cartItems.length === 0 ? (
        <p className="empty-cart-message">Your cart is empty.</p>
      ) : (
        <>
          <div className="cart-items-list">
            {cartItems.map((item) => (
              <div key={item.id} className="cart-item">
                <img
                  src={item.images && item.images.length > 0 ? item.images[0] : item.image}
                  alt={item.productName}
                  className="cart-item-image"
                />
                <div className="cart-item-info">
                  <h3 className="cart-item-name">{item.productName}</h3>
                  <p className="cart-item-code">Code: {item.productCode}</p>
                  <p className="cart-item-price">Price: ₹{item.price}</p>
                  <div className="cart-quantity-controls">
                    <button onClick={() => removeFromCart(item.id)}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => addToCart(item.id, item, item.maxQuantity)}>+</button>
                  </div>
                </div>
                <p className="cart-item-subtotal">
                  Subtotal: ₹{(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <h3>Order Summary</h3>
            <p className="cart-total">Total: <span>₹{getCartTotal().toFixed(2)}</span></p>
            <Link to="/checkout" className="checkout-btn">
              Proceed to Checkout
            </Link>
          </div>
        </>
      )}
    </div>
  );
};
 
export default CartPage;
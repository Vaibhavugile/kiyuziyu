import React from 'react';
import { useCart } from '../components/CartContext';
import './CartPage.css'; // You will create this CSS file

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
                <img src={item.image} alt={item.productCode} className="cart-item-image" />
                <div className="cart-item-info">
                  <h3 className="cart-item-code">{item.productCode}</h3>
                  <p className="cart-item-price">₹{item.price}</p>
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
            <div className="billing-section">
              <h4>Billing Information</h4>
              <form>
                <input type="text" placeholder="Full Name" required />
                <input type="email" placeholder="Email Address" required />
                <input type="text" placeholder="Phone Number" required />
                <textarea placeholder="Shipping Address" required></textarea>
                <button type="submit" className="checkout-btn">Proceed to Checkout</button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CartPage;
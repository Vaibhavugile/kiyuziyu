import React from 'react';
import { useCart } from './CartContext';
import { Link } from 'react-router-dom';
import './MiniCart.css'; // You will create this CSS file

const MiniCart = () => {
  const { cart, getCartTotal } = useCart();
  const cartItemsCount = Object.values(cart).reduce((total, item) => total + item.quantity, 0);

  if (cartItemsCount === 0) {
    return null;
  }

  return (
    <div className="mini-cart-container">
      <div className="mini-cart-summary">
        <h4>Cart Summary</h4>
        <p>Items in cart: {cartItemsCount}</p>
        <p>Total: ₹{getCartTotal().toFixed(2)}</p>
      </div>
      <Link to="/cart" className="view-cart-btn">
        View Cart
      </Link>
    </div>
  );
};

export default MiniCart;
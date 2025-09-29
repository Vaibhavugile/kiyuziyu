// CartPage.jsx

import React, { useCallback } from 'react'; 
import { useCart } from '../components/CartContext';
import './CartPage.css';
import { Link } from 'react-router-dom';

const CartPage = () => {
    const { cart, addToCart, removeFromCart, getCartTotal, clearCart } = useCart();
    // Logic remains unchanged
    const handleDecrement = useCallback((cartItemId) => {
        removeFromCart(cartItemId);
    }, [removeFromCart]); 

    // Logic remains unchanged
    const handleIncrement = useCallback((item) => {
        addToCart(item);
    }, [addToCart]); 

    return (
        <div className="cart-page-container">
            <h2 className="cart-title">Your Shopping Cart</h2>
            {Object.keys(cart).length === 0 ? (
                <p className="empty-cart-message">Your cart is empty.</p>
            ) : (
                // REQUIRED: This wrapper enables the modern two-column grid layout from CSS
                <div className="cart-main-content-wrapper"> 
                    <div className="cart-items-list">
                        {Object.keys(cart).map(cartItemId => {
                            const item = cart[cartItemId];
                            return (
                                <div key={cartItemId} className="cart-item">
                                    <img 
                                        src={item.images && item.images.length > 0 ? item.images[0].url : item.image}
                                        alt={item.productName} 
                                        className="cart-item-image" 
                                    />
                                    <div className="cart-item-info">
                                        <h4 className="cart-item-name">
                                            {item.productName}
                                            {item.variation && (
                                                <span> - {item.variation.color} {item.variation.size}</span>
                                            )}
                                        </h4>
                                        <p className="cart-item-code">Code: {item.productCode}</p>
                                        <p className="cart-item-price">Price: ₹{item.price}</p>
                                    </div>
                                    <div className="cart-quantity-controls">
                                        <button onClick={() => handleDecrement(cartItemId)}>-</button>
                                        <span>{item.quantity}</span>
                                        <button onClick={() => handleIncrement(item)}>+</button>
                                    </div>
                                    <div className="cart-item-subtotal">
                                        ₹{(item.price * item.quantity).toFixed(2)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    {/* Updated Summary Structure to utilize new CSS classes */}
                    <div className="cart-summary">
                        <h3>Order Summary</h3> 
                        <div className="cart-summary-line">
                            <p>Subtotal:</p>
                            <span>₹{getCartTotal().toFixed(2)}</span>
                        </div>
                        
                        <div className="cart-total final-total">
                            <p>Total:</p>
                            <span>₹{getCartTotal().toFixed(2)}</span>
                        </div>
                        <div className="cart-actions-buttons">
                            <Link to="/checkout" className="checkout-btn">Proceed to Checkout</Link>
                            <button onClick={clearCart} className="clear-cart-btn">Clear Cart</button>
                        </div>
                        <p className="trust-message">🔒 Secure Checkout</p>
                    </div>
                </div>
            )}
        </div>
    );
};
export default CartPage;
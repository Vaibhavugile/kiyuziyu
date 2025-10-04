import React, { useState } from 'react';
import { useCart } from '../components/CartContext';
import { useAuth } from '../components/AuthContext';
import { useNavigate } from 'react-router-dom';
import './CheckoutPage.css';

const SHIPPING_FEE = 199;

/**
 * Renders the checkout page, handling form submission, cart validation, 
 * and displaying structured server-side stock errors.
 */
const CheckoutPage = () => {
  // 1. Destructure checkMinOrderValue
  const { cart, getCartTotal, clearCart, checkMinOrderValue } = useCart();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // 2. Call checkMinOrderValue to get the current min order status
  const { isWholesaler, isMinMet, minimumRequired } = checkMinOrderValue();
  const showMinOrderWarning = isWholesaler && !isMinMet;
  const minimumRemaining = minimumRequired - getCartTotal(); // Use getCartTotal directly here

  const [formData, setFormData] = useState({
    fullName: '',
    email: currentUser?.email || '',
    phoneNumber: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
  });

  const [isProcessing, setIsProcessing] = useState(false);
  // error can be a string (for simple errors) or an object {__html: string} (for detailed stock errors)
  const [error, setError] = useState(null); 

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  /**
   * Clears all error states and performs basic client-side validation.
   * @returns {boolean} True if validation passes.
   */
  const validateForm = () => {
    setError(null);
    const requiredFields = ['fullName', 'phoneNumber', 'addressLine1', 'city', 'state', 'pincode'];
    for (const field of requiredFields) {
      if (!formData[field]) {
        setError(`Please fill out the required field: ${field.charAt(0).toUpperCase() + field.slice(1)}.`);
        return false;
      }
    }
    return true;
  };

  /**
   * Handles the order submission process, including server-side stock validation.
   */
  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!validateForm() || showMinOrderWarning || cart.length === 0) {
      if (cart.length === 0) setError("Your cart is empty.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    // Prepare items for the server (ensure quantities are numbers)
    const validatedItems = cart.map(item => ({
        ...item,
        quantity: Number(item.quantity)
    }));

    const subtotal = getCartTotal();
    const totalWithShipping = subtotal + SHIPPING_FEE;

    const orderData = {
      billingInfo: formData,
      items: validatedItems,
      subtotal: subtotal,
      shippingFee: SHIPPING_FEE,
      total: totalWithShipping,
      userRole: isWholesaler ? 'wholesaler' : 'retailer',
      userId: currentUser?.uid || 'anonymous',
    };

    try {
      // NOTE: Replace with your actual Cloud Function URL if different
      const response = await fetch('https://us-central1-jewellerywholesale-2e57c.cloudfunctions.net/placeOrder', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorBody = await response.json();

        // 1. Handle Insufficient Stock (409 Conflict status from the function)
        if (response.status === 409 && errorBody.stockErrors) {
            
          // Build detailed error message HTML for presentation
          const detailedMessage = `
            <strong>Stock Alert: Insufficient inventory for some items!</strong>
            <p>Please review the following items and update quantities in your cart:</p>
            <ul>
                ${errorBody.stockErrors.map(err => 
                    `<li>
                        <span class="product-name-error">${err.productName}</span> 
                        ${err.variation !== 'N/A' ? `<span class="product-variation-error">(${err.variation})</span>` : ''}: 
                        You requested <strong>${err.requested}</strong>, but only <strong>${err.available}</strong> available.
                    </li>`
                ).join('')}
            </ul>
          `;

          // Set the error state as an object to trigger the detailed display logic in JSX
          setError({
            __html: detailedMessage
          });
          
          throw new Error('Stock validation failed.');
        }

        // 2. Handle other server errors (500, 400, etc.)
        throw new Error(errorBody.error || 'Failed to place order. Please try again.');
      }
      
      // Success path
      clearCart();
      navigate('/order-success');

    } catch (err) {
      console.error("Error submitting order:", err);
      // If error was not set by 409 block, set a generic message
      if (!error || typeof error === 'string') { 
        setError(err.message.includes('Stock validation') ? err.message : "There was an unexpected error processing your order. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="checkout-page-container">
      <h2>Complete Your Order</h2>
      
      {/* 🛑 Renders Detailed Stock Error or Simple String Error */}
      {error && (
          <div className={`error-message ${error.__html ? 'server-stock-error' : ''}`}>
              {/* Check if the error is the detailed HTML object */}
              {error.__html ? (
                  <div dangerouslySetInnerHTML={error} />
              ) : (
                  <p>{error}</p>
              )}
          </div>
      )}
      
      {showMinOrderWarning && (
        <div className="warning-message min-order-warning">
          <p>
            As a Wholesaler, your minimum order value must be ₹{minimumRequired.toFixed(2)}. 
            You need ₹{minimumRemaining.toFixed(2)} more to place your order.
          </p>
        </div>
      )}

      <div className="checkout-content">
        <div className="billing-details">
          <h3>Billing & Shipping Information</h3>
          <form onSubmit={handleSubmitOrder}>
            <div className="form-group">
              <label>Full Name*</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleInputChange} disabled />
            </div>
            <div className="form-group">
              <label>Phone Number*</label>
              <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label>Address Line 1*</label>
              <input type="text" name="addressLine1" value={formData.addressLine1} onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label>Address Line 2 (Optional)</label>
              <input type="text" name="addressLine2" value={formData.addressLine2} onChange={handleInputChange} />
            </div>
            <div className="form-group-row">
              <div className="form-group">
                <label>City*</label>
                <input type="text" name="city" value={formData.city} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>State*</label>
                <input type="text" name="state" value={formData.state} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Pincode*</label>
                <input type="text" name="pincode" value={formData.pincode} onChange={handleInputChange} required />
              </div>
            </div>

            <button 
              type="submit" 
              className="place-order-button" 
              disabled={isProcessing || showMinOrderWarning || cart.length === 0}
            >
              {isProcessing ? 'Processing...' : 'Place Order'}
            </button>
          </form>
        </div>

        <div className="order-summary-card">
          <h3>Order Summary</h3>
          <div className="cart-items-summary">
            {cart.map((item) => (
              <div key={item.id} className="cart-item-summary">
                <img src={item.image} alt={item.productName} className="cart-item-image" />
                <div className="cart-item-details">
                  <p className="cart-item-name">{item.productName}</p>
                  {item.variation && (
                    <p className="cart-item-variation">
                      Variation: {item.variation.color} {item.variation.size}
                    </p>
                  )}
                  <p className="cart-item-price">Price: ₹{item.price}</p>
                  <p className="cart-item-quantity">Quantity: {item.quantity}</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Totals Calculation */}
          <div className="cart-total-section">
            <p>Subtotal:</p>
            <p>₹{getCartTotal().toFixed(2)}</p>
          </div>
          
          {/* Display Minimum Order Requirement for Wholesalers */}
          {isWholesaler && (
              <div className={`cart-total-section minimum-order-line ${isMinMet ? 'met' : 'not-met'}`}>
                  <p>Min. Order (Wholesale):</p>
                  <p>₹{minimumRequired.toFixed(2)}</p>
              </div>
          )}
          
          <div className="cart-total-section">
            <p>Shipping:</p>
            <p>₹{SHIPPING_FEE.toFixed(2)}</p>
          </div>
          <div className="cart-total-section total-final">
            <p>Total:</p>
            <p>₹{(getCartTotal() + SHIPPING_FEE).toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;

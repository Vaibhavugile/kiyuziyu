import React, { useState } from 'react';
import { useCart } from '../components/CartContext';
import { useAuth } from '../components/AuthContext';
import { useNavigate } from 'react-router-dom';
import './CartPage.css';

const SHIPPING_FEE = 199;

const CheckoutPage = () => {
  const { cart, getCartTotal, clearCart } = useCart();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

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
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);

    if (Object.values(cart).length === 0) {
      setError("Your cart is empty. Please add items before checking out.");
      setIsProcessing(false);
      return;
    }

    const { fullName, email, phoneNumber, addressLine1, city, state, pincode } = formData;
    if (!fullName || !email || !phoneNumber || !addressLine1 || !city || !state || !pincode) {
      setError("Please fill out all mandatory shipping details.");
      setIsProcessing(false);
      return;
    }

    const validatedItems = Object.values(cart).map(item => {
      // You should also update this section to include the 'images' property
      if (!item.id || !item.productCode || !item.quantity || !item.price || !item.subcollectionId || !item.collectionId || !item.productName) {
        console.error("Skipping item due to missing data:", item);
        return null;
      }
      return {
        productId: item.id,
        productName: item.productName,
        productCode: item.productCode,
        image: item.image,
        images: item.images, // ADDED THIS LINE
        quantity: Number(item.quantity),
        priceAtTimeOfOrder: Number(item.price),
        subcollectionId: item.subcollectionId,
        collectionId: item.collectionId,
        maxQuantity: Number(item.maxQuantity)
      };
    }).filter(Boolean);

    if (validatedItems.length === 0) {
      setError("Your cart contains invalid items. Please clear your cart and try again.");
      setIsProcessing(false);
      return;
    }
    
    const subtotal = getCartTotal();
    const totalWithShipping = subtotal + SHIPPING_FEE;

    const orderData = {
      userId: currentUser?.uid || 'guest',
      items: validatedItems.map(({ maxQuantity, ...rest }) => rest),
      totalAmount: totalWithShipping,
      subtotal: subtotal,
      shippingFee: SHIPPING_FEE,
      billingInfo: formData,
      status: 'Pending',
    };

    try {
      const response = await fetch('https://us-central1-jewellerywholesale-2e57c.cloudfunctions.net/placeOrder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error('Failed to place order. Please try again.');
      }

      clearCart();
      navigate('/order-success');

    } catch (err) {
      console.error("Error submitting order:", err);
      setError("There was an error processing your order. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="checkout-page-container">
      <h2>Complete Your Order</h2>
      {error && <p className="error-message">{error}</p>}
      
      {Object.values(cart).length > 0 ? (
        <div className="checkout-content">
          <div className="cart-summary">
            <h3>Order Summary</h3>
            <div className="cart-items-list">
              {Object.values(cart).map((item) => (
                <div key={item.id} className="cart-item">
                  <img
                    src={item.images && item.images.length > 0 ? item.images[0] : item.image}
                    alt={item.productName}
                    className="cart-item-image"
                  />
                  <div className="cart-item-details">
                    <h4 className="cart-item-name">{item.productName}</h4>
                    <p className="cart-item-code">Code: {item.productCode}</p>
                    <p className="cart-item-price">Price: ₹{item.price}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-total-section">
              <p>Subtotal:</p>
              <p>₹{getCartTotal().toFixed(2)}</p>
            </div>
            <div className="cart-total-section">
              <p>Shipping:</p>
              <p>₹{SHIPPING_FEE.toFixed(2)}</p>
            </div>
            <div className="cart-total-section total-final">
              <p>Total:</p>
              <p>₹{(getCartTotal() + SHIPPING_FEE).toFixed(2)}</p>
            </div>
          </div>

          <div className="billing-section">
            <h4>Billing & Shipping Information</h4>
            <form onSubmit={handleSubmitOrder}>
              <input type="text" name="fullName" placeholder="Full Name *" value={formData.fullName} onChange={handleInputChange} required />
              <input type="email" name="email" placeholder="Email Address *" value={formData.email} onChange={handleInputChange} required />
              <input type="tel" name="phoneNumber" placeholder="Phone Number *" value={formData.phoneNumber} onChange={handleInputChange} required />
              
              <div className="address-fields">
                <input type="text" name="addressLine1" placeholder="Address Line 1 *" value={formData.addressLine1} onChange={handleInputChange} required />
                <input type="text" name="addressLine2" placeholder="Address Line 2 (Optional)" value={formData.addressLine2} onChange={handleInputChange} />
                <input type="text" name="city" placeholder="City *" value={formData.city} onChange={handleInputChange} required />
                <input type="text" name="state" placeholder="State/Province/Region *" value={formData.state} onChange={handleInputChange} required />
                <input type="text" name="pincode" placeholder="Pincode *" value={formData.pincode} onChange={handleInputChange} required />
              </div>

              <button type="submit" className="checkout-btn" disabled={isProcessing}>
                {isProcessing ? 'Processing...' : 'Place Order'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <p className="empty-cart-message">Your cart is empty.</p>
      )}
    </div>
  );
};

export default CheckoutPage;
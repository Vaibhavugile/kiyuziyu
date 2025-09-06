import React, { useState } from 'react';
import { useCart } from '../components/CartContext';
import { useAuth } from '../components/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db, collection, addDoc, updateDoc, doc } from '../firebase';
import './CartPage.css';

const CheckoutPage = () => {
  const { cart, getCartTotal, clearCart } = useCart();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: currentUser?.email || '',
    phoneNumber: '',
    shippingAddress: '',
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

    try {
      // Validate cart items to ensure no 'undefined' values are passed to Firestore
      const validatedItems = Object.values(cart).map(item => {
        if (!item.id || !item.productCode || !item.quantity || !item.price || !item.subcollectionId || !item.collectionId) {
          console.error("Skipping item due to missing data:", item);
          return null;
        }

        return {
          productId: item.id,
          productCode: item.productCode,
          quantity: Number(item.quantity), // Ensure quantity is a number
          priceAtTimeOfOrder: Number(item.price), // Ensure price is a number
          subcollectionId: item.subcollectionId,
          collectionId: item.collectionId,
          maxQuantity: Number(item.maxQuantity) // Ensure maxQuantity is a number
        };
      }).filter(Boolean);

      if (validatedItems.length === 0) {
        setError("Your cart contains invalid items. Please clear your cart and try again.");
        setIsProcessing(false);
        return;
      }

      // Create the order document with the validated data
      const orderData = {
        userId: currentUser?.uid || 'guest',
        items: validatedItems.map(({ maxQuantity, ...rest }) => rest), // Exclude maxQuantity from the saved data
        totalAmount: getCartTotal(),
        billingInfo: formData,
        status: 'Pending',
        createdAt: new Date(),
      };

      const orderRef = await addDoc(collection(db, "orders"), orderData);

      // Update product quantities in Firestore
      const updatePromises = validatedItems.map(item => {
        const productRef = doc(db, "collections", item.collectionId, "subcollections", item.subcollectionId, "products", item.productId);
        const newQuantity = item.maxQuantity - item.quantity;
        return updateDoc(productRef, {
            quantity: newQuantity,
        });
      });

      await Promise.all(updatePromises);
      
      // Clear the cart and navigate
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
        <>
          <div className="cart-summary">
            <h3>Order Summary</h3>
            <div className="cart-items-list">
              {Object.values(cart).map((item) => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-info">
                    <h3 className="cart-item-code">{item.productCode}</h3>
                    <p className="cart-item-price">₹{item.price} x {item.quantity}</p>
                  </div>
                  <p className="cart-item-subtotal">
                    Subtotal: ₹{(Number(item.price) * Number(item.quantity)).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
            <p className="cart-total">Total: <span>₹{getCartTotal().toFixed(2)}</span></p>
          </div>

          <div className="billing-section">
            <h4>Billing Information</h4>
            <form onSubmit={handleSubmitOrder}>
              <input type="text" name="fullName" placeholder="Full Name" value={formData.fullName} onChange={handleInputChange} required />
              <input type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleInputChange} required />
              <input type="tel" name="phoneNumber" placeholder="Phone Number" value={formData.phoneNumber} onChange={handleInputChange} required />
              <textarea name="shippingAddress" placeholder="Shipping Address" value={formData.shippingAddress} onChange={handleInputChange} required></textarea>
              <button type="submit" className="checkout-btn" disabled={isProcessing}>
                {isProcessing ? 'Processing...' : 'Place Order'}
              </button>
            </form>
          </div>
        </>
      ) : (
        <p className="empty-cart-message">Your cart is empty.</p>
      )}
    </div>
  );
};

export default CheckoutPage;
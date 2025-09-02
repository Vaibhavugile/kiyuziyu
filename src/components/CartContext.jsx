import React, { createContext, useState, useContext } from 'react';

// Utility function to get the price from tiered pricing based on quantity
export const getPriceForQuantity = (tiers, quantity) => {
  if (!tiers || tiers.length === 0) return 0;
  const sortedTiers = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);
  let price = sortedTiers[0]?.price || 0;
  for (const tier of sortedTiers) {
    if (quantity >= tier.min_quantity && (tier.max_quantity === '' || quantity <= tier.max_quantity)) {
      price = tier.price;
      break;
    }
  }
  return price;
};

// Create the context
export const CartContext = createContext();

// Create the provider component
export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({});

  // Recalculates prices based on the total quantity for a subcollection
  const recalculatePrices = (prevCart, subcollectionId, userRole) => {
    const newCart = { ...prevCart };
    let totalQuantity = 0;

    // First, find the total quantity of items in the subcollection
    for (const productId in newCart) {
      if (newCart[productId].subcollectionId === subcollectionId) {
        totalQuantity += newCart[productId].quantity;
      }
    }

    // Now, get the tiered pricing for the subcollection based on userRole
    const productItem = Object.values(newCart).find(item => item.subcollectionId === subcollectionId);
    const tieredPricing = productItem?.tieredPricing?.[userRole];
    
    if (tieredPricing) {
      const newPrice = getPriceForQuantity(tieredPricing, totalQuantity);
      
      // Update the price for all items in that subcollection
      for (const productId in newCart) {
        if (newCart[productId].subcollectionId === subcollectionId) {
          newCart[productId].price = newPrice;
        }
      }
    }
    return newCart;
  };

  const addToCart = (productId, productData) => {
    setCart(prevCart => {
      const currentQuantity = prevCart[productId]?.quantity || 0;
      if (currentQuantity >= productData.maxQuantity) {
        return prevCart;
      }

      const newCart = {
        ...prevCart,
        [productId]: {
          ...productData,
          quantity: currentQuantity + 1,
        },
      };

      // Recalculate prices for the entire subcollection
      return recalculatePrices(newCart, productData.subcollectionId, productData.userRole);
    });
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => {
      const newCart = { ...prevCart };
      const subcollectionId = newCart[productId]?.subcollectionId;
      const userRole = newCart[productId]?.userRole;

      const newQuantity = (newCart[productId]?.quantity || 0) - 1;

      if (newQuantity <= 0) {
        delete newCart[productId];
      } else {
        newCart[productId].quantity = newQuantity;
      }

      // Recalculate prices for the entire subcollection
      if (subcollectionId) {
        return recalculatePrices(newCart, subcollectionId, userRole);
      }

      return newCart;
    });
  };

  // Function to get total cost of the cart
  const getCartTotal = () => {
    return Object.values(cart).reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const contextValue = {
    cart,
    addToCart,
    removeFromCart,
    getCartTotal,
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

// Custom hook to use the cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
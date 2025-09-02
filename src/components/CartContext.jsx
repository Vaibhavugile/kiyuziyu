import React, { createContext, useState, useContext } from 'react';

// Utility function to get the price from tiered pricing based on quantity
export const getPriceForQuantity = (tiers, quantity) => {
  if (!tiers || tiers.length === 0) return 0;
  const sortedTiers = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);
  let price = sortedTiers[0].price; // Default to the lowest tier price
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

  // Helper function to recalculate prices for a subcollection based on total quantity
  const recalculateSubcollectionPrices = (prevCart, subcollectionId) => {
    const newCart = { ...prevCart };
    let totalSubcollectionQuantity = 0;

    // First, calculate the total quantity for the subcollection
    for (const productId in newCart) {
      if (newCart[productId].subcollectionId === subcollectionId) {
        totalSubcollectionQuantity += newCart[productId].quantity;
      }
    }

    // Then, find the new price based on the total quantity
    const tieredPricing = newCart[Object.keys(newCart).find(key => newCart[key].subcollectionId === subcollectionId)]?.tieredPricing?.retail;
    const newPrice = getPriceForQuantity(tieredPricing, totalSubcollectionQuantity);
    
    // Finally, update the price for every product in that subcollection
    for (const productId in newCart) {
      if (newCart[productId].subcollectionId === subcollectionId) {
        newCart[productId].price = newPrice;
      }
    }

    return newCart;
  };

  // Function to add a product to the cart
  const addToCart = (productId, productData, maxQuantity) => {
    setCart(prevCart => {
      const currentQuantity = prevCart[productId]?.quantity || 0;
      if (currentQuantity >= maxQuantity) {
        return prevCart;
      }

      const newCart = {
        ...prevCart,
        [productId]: {
          ...productData,
          quantity: currentQuantity + 1,
          price: 0, // Price will be updated in the next step
        },
      };

      // Recalculate prices for the entire subcollection
      return recalculateSubcollectionPrices(newCart, productData.subcollectionId);
    });
  };

  // Function to remove a product from the cart
  const removeFromCart = (productId) => {
    setCart(prevCart => {
      const newCart = { ...prevCart };
      const subcollectionId = newCart[productId]?.subcollectionId;

      const newQuantity = (newCart[productId]?.quantity || 0) - 1;

      if (newQuantity <= 0) {
        delete newCart[productId];
      } else {
        newCart[productId].quantity = newQuantity;
      }

      // Recalculate prices for the entire subcollection
      if (subcollectionId) {
        return recalculateSubcollectionPrices(newCart, subcollectionId);
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

  return <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>;
};

// Custom hook to use the cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
// CartContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

// Utility function to get the price from tiered pricing based on total quantity
export const getPriceForQuantity = (tiers, totalQuantity) => {
  if (!tiers || tiers.length === 0) return null;

  // Sort the tiers in descending order of quantity to find the highest tier first
  const sortedTiers = [...tiers].sort((a, b) => b.min_quantity - a.min_quantity);

  for (const tier of sortedTiers) {
    if (totalQuantity >= tier.min_quantity) {
      return tier.price;
    }
  }

  // Fallback to the price of the lowest tier if no tier matches
  return sortedTiers[sortedTiers.length - 1]?.price || null;
};

// Helper function to create a stable, unique pricing ID
export const createStablePricingId = (tiers) => {
  if (!tiers) return null;

  // Sort the tiers array by a key like min_quantity
  const sortedTiers = [...tiers].sort((a, b) => {
    const minA = parseInt(a.min_quantity, 10);
    const minB = parseInt(b.min_quantity, 10);
    return minA - minB;
  });

  // Then, create a consistent string representation by also sorting object keys
  const stableString = sortedTiers.map(tier => {
    const sortedKeys = Object.keys(tier).sort();
    const sortedTier = {};
    sortedKeys.forEach(key => {
      sortedTier[key] = tier[key];
    });
    return sortedTier;
  });

  return JSON.stringify(stableString);
};

// Create the context
export const CartContext = createContext();

// Create the provider component
export const CartProvider = ({ children }) => {
  const { userRole } = useAuth();

  // Initialize state by trying to load from localStorage
  const [cart, setCart] = useState(() => {
    try {
      const storedCart = localStorage.getItem('cart');
      return storedCart ? JSON.parse(storedCart) : {};
    } catch (error) {
      console.error("Failed to load cart from localStorage:", error);
      return {};
    }
  });
  
  // Save the cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(cart));
    } catch (error) {
      console.error("Failed to save cart to localStorage:", error);
    }
  }, [cart]);

  // New helper function to recalculate all prices in the cart based on collective quantity
  const recalculateCartPrices = useCallback((currentCart) => {
    console.log("--- Starting Cart Price Recalculation ---");
    const newCart = { ...currentCart };
    const pricingGroups = {};

    // Group products in the cart by their unique pricing ID
    for (const productId in newCart) {
      const item = newCart[productId];
      const pricingId = item.pricingId; 

      if (!pricingGroups[pricingId]) {
        pricingGroups[pricingId] = {
          totalQuantity: 0,
          productIds: [],
          tiers: item.tieredPricing[userRole === 'wholesaler' ? 'wholesale' : 'retail'],
        };
      }
      pricingGroups[pricingId].totalQuantity += item.quantity;
      pricingGroups[pricingId].productIds.push(productId);
    }
    console.log("Grouped products by pricing tiers:", pricingGroups);

    // Recalculate and apply the new price for each group
    for (const key in pricingGroups) {
      const group = pricingGroups[key];
      const newPrice = getPriceForQuantity(group.tiers, group.totalQuantity);
      for (const productId of group.productIds) {
        newCart[productId].price = newPrice;
      }
    }
    console.log("--- Finished Cart Price Recalculation ---");
    console.log("New Cart State:", newCart);
    return newCart;
  }, [userRole]); // Dependency on userRole

  const addToCart = useCallback((productId, productData, maxQuantity) => {
    setCart((prevCart) => {
      const currentQuantity = prevCart[productId]?.quantity || 0;
      if (currentQuantity >= maxQuantity) {
        return prevCart;
      }
      
      const roleBasedTiers = productData.tieredPricing[userRole === 'wholesaler' ? 'wholesale' : 'retail'];
      const pricingId = createStablePricingId(roleBasedTiers);

      const newCart = {
        ...prevCart,
        [productId]: {
          ...productData,
          quantity: currentQuantity + 1,
          price: 0, 
          pricingId: pricingId, // Store the stable pricing ID
        },
      };
      return recalculateCartPrices(newCart);
    });
  }, [userRole, recalculateCartPrices]); // Dependencies on userRole and recalculateCartPrices

  const removeFromCart = useCallback((productId) => {
    setCart(prevCart => {
      const newCart = { ...prevCart };
      const newQuantity = (newCart[productId]?.quantity || 0) - 1;

      if (newQuantity <= 0) {
        delete newCart[productId];
      } else {
        newCart[productId].quantity = newQuantity;
      }
      return recalculateCartPrices(newCart);
    });
  }, [recalculateCartPrices]); // Dependency on recalculateCartPrices

  const getCartTotal = useCallback(() => {
    return Object.values(cart).reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart]); // Dependency on cart

  const clearCart = useCallback(() => {
    setCart({});
  }, []);

  const contextValue = {
    cart,
    addToCart,
    removeFromCart,
    getCartTotal,
    clearCart,
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

// Custom hook to use the cart context
export const useCart = () => useContext(CartContext);
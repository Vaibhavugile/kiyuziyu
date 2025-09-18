// CartContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

// Utility function to get the price from tiered pricing based on total quantity
export const getPriceForQuantity = (tiers, totalQuantity) => {
  if (!tiers || tiers.length === 0) return null;
  const sortedTiers = [...tiers].sort((a, b) => b.min_quantity - a.min_quantity);
  for (const tier of sortedTiers) {
    if (totalQuantity >= tier.min_quantity) {
      return tier.price;
    }
  }
  return sortedTiers[sortedTiers.length - 1]?.price || null;
};

// Helper function to create a stable, unique pricing ID
export const createStablePricingId = (tiers) => {
  if (!tiers) return null;
  const sortedTiers = [...tiers].sort((a, b) => {
    const minA = parseInt(a.min_quantity, 10);
    const minB = parseInt(b.min_quantity, 10);
    return minA - minB;
  });
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

// New helper function to create a unique ID for a cart item, including its variation
export const getCartItemId = (product) => {
  if (product.variation && product.variation.color && product.variation.size) {
    return `${product.id}_${product.variation.color.replace(/\s+/g, '-')}_${product.variation.size.replace(/\s+/g, '-')}`;
  }
  return product.id;
};

// Create the context
export const CartContext = createContext();

// Create the provider component
export const CartProvider = ({ children }) => {
  const { userRole } = useAuth();
  const [cart, setCart] = useState(() => {
    try {
      const storedCart = localStorage.getItem('cart');
      return storedCart ? JSON.parse(storedCart) : {};
    } catch (error) {
      console.error("Failed to load cart from localStorage:", error);
      return {};
    }
  });
  
  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(cart));
    } catch (error) {
      console.error("Failed to save cart to localStorage:", error);
    }
  }, [cart]);

  const recalculateCartPrices = useCallback((currentCart) => {
    console.log("--- Starting Cart Price Recalculation ---");
    const newCart = { ...currentCart };
    const pricingGroups = {};
    for (const cartItemId in newCart) {
      const item = newCart[cartItemId];
      if (!item.tieredPricing) {
        console.warn(`Product ${item.productName} is missing tieredPricing data. Skipping price recalculation for this item.`);
        continue;
      }
      const pricingId = item.pricingId; 
      if (!pricingGroups[pricingId]) {
        pricingGroups[pricingId] = {
          totalQuantity: 0,
          cartItemIds: [],
          tiers: item.tieredPricing[userRole === 'wholesaler' ? 'wholesale' : 'retail'],
        };
      }
      pricingGroups[pricingId].totalQuantity += item.quantity;
      pricingGroups[pricingId].cartItemIds.push(cartItemId);
    }
    console.log("Grouped products by pricing tiers:", pricingGroups);
    for (const key in pricingGroups) {
      const group = pricingGroups[key];
      const newPrice = getPriceForQuantity(group.tiers, group.totalQuantity);
      for (const cartItemId of group.cartItemIds) {
        newCart[cartItemId].price = newPrice;
      }
    }
    console.log("--- Finished Cart Price Recalculation ---");
    console.log("New Cart State:", newCart);
    return newCart;
  }, [userRole]);

  const addToCart = useCallback((productData) => {
    setCart((prevCart) => {
      const cartItemId = getCartItemId(productData);
      const currentQuantity = prevCart[cartItemId]?.quantity || 0;
      const maxQuantity = productData.variation ? Number(productData.variation.quantity) : Number(productData.quantity);
      if (currentQuantity >= maxQuantity) {
        return prevCart;
      }
      const roleBasedTiers = productData.tieredPricing
        ? productData.tieredPricing[userRole === 'wholesaler' ? 'wholesale' : 'retail']
        : null;
      const pricingId = roleBasedTiers ? createStablePricingId(roleBasedTiers) : null;
      const newCart = {
        ...prevCart,
        [cartItemId]: {
          ...productData,
          quantity: currentQuantity + 1,
          price: 0, 
          images: productData.images || (productData.image ? [{ url: productData.image }] : []),
          pricingId: pricingId, 
        },
      };
      return recalculateCartPrices(newCart);
    });
  }, [userRole, recalculateCartPrices]);

  const removeFromCart = useCallback((cartItemId) => {
    setCart(prevCart => {
      const newCart = { ...prevCart };
      const newQuantity = (newCart[cartItemId]?.quantity || 0) - 1;
      if (newQuantity <= 0) {
        delete newCart[cartItemId];
      } else {
        newCart[cartItemId].quantity = newQuantity;
      }
      return recalculateCartPrices(newCart);
    });
  }, [recalculateCartPrices]);

  const getCartTotal = useCallback(() => {
    return Object.values(cart).reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart]);

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
export const useCart = () => useContext(CartContext);
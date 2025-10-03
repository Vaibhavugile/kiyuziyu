// CartContext.jsx

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

// --- NEW CONSTANT: Moved outside for better practice ---
const WHOLESALER_MIN_ORDER_VALUE = 5000;

// Utility functions (kept as is)
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

export const getCartItemId = (product) => {
  // CRITICAL: Ensure we can handle cases where color or size might be missing/undefined 
  // and only use variation if it exists.
  if (product.variation) {
    // Collect all variation keys (color, size, etc.) and sort them for a stable ID
    const variationKeys = Object.keys(product.variation)
      .filter(key => product.variation[key] != null) // Filter out null/undefined keys
      .sort();

    const variationString = variationKeys
      .map(key => String(product.variation[key]).replace(/\s+/g, '-'))
      .join('_');
      
    return `${product.id}_${variationString}`;
  }
  return product.id;
};


// Create the context
export const CartContext = createContext();

// Refactored Price Recalculation Logic
const recalculateCartPrices = (currentCart, userRole) => {
  const newCart = { ...currentCart };
  const pricingGroups = {};
  
  for (const cartItemId in newCart) {
    const item = newCart[cartItemId];
    if (!item.tieredPricing) continue;
    
    // Ensure we use the correct role for tiers
    const roleTiers = item.tieredPricing[userRole === 'wholesaler' ? 'wholesale' : 'retail'];

    const pricingId = item.pricingId || (roleTiers ? createStablePricingId(roleTiers) : null);
    
    if (!pricingGroups[pricingId]) {
      pricingGroups[pricingId] = {
        totalQuantity: 0,
        cartItemIds: [],
        tiers: roleTiers,
      };
    }
    // Only proceed if tiers exist for this role
    if (roleTiers) {
      pricingGroups[pricingId].totalQuantity += item.quantity;
      pricingGroups[pricingId].cartItemIds.push(cartItemId);
    }
  }
  
  for (const key in pricingGroups) {
    const group = pricingGroups[key];
    if (!group.tiers) continue; // Skip if no tiers were found for this role/group
    
    const newPrice = getPriceForQuantity(group.tiers, group.totalQuantity);
    for (const cartItemId of group.cartItemIds) {
      newCart[cartItemId].price = newPrice;
    }
  }
  return newCart;
};

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

  // --- START OF FIXED ORDER FOR FUNCTIONS ---
  
  const getCartTotal = useCallback(() => {
    return Object.values(cart).reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart]);

  const checkMinOrderValue = useCallback(() => {
    const total = getCartTotal();
    const isWholesaler = userRole === 'wholesaler';
    
    // Set minimum required amount: 5000 for wholesalers, 0 for others
    const minimumRequired = isWholesaler ? WHOLESALER_MIN_ORDER_VALUE : 0;
    
    // Check if the total meets the minimum
    const isMinMet = total >= minimumRequired;

    return {
      isWholesaler,
      minimumRequired,
      isMinMet,
      currentTotal: total
    };
  }, [getCartTotal, userRole]); 

  // --- END OF FIXED ORDER FOR FUNCTIONS ---

  const addToCart = useCallback((productData) => {
    setCart((prevCart) => {
      const cartItemId = getCartItemId(productData);
      const currentQuantity = prevCart[cartItemId]?.quantity || 0;

      // 🎯 CRITICAL FIX: Create a clean copy of productData and remove 
      // stock-related fields that should not be used as the cart item's quantity.
      const cleanProductData = { ...productData };
      delete cleanProductData.quantity;
      delete cleanProductData.variations;
      // End CRITICAL FIX

      // 🎯 FIX: Determine the Stock Limit correctly based on product type and current cart state.
      let stockLimit;
      if (productData.variation) {
        // Case 1: Product with variation. Stock is always in variation object.
        stockLimit = Number(productData.variation.quantity);
      } else if (prevCart[cartItemId]?.stockLimit) {
        // Case 2: Simple product already in cart. Stock is stored in cart item's stockLimit property.
        stockLimit = prevCart[cartItemId].stockLimit;
      } else {
        // Case 3: Simple product first time in cart. Stock is in productData.quantity.
        // NOTE: We rely on ProductsPage.jsx *not* passing this now, but if it did, 
        // this is where the stock quantity would be pulled.
        stockLimit = Number(productData.quantity || Infinity);
      }
      
      if (currentQuantity >= stockLimit) {
        console.warn(`Cannot add more of ${productData.productName}. Max stock (${stockLimit}) reached.`);
        return prevCart;
      }

      // Determine pricing ID
      const roleBasedTiers = cleanProductData.tieredPricing
        ? cleanProductData.tieredPricing[userRole === 'wholesaler' ? 'wholesale' : 'retail']
        : null;
      const pricingId = roleBasedTiers ? createStablePricingId(roleBasedTiers) : null;
      
      // Create the temporary new cart state with updated quantity
      const updatedCart = {
        ...prevCart,
        [cartItemId]: {
          // Merge existing cart data first to preserve saved price, etc.
          ...(prevCart[cartItemId] || {}), 
          
          // Spread the *CLEAN* product data (which no longer contains stock quantity)
          ...cleanProductData, 
          
          // Store the calculated stockLimit for future checks
          stockLimit: stockLimit, 

          // EXPLICITLY SET THE CART QUANTITY, which is the cart's authority
          quantity: currentQuantity + 1,
          
          price: prevCart[cartItemId]?.price || 0,
          images: cleanProductData.images || (cleanProductData.image ? [{ url: cleanProductData.image }] : []),
          pricingId: pricingId, 
        },
      };
      
      return recalculateCartPrices(updatedCart, userRole);
    });
  }, [userRole]);

  const removeFromCart = useCallback((cartItemId) => {
    setCart(prevCart => {
      const newCart = { ...prevCart };
      
      // Check if the item actually exists in the cart before trying to modify it
      if (!newCart[cartItemId]) {
        return prevCart; 
      }
      
      const newQuantity = newCart[cartItemId].quantity - 1; // Decrements by 1

      // 🎯 FIX: Quantity check is correct: remove if quantity drops to 0 or less
      if (newQuantity <= 0) {
        delete newCart[cartItemId];
      } else {
        newCart[cartItemId].quantity = newQuantity;
      }
      
      return recalculateCartPrices(newCart, userRole);
    });
  }, [userRole]);

  const clearCart = useCallback(() => {
    setCart({});
  }, []);

  // Recalculate prices if the user role changes
  useEffect(() => {
    setCart(prevCart => {
        // Only run recalculation if the cart has items
        if (Object.keys(prevCart).length > 0) {
            return recalculateCartPrices(prevCart, userRole);
        }
        return prevCart;
    });
  }, [userRole]);

  const contextValue = {
    cart,
    addToCart,
    removeFromCart,
    getCartTotal,
    clearCart,
    checkMinOrderValue,
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};
export const useCart = () => useContext(CartContext);
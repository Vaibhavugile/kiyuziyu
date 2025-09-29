// CartContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

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
  if (product.variation && product.variation.color && product.variation.size) {
    return `${product.id}_${product.variation.color.replace(/\s+/g, '-')}_${product.variation.size.replace(/\s+/g, '-')}`;
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


  const addToCart = useCallback((productData) => {
    setCart((prevCart) => {
      const cartItemId = getCartItemId(productData);
      const currentQuantity = prevCart[cartItemId]?.quantity || 0;

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
          stockLimit = Number(productData.quantity);
      }

      if (currentQuantity >= stockLimit) {
          console.warn(`Cannot add more of ${productData.productName}. Max stock (${stockLimit}) reached.`);
          return prevCart;
      }

      // Determine pricing ID
      const roleBasedTiers = productData.tieredPricing
        ? productData.tieredPricing[userRole === 'wholesaler' ? 'wholesale' : 'retail']
        : null;
      const pricingId = roleBasedTiers ? createStablePricingId(roleBasedTiers) : null;
      
      // Create the temporary new cart state with updated quantity
      const updatedCart = {
        ...prevCart,
        [cartItemId]: {
          // Merge existing cart data first to preserve saved stockLimit, 
          // then spread new productData (which includes other fresh details), 
          // and finally set the new quantity/price.
          ...(prevCart[cartItemId] || {}), 
          ...productData, 
          
          // Store the calculated stockLimit for future checks
          stockLimit: stockLimit, 

          quantity: currentQuantity + 1,
          price: prevCart[cartItemId]?.price || 0,
          images: productData.images || (productData.image ? [{ url: productData.image }] : []),
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

  const getCartTotal = useCallback(() => {
    return Object.values(cart).reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart]);

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
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};
export const useCart = () => useContext(CartContext);
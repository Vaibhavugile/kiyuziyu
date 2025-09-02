import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, collection, getDocs, doc, getDoc } from '../firebase';
import ProductCard from '../components/ProductCard';
import { useCart, getPriceForQuantity } from '../components/CartContext';
import { useAuth } from '../components/AuthContext'; // Import the new useAuth hook

const ProductsPage = () => {
  const { collectionId, subcollectionId } = useParams();
  const [mainCollection, setMainCollection] = useState(null);
  const [subcollection, setSubcollection] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { cart, addToCart, removeFromCart } = useCart();
  const { userProfile } = useAuth(); // Use the new hook to get the user's profile

  useEffect(() => {
    // ... (Your fetchProductData logic remains the same)
    // The key is that `subcollection` will now have the `tieredPricing` data
    const fetchProductData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const mainCollectionDocRef = doc(db, "collections", collectionId);
        const mainCollectionDocSnap = await getDoc(mainCollectionDocRef);
        if (!mainCollectionDocSnap.exists()) {
          setError("Main collection not found.");
          setIsLoading(false);
          return;
        }
        setMainCollection({ id: mainCollectionDocSnap.id, ...mainCollectionDocSnap.data() });

        const subcollectionDocRef = doc(db, "collections", collectionId, "subcollections", subcollectionId);
        const subcollectionDocSnap = await getDoc(subcollectionDocRef);
        if (!subcollectionDocSnap.exists()) {
          setError("Subcollection not found.");
          setIsLoading(false);
          return;
        }
        setSubcollection({ id: subcollectionDocSnap.id, ...subcollectionDocSnap.data() });

        const productsRef = collection(db, "collections", collectionId, "subcollections", subcollectionId, "products");
        const productsSnapshot = await getDocs(productsRef);
        const fetchedProducts = productsSnapshot.docs.map(productDoc => ({
          ...productDoc.data(),
          id: productDoc.id,
        }));
        setProducts(fetchedProducts);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load products.");
      } finally {
        setIsLoading(false);
      }
    };
    if (collectionId && subcollectionId) {
      fetchProductData();
    } else {
      setError("Collection or subcollection ID not provided.");
      setIsLoading(false);
    }
  }, [collectionId, subcollectionId]);


  const getProductPrice = () => {
    // Determine the user's role from the auth context. Fallback to 'retail' if not available.
    const userRole = userProfile?.role || 'retailer';
    // Get the correct pricing tiers based on the user's role
    const pricingTiers = subcollection?.tieredPricing?.[userRole];
    if (!pricingTiers) return 0;
    
    // Calculate total quantity for the subcollection in the cart
    let totalSubcollectionQuantity = 0;
    for (const productId in cart) {
      if (cart[productId].subcollectionId === subcollectionId) {
        totalSubcollectionQuantity += cart[productId].quantity;
      }
    }
    
    return getPriceForQuantity(pricingTiers, totalSubcollectionQuantity);
  };

  // ... (loading and error checks remain the same)

  return (
    <>
      <div className="products-page-container">
        <h2 className="page-title">
          Products for: "{subcollection?.name || 'Unknown Subcollection'}"
        </h2>
        {/* ... (breadcrumb remains the same) */}
        
        {products.length === 0 ? (
          <p className="no-products-message">No products found in this subcollection.</p>
        ) : (
          <div className="products-grid collections-grid">
            {products.map((product) => {
              const cartQuantity = cart[product.id]?.quantity || 0;
              const currentPrice = getProductPrice(); // Get the price for the subcollection
              const userRole = userProfile?.role || 'retailer';
              
              return (
                <ProductCard
                  key={product.id}
                  productCode={product.productCode}
                  quantity={product.quantity}
                  image={product.image}
                  price={currentPrice}
                  cartQuantity={cartQuantity}
                  onIncrement={() => addToCart(product.id, {
                    id: product.id,
                    productCode: product.productCode,
                    image: product.image,
                    maxQuantity: product.quantity,
                    tieredPricing: subcollection.tieredPricing,
                    subcollectionId: subcollection.id,
                    userRole: userRole, // Pass the user role to cart context
                  })}
                  onDecrement={() => removeFromCart(product.id, userRole)} // Pass the user role to cart context
                />
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default ProductsPage;
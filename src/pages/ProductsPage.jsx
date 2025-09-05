import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, collection, getDocs, doc, getDoc } from '../firebase';
import ProductCard from '../components/ProductCard';
import { useCart, getPriceForQuantity } from '../components/CartContext';
import { useAuth } from '../components/AuthContext'; // Import useAuth hook

// Utility function to get the price based on user role and tiered pricing
const getProductPrice = (product, subcollection, userRole, cartQuantity) => {
  if (!subcollection?.tieredPricing || !product?.tieredPricing) {
    return null; // Return null if no pricing data exists
  }

  // Determine the price tier based on the user's role
  const pricingTiers = userRole === 'wholesaler'
    ? subcollection.tieredPricing.wholesale
    : subcollection.tieredPricing.retail;

  // If logged in, calculate price based on cart quantity and tiered pricing
  if (userRole) {
    return getPriceForQuantity(pricingTiers, cartQuantity);
  } else {
    // If not logged in, show the base retail price (min_quantity of 1)
    const retailTiers = subcollection.tieredPricing.retail;
    const baseRetailTier = retailTiers.find(tier => tier.min_quantity === 1);
    return baseRetailTier ? baseRetailTier.price : null;
  }
};


const ProductsPage = () => {
  const { collectionId, subcollectionId } = useParams();
  const [mainCollection, setMainCollection] = useState(null);
  const [subcollection, setSubcollection] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const { cart, addToCart, removeFromCart } = useCart();
  const { currentUser, userRole, isLoading: isAuthLoading } = useAuth(); // Use the auth hook

  useEffect(() => {
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

        const productsCollectionRef = collection(db, "collections", collectionId, "subcollections", subcollectionId, "products");
        const querySnapshot = await getDocs(productsCollectionRef);
        const fetchedProducts = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts(fetchedProducts.sort((a, b) => a.productCode.localeCompare(b.productCode)));
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

  if (isLoading || isAuthLoading) {
    return (
      <div className="products-page-container">
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="products-page-container">
        <p className="error-message">{error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="products-page-container">
        <h2 className="page-title">
          Products for: "{subcollection?.name || 'Unknown Subcollection'}"
        </h2>
        <p className="breadcrumb">
          <Link to={`/collections/${collectionId}`}>
            {mainCollection?.title || 'Main Collections'}
          </Link>
          {' > '}
          {subcollection?.name || 'Unknown Subcollection'}
        </p>

        {products.length === 0 ? (
          <p className="no-products-message">No products found in this subcollection.</p>
        ) : (
          <div className="products-grid collections-grid">
            {products.map((product) => {
              const cartQuantity = cart[product.id]?.quantity || 0;
              // Get the price based on user role and current cart quantity
              const price = getProductPrice(product, subcollection, userRole, cartQuantity);

              return (
                <ProductCard
                  key={product.id}
                  productCode={product.productCode}
                  quantity={product.quantity}
                  image={product.image}
                  price={price} // Pass the dynamically determined price
                  cartQuantity={cartQuantity}
                  onIncrement={() => addToCart(product.id, {
                    id: product.id,
                    productCode: product.productCode,
                    image: product.image,
                    maxQuantity: product.quantity,
                    tieredPricing: subcollection.tieredPricing,
                    subcollectionId: subcollection.id,
                    // We don't need to pass the price here anymore, as it's calculated in the context
                  }, product.quantity)}
                  onDecrement={() => removeFromCart(product.id)}
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
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, collection, getDocs, doc, getDoc } from '../firebase';
import ProductCard from '../components/ProductCard';
import { useCart, getPriceForQuantity } from '../components/CartContext';
import { useAuth } from '../components/AuthContext';

const getProductPrice = (product, subcollection, userRole, cartQuantity) => {
  if (!subcollection?.tieredPricing || !product?.tieredPricing) {
    return null;
  }

  const pricingTiers = userRole === 'wholesaler'
    ? subcollection.tieredPricing.wholesale
    : subcollection.tieredPricing.retail;

  if (userRole) {
    return getPriceForQuantity(pricingTiers, cartQuantity);
  } else {
    const retailTiers = subcollection.tieredPricing.retail;
    const baseRetailTier = retailTiers.find(tier => tier.min_quantity === 1);
    return baseRetailTier ? baseRetailTier.price : null;
  }
};

const ProductsPage = () => {
  const { collectionId, subcollectionId } = useParams();
  const [products, setProducts] = useState([]);
  const [subcollection, setSubcollection] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { cart, addToCart, removeFromCart } = useCart();
  const { userRole } = useAuth();

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
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
        const fetchedProducts = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            // Cast the quantity to a number as soon as it's fetched
            quantity: Number(data.quantity)
          };
        });
        setProducts(fetchedProducts);
      } catch (err) {
        console.error("Error fetching products:", err);
        setError("Failed to load products.");
      } finally {
        setIsLoading(false);
      }
    };

    if (collectionId && subcollectionId) {
      fetchProducts();
    } else {
      setError("No collection or subcollection ID provided.");
      setIsLoading(false);
    }
  }, [collectionId, subcollectionId]);

  if (isLoading) {
    return (
      <div className="products-page-container">
        <p>Loading products...</p>
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
          Products in "{subcollection?.name || 'Unknown'}"
        </h2>
        {products.length === 0 ? (
          <p className="no-products-message">No products found in this subcollection.</p>
        ) : (
          <div className="products-grid collections-grid">
            {products.map((product) => {
              const cartQuantity = cart[product.id]?.quantity || 0;
              const price = getProductPrice(product, subcollection, userRole, cartQuantity);

              return (
                <ProductCard
                  key={product.id}
                  productCode={product.productCode}
                  quantity={product.quantity}
                  image={product.image}
                  price={price}
                  cartQuantity={cartQuantity}
                  onIncrement={() => addToCart(product.id, {
                    id: product.id,
                    productCode: product.productCode,
                    image: product.image,
                    maxQuantity: product.quantity,
                    tieredPricing: subcollection.tieredPricing,
                    subcollectionId: subcollection.id,
                    collectionId: collectionId,
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
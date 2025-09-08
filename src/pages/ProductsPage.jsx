import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, collection, getDocs, doc, getDoc } from '../firebase';
import ProductCard from '../components/ProductCard';
import { useCart, getPriceForQuantity } from '../components/CartContext';
import { useAuth } from '../components/AuthContext';
import './ProductsPage.css';

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
    const fetchSubcollectionAndProducts = async () => {
      try {
        const subcollectionRef = doc(db, 'collections', collectionId, 'subcollections', subcollectionId);
        const subcollectionSnap = await getDoc(subcollectionRef);

        if (subcollectionSnap.exists()) {
          const subcollectionData = { id: subcollectionSnap.id, ...subcollectionSnap.data() };
          setSubcollection(subcollectionData);

          const productsRef = collection(db, 'collections', collectionId, 'subcollections', subcollectionId, 'products');
          const productSnap = await getDocs(productsRef);
          const productsList = productSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setProducts(productsList);
        } else {
          setError('Subcollection not found.');
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError("Failed to load products. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubcollectionAndProducts();
  }, [collectionId, subcollectionId]);

  const pricingTiers = subcollection?.tieredPricing?.[userRole === 'wholesaler' ? 'wholesale' : 'retail'];

  if (isLoading) {
    return <div className="loading">Loading products...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <>
      <div className="products-page-wrapper">
        <div className="products-page-container">
          <h2 className="page-title">
            Products in "{subcollection?.name || 'Unknown'}"
          </h2>

          {pricingTiers && pricingTiers.length > 0 && (
            <div className="tiered-pricing-banner">
              <h5>Price Tiers:</h5>
              <div className="tier-list">
                {pricingTiers.map((tier, index) => (
                  <div key={index} className="tier-item">
                    <span>{tier.min_quantity}{tier.max_quantity ? `- ${tier.max_quantity}` : '+'}:</span> 
                    <span>₹{tier.price}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                    productName={product.productName}
                    productCode={product.productCode}
                    quantity={product.quantity}
                    image={product.image}
                    price={price}
                    cartQuantity={cartQuantity}
                    onIncrement={() => addToCart(product.id, {
                      id: product.id,
                      productName: product.productName,
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
      </div>
    </>
  );
};

export default ProductsPage;
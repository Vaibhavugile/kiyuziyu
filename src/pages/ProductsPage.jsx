import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, collection, getDocs, doc, getDoc } from '../firebase';
import ProductCard from '../components/ProductCard';
import { useCart, getPriceForQuantity } from '../components/CartContext'; // Import getPriceForQuantity

const ProductsPage = () => {
  const { collectionId, subcollectionId } = useParams();
  const [mainCollection, setMainCollection] = useState(null);
  const [subcollection, setSubcollection] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const { cart, addToCart, removeFromCart } = useCart();

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

  // Calculate total quantity for the subcollection in the cart
  const getTotalSubcollectionQuantity = () => {
    let total = 0;
    for (const productId in cart) {
      if (cart[productId].subcollectionId === subcollectionId) {
        total += cart[productId].quantity;
      }
    }
    return total;
  };
  
  // Calculate the current price based on the total subcollection quantity
  const getProductPrice = (product) => {
    if (!subcollection?.tieredPricing?.retail) return 0;
    const totalQuantity = getTotalSubcollectionQuantity();
    return getPriceForQuantity(subcollection.tieredPricing.retail, totalQuantity);
  };


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
              const currentPrice = getProductPrice(product);

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
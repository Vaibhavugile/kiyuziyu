import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, collection, getDocs, doc, getDoc } from '../firebase';
import ProductCard from '../components/ProductCard';
import { useCart, getPriceForQuantity } from '../components/CartContext';
import { useAuth } from '../components/AuthContext';
import Footer from '../components/Footer';
import './ProductsPage.css';

const getProductPrice = (product, subcollectionsMap, userRole, cartQuantity) => {
  const subcollection = subcollectionsMap[product.subcollectionId];
  if (!subcollection?.tieredPricing) {
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
  const { collectionId } = useParams();
  const [allProducts, setAllProducts] = useState([]);
  const [subcollections, setSubcollections] = useState([]);
  const [selectedSubcollectionId, setSelectedSubcollectionId] = useState('all');
  const [mainCollection, setMainCollection] = useState(null);
  const [subcollectionsMap, setSubcollectionsMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { cart, addToCart, removeFromCart } = useCart();
  const { userRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [quickViewProduct, setQuickViewProduct] = useState(null);

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const mainCollectionDocRef = doc(db, "collections", collectionId);
        const mainCollectionDocSnap = await getDoc(mainCollectionDocRef);
        if (mainCollectionDocSnap.exists()) {
          setMainCollection({ id: mainCollectionDocSnap.id, ...mainCollectionDocSnap.data() });
        } else {
          setError("Main collection not found.");
          setIsLoading(false);
          return;
        }

        const subcollectionRef = collection(db, "collections", collectionId, "subcollections");
        const subcollectionSnapshot = await getDocs(subcollectionRef);
        const fetchedSubcollections = subcollectionSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })).sort((a, b) => a.showNumber - b.showNumber);
        
        setSubcollections(fetchedSubcollections);
        
        const subcollectionsMap = fetchedSubcollections.reduce((map, sub) => {
          map[sub.id] = sub;
          return map;
        }, {});
        setSubcollectionsMap(subcollectionsMap);

        const productPromises = fetchedSubcollections.map(async (sub) => {
          const productsRef = collection(db, "collections", collectionId, "subcollections", sub.id, "products");
          const querySnapshot = await getDocs(productsRef);
          return querySnapshot.docs.map(productDoc => ({
            ...productDoc.data(),
            id: productDoc.id,
            subcollectionId: sub.id,
          }));
        });

        const productsBySubcollection = await Promise.all(productPromises);
        const allFetchedProducts = productsBySubcollection.flat();
        setAllProducts(allFetchedProducts);

      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load products.");
      } finally {
        setIsLoading(false);
      }
    };

    if (collectionId) {
      fetchAllData();
    } else {
      setError("No collection ID provided.");
      setIsLoading(false);
    }
  }, [collectionId]);

  const filteredProducts = useMemo(() => {
    let currentProducts = [...allProducts];

    // Filter by subcollection
    if (selectedSubcollectionId !== 'all') {
      currentProducts = currentProducts.filter(p => p.subcollectionId === selectedSubcollectionId);
    }

    // Filter by search term
    if (searchTerm) {
      currentProducts = currentProducts.filter(p =>
        p && p.productName && p.productCode && (
            p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.productCode.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    // Sort products
    if (sortBy === 'price-asc') {
        currentProducts.sort((a, b) => {
            const priceA = getProductPrice(a, subcollectionsMap, userRole, cart[a.id]?.quantity || 0);
            const priceB = getProductPrice(b, subcollectionsMap, userRole, cart[b.id]?.quantity || 0);
            return (priceA || Infinity) - (priceB || Infinity);
        });
    } else if (sortBy === 'price-desc') {
        currentProducts.sort((a, b) => {
            const priceA = getProductPrice(a, subcollectionsMap, userRole, cart[a.id]?.quantity || 0);
            const priceB = getProductPrice(b, subcollectionsMap, userRole, cart[b.id]?.quantity || 0);
            return (priceB || -Infinity) - (priceA || -Infinity);
        });
    }

    return currentProducts;
  }, [allProducts, selectedSubcollectionId, searchTerm, sortBy, subcollectionsMap, userRole, cart]);

  if (isLoading) {
    return <div className="products-page-container"><p>Loading products...</p></div>;
  }

  if (error) {
    return <div className="products-page-container"><p className="error-message">{error}</p></div>;
  }

  return (
    <>
      <div className="products-page-container">
        <h2 className="page-title">
          {mainCollection?.title || 'Unknown Collection'} Products
        </h2>

        <div className="product-controls">
          <div className="filter-group">
            <label htmlFor="subcollection-select">Filter by Subcollection:</label>
            <select 
              id="subcollection-select" 
              value={selectedSubcollectionId} 
              onChange={(e) => setSelectedSubcollectionId(e.target.value)}
            >
              <option value="all">All Products</option>
              {subcollections.map(sub => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="sort-by">Sort by:</label>
            <select
              id="sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="default">Default</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>

          <div className="search-group">
            <input
              type="text"
              placeholder="Search by product name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        
        {filteredProducts.length === 0 ? (
          <p className="no-products-message">No products found for this selection.</p>
        ) : (
          <div className="products-grid collections-grid">
            {filteredProducts.map((product) => {
              const cartQuantity = cart[product.id]?.quantity || 0;
              const price = getProductPrice(product, subcollectionsMap, userRole, cartQuantity);

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
                    tieredPricing: subcollectionsMap[product.subcollectionId].tieredPricing,
                    subcollectionId: product.subcollectionId,
                    collectionId: collectionId,
                  }, product.quantity)}
                  onDecrement={() => removeFromCart(product.id)}
                  onQuickView={() => setQuickViewProduct(product)}
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
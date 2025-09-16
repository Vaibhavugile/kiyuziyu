// src/pages/ProductsPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, collection, getDocs, doc, getDoc } from '../firebase';
import ProductCard from '../components/ProductCard';
import { useCart, getPriceForQuantity, createStablePricingId } from '../components/CartContext';
import { useAuth } from '../components/AuthContext';
import Footer from '../components/Footer';
import './ProductsPage.css';
import { FaShoppingCart, FaArrowLeft } from 'react-icons/fa';

// The getProductPrice function now calculates the total quantity from relevant products in the cart
const getProductPrice = (product, subcollectionsMap, userRole, cart) => {
  const subcollection = subcollectionsMap[product.subcollectionId];
  
  if (!subcollection?.tieredPricing) {
    return null;
  }

  const pricingTiers = userRole === 'wholesaler'
    ? subcollection.tieredPricing.wholesale
    : subcollection.tieredPricing.retail;
  
  // Create a unique ID by sorting the tiers before stringifying them
  const sortedTiers = [...pricingTiers].sort((a, b) => a.min_quantity - b.min_quantity);
   const pricingId = createStablePricingId(pricingTiers);
  // Calculate the total quantity for all products in the cart that share this pricing ID
  const totalRelevantQuantity = Object.values(cart).reduce((total, item) => {
    // We can now directly compare the item's stored pricingId
    if (item.pricingId === pricingId) {
      return total + item.quantity;
    }
    return total;
  }, 0);
  
  // Log the quantity used for price calculation
  console.log(`Product "${product.productName}": Total relevant quantity in cart is ${totalRelevantQuantity}`);

  return getPriceForQuantity(pricingTiers, totalRelevantQuantity);
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
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const cartItemsCount = Object.values(cart).reduce((total, item) => total + item.quantity, 0);

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
    console.log("Filtering and Sorting Products...");
    let currentProducts = [...allProducts];

    if (selectedSubcollectionId !== 'all') {
      currentProducts = currentProducts.filter(p => p.subcollectionId === selectedSubcollectionId);
    }

    if (searchTerm) {
      currentProducts = currentProducts.filter(p =>
        p && p.productName && p.productCode && (
          p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.productCode.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    if (sortBy === 'price-asc') {
        currentProducts.sort((a, b) => {
            const priceA = getProductPrice(a, subcollectionsMap, userRole, cart);
            const priceB = getProductPrice(b, subcollectionsMap, userRole, cart);
            return (priceA || Infinity) - (priceB || Infinity);
        });
    } else if (sortBy === 'price-desc') {
        currentProducts.sort((a, b) => {
            const priceA = getProductPrice(a, subcollectionsMap, userRole, cart);
            const priceB = getProductPrice(b, subcollectionsMap, userRole, cart);
            return (priceB || -Infinity) - (priceA || -Infinity);
        });
    }

    return currentProducts;
  }, [allProducts, selectedSubcollectionId, searchTerm, sortBy, subcollectionsMap, userRole, cart]);

  const handleAddToCart = (product) => {
    // Check if a user is logged in
    if (!currentUser) {
      alert("You must be logged in to add products to your cart.");
      navigate('/login');
      return;
    }
    
    // Retrieve the tiered pricing data for the current product's subcollection.
    const subcollection = subcollectionsMap[product.subcollectionId];
    if (!subcollection || !subcollection.tieredPricing) {
        console.error('Pricing information is missing for this product.');
        return;
    }
    const tieredPricingData = subcollection.tieredPricing;

    // Select the correct pricing tiers based on the user's role.
    const roleBasedTiers = tieredPricingData[userRole === 'wholesaler' ? 'wholesale' : 'retail'];
    
    // Use the new helper function to create a stable pricing ID
    const pricingId = createStablePricingId(roleBasedTiers);

    // Call addToCart with the correct product data, including the new pricingId.
    addToCart(product.id, {
        id: product.id,
        productName: product.productName,
        productCode: product.productCode,
        image: product.image,
        images: product.images, // ADD THIS LINE
        maxQuantity: product.quantity,
        tieredPricing: tieredPricingData,
        subcollectionId: product.subcollectionId,
        collectionId: collectionId,
        pricingId: pricingId, // Pass the new unique pricing ID
    }, product.quantity);
  };

  if (isLoading) {
    return <div className="products-page-container"><p>Loading products...</p></div>;
  }

  if (error) {
    return <div className="products-page-container"><p className="error-message">{error}</p></div>;
  }

  return (
    <>
      <div className="products-page-container">
        <Link to="/" className="back-to-collections">
          <FaArrowLeft /> Back to Collections
        </Link>
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
              const price = getProductPrice(product, subcollectionsMap, userRole, cart);
              const tieredPricing = subcollectionsMap[product.subcollectionId]?.tieredPricing[userRole === 'wholesaler' ? 'wholesale' : 'retail'];

              return (
               <ProductCard
  key={product.id}
  product={product}
  price={price}
  cartQuantity={cartQuantity}
  tieredPricing={tieredPricing}
  onIncrement={() => handleAddToCart(product)}
  onDecrement={() => removeFromCart(product.id)}
  onQuickView={() => setQuickViewProduct(product)}
   isCart={true} 
/>
              );
            })}
          </div>
        )}

        {cartItemsCount > 0 && (
          <div className="view-cart-fixed-container">
            <Link to="/cart" className="view-cart-btn-overlay">
              <div className="cart-icon-wrapper">
                <FaShoppingCart />
              </div>
              <div className="cart-details-wrapper">
                <span className="view-cart-text">View cart</span>
                <span className="cart-items-count-overlay">{cartItemsCount} item{cartItemsCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="cart-arrow-wrapper">
                &gt;
              </div>
            </Link>
          </div>
        )}

      </div>
      
    </>
  );
};

export default ProductsPage;

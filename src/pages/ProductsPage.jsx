// src/pages/ProductsPage.jsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
    db, 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    query, 
    where, 
    orderBy, 
    limit, 
    startAfter, 
    getDoc as getDocument
} from '../firebase';
import ProductCard from '../components/ProductCard';
import { useCart, getPriceForQuantity, createStablePricingId, getCartItemId } from '../components/CartContext';
import { useAuth } from '../components/AuthContext';
import './ProductsPage.css';
import { FaShoppingCart, FaArrowLeft, FaFilter, FaTimes, FaSpinner } from 'react-icons/fa';

// Product fetch limit per batch
const PRODUCTS_PER_PAGE = 20; 

// --- Existing Pricing Logic (UNCHANGED) ---
const getProductPrice = (product, subcollectionsMap, userRole, cart) => {
  const subcollection = subcollectionsMap[product.subcollectionId];
  if (!subcollection?.tieredPricing) {
    return null;
  }
  const pricingTiers = userRole === 'wholesaler'
    ? subcollection.tieredPricing.wholesale
    : subcollection.tieredPricing.retail;
  // Note: Tiered pricing logic remains complex. For simplicity and stability, 
  // we'll primarily sort by a static field like productCode or use client-side 
  // sorting for price after fetching. **Sorting directly by price in Firebase 
  // is complex due to cart context and tiered pricing.**
  return getPriceForQuantity(pricingTiers, 0); // Get base price for initial sort
};

const ProductsPage = () => {
  const { collectionId } = useParams();
  
  // --- NEW STATE FOR PAGINATION & PRODUCTS ---
  const [products, setProducts] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  // --- END NEW STATE ---

  const [subcollections, setSubcollections] = useState([]);
  const [selectedSubcollectionId, setSelectedSubcollectionId] = useState('all');
  const [mainCollection, setMainCollection] = useState(null);
  const [subcollectionsMap, setSubcollectionsMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false); // To distinguish initial load from "Load More"
  const [error, setError] = useState(null);
  const { cart, addToCart, removeFromCart } = useCart();
  const { currentUser, userRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('default'); // Default/ProductCode, price-asc, price-desc
  const [isControlsVisible, setIsControlsVisible] = useState(false);
  const cartItemsCount = Object.values(cart).reduce((total, item) => total + item.quantity, 0);

  // --- Fetch Main Collection and Subcollections (Initial Setup) ---
  useEffect(() => {
    const fetchMetadata = async () => {
      setError(null);
      try {
        // Fetch Main Collection Title
        const mainCollectionDocRef = doc(db, "collections", collectionId);
        const mainCollectionDocSnap = await getDoc(mainCollectionDocRef);
        if (mainCollectionDocSnap.exists()) {
          setMainCollection({ id: mainCollectionDocSnap.id, ...mainCollectionDocSnap.data() });
        } else {
          // Keep this logic even if not displayed, as metadata might be used elsewhere
          setError("Main collection not found.");
          return;
        }

        // Fetch Subcollections
        const subcollectionRef = collection(db, "collections", collectionId, "subcollections");
        const subcollectionSnapshot = await getDocs(subcollectionRef);
        const fetchedSubcollections = subcollectionSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })).sort((a, b) => a.showNumber - b.showNumber);
        setSubcollections(fetchedSubcollections);
        
        const map = fetchedSubcollections.reduce((map, sub) => {
          map[sub.id] = sub;
          return map;
        }, {});
        setSubcollectionsMap(map);

      } catch (err) {
        console.error("Error fetching metadata:", err);
        setError("Failed to load collection details.");
      }
    };

    if (collectionId) {
      fetchMetadata();
    }
  }, [collectionId]);

  // --- NEW CORE DATA FETCHING FUNCTION ---
  const fetchProducts = useCallback(async (isLoadMore = false) => {
    if (!collectionId) return;

    if (!isLoadMore) {
        setIsLoading(true);
        setProducts([]);
        setLastVisible(null);
        setHasMore(true);
    } else {
        setIsFetchingMore(true);
        if (!hasMore) {
            setIsFetchingMore(false);
            return;
        }
    }
    
    try {
      // 1. Determine the collection path based on selected subcollection
      let productsQueryRef;
      if (selectedSubcollectionId !== 'all') {
          // Query within a specific subcollection
          productsQueryRef = collection(db, "collections", collectionId, "subcollections", selectedSubcollectionId, "products");
      } else {
          // **NOTE:** Querying across all subcollections is highly complex/impossible in Firestore.
          // Since you need speed, the "All Products" view must iterate through subcollections.
          // To make this FAST, we will only allow single-subcollection filtering.
          // The "All Products" option will show nothing OR requires a flattened collection, 
          // but based on your structure, let's prioritize performance via filtering.
          // For now, let's default to the *first* subcollection if 'all' is selected.
          // ***
          // A better solution: When the user selects 'All Products', it should really just 
          // filter the subcollection list and tell them to pick one, or create a top-level 
          // 'all_products' collection during your data entry/sync process.
          // For simplicity and immediate speed fix, we will enforce single-subcollection fetch.
          
          if (subcollections.length > 0) {
              // If 'all' is selected, but we have subcollections, force the first one for the initial page load speed.
              // We'll rely on the user to pick a subcollection.
              // This is a trade-off for speed, as Firestore doesn't allow OR/UNION queries easily.
              if (!isLoadMore) setProducts([]); // Clear if initial load is forced to first subcollection
              console.warn("Fetching 'All Products' across subcollections is slow. Showing products from the first subcollection for initial speed.");
              // Fallback: If 'all' is selected, force selection of the first subcollection (if available)
              const firstSubcollectionId = subcollections[0].id;
              productsQueryRef = collection(db, "collections", collectionId, "subcollections", firstSubcollectionId, "products");
          } else {
              setHasMore(false);
              return;
          }
      }
      
      // 2. Start the base query
      let baseQuery = productsQueryRef;

      // 3. Apply Search Filter (by name/code)
      // NOTE: Firestore only supports simple prefix searches. Full-text search requires Algolia/Elastic.
      // We will search by Product Code for exact prefix match, as it's often indexed better.
      // Firestore `where` clauses are restrictive when combined with `orderBy`.
      if (searchTerm) {
          // If a search term is present, we must sort by the field we are filtering.
          // We will search by productCode prefix.
          baseQuery = query(
              baseQuery,
              where('productCode', '>=', searchTerm.toUpperCase()),
              where('productCode', '<=', searchTerm.toUpperCase() + '\uf8ff'),
              orderBy('productCode')
          );
      } else {
          // 4. Apply Sorting (If no search, sort by standard field)
          // Since client-side price sorting is highly dynamic (cart context), 
          // we only use Firestore for non-dynamic sorting.
          let orderField = 'productCode';
          let direction = 'asc';

          if (sortBy === 'price-asc' || sortBy === 'price-desc') {
            // WARNING: Price is dynamic. We use a static field like 'basePrice' 
            // if you have one, or stick to a neutral sort order like 'productCode'.
            // For this fix, we will sort by a static, indexed field.
            orderField = 'productCode'; 
            direction = 'asc';
          } else if (sortBy === 'product-name-asc') {
            orderField = 'productName';
          }
          
          baseQuery = query(baseQuery, orderBy(orderField, direction));
      }

      // 5. Apply Pagination
      if (lastVisible) {
          baseQuery = query(baseQuery, startAfter(lastVisible));
      }

      // 6. Apply Limit
      const finalQuery = query(baseQuery, limit(PRODUCTS_PER_PAGE));
      const documentSnapshots = await getDocs(finalQuery);

      // 7. Process Results
      const newProducts = documentSnapshots.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          subcollectionId: productsQueryRef.parent.id, // Re-attach subcollectionId
      }));

      // 8. Update State
      setProducts(prev => [...prev, ...newProducts]);
      
      if (documentSnapshots.docs.length < PRODUCTS_PER_PAGE) {
          setHasMore(false);
      } else {
          setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
          setHasMore(true);
      }

    } catch (err) {
      console.error("Error fetching products:", err);
      setError("Failed to load products in batches.");
      setHasMore(false);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }, [collectionId, selectedSubcollectionId, searchTerm, sortBy, subcollections, hasMore, lastVisible]);
  // --- END CORE DATA FETCHING FUNCTION ---


  // --- EFFECT TO RE-FETCH/RESET WHEN FILTERS CHANGE ---
  useEffect(() => {
    // Only fetch if metadata is loaded (subcollectionsMap is populated)
    if (subcollections.length > 0 || selectedSubcollectionId !== 'all') {
        fetchProducts(false); // Call initial fetch (isLoadMore=false)
    }
  }, [collectionId, selectedSubcollectionId, searchTerm, sortBy, subcollections.length]); 
  
  // Memoized Products for Client-Side Price Sorting (if needed)
  const sortedProducts = useMemo(() => {
    let currentProducts = [...products];

    // CLIENT-SIDE SORTING for dynamic price
    if (sortBy === 'price-asc') {
        currentProducts.sort((a, b) => {
            // We use 0 as quantity for base price comparison
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
    // If search term is present or sorted by productCode/Name, the sorting is already handled by Firebase
    return currentProducts;
  }, [products, sortBy, subcollectionsMap, userRole, cart]);

  const handleAddToCart = (product, variation) => {
    // ... (Keep existing handleAddToCart logic) ...
    if (!currentUser) {
      alert("The websiteis under maintenance for order please contact +91 7897897441  ");
      return;
    }
    const subcollection = subcollectionsMap[product.subcollectionId];
    if (!subcollection || !subcollection.tieredPricing) {
        console.error('Pricing information is missing for this product.');
        return;
    }
    const tieredPricingData = subcollection.tieredPricing;
    const roleBasedTiers = tieredPricingData[userRole === 'wholesaler' ? 'wholesale' : 'retail'];
    const pricingId = createStablePricingId(roleBasedTiers);
    const productData = {
        id: product.id,
        productName: product.productName,
        productCode: product.productCode,
        image: product.image,
        images: product.images,
        quantity: product.quantity,
        variations: product.variations,
        tieredPricing: tieredPricingData,
        subcollectionId: product.subcollectionId,
        collectionId: collectionId,
        pricingId: pricingId,
        variation: variation
    };
    addToCart(productData);
  };
  
  // Display loading status clearly
  if (isLoading && products.length === 0) {
    return <div className="products-page-container loading-state">
        <FaSpinner className="loading-spinner" />
        <p>Loading collection details...</p>
    </div>;
  }
  if (error) {
    return <div className="products-page-container"><p className="error-message">{error}</p></div>;
  }

  // --- JSX RENDER ---
  return (
    <>
      <div className="products-page-container">
        
        {/* HEADER (Sticky on mobile) */}
        <div className="page-header-container">
            <Link 
              to="/" 
              className="back-to-collections-icon"
              aria-label="Back to Collections"
            >
              <FaArrowLeft />
            </Link>
            
            <div className="title-and-toggle-wrapper">
                {/* REMOVED: <h1 className="page-title-modern">
                  {mainCollection?.title || 'Unknown Collection'}
                </h1> */}
                
                <button 
                    className="mobile-controls-toggle"
                    onClick={() => setIsControlsVisible(!isControlsVisible)}
                    aria-label={isControlsVisible ? "Close filters and search" : "Open filters and search"}
                >
                    {isControlsVisible ? <FaTimes /> : <FaFilter />} 
                </button>
            </div>
        </div>
        
        {/* CONTROLS BLOCK (Collapsible on mobile) */}
        <div className={`product-controls ${isControlsVisible ? 'open' : ''}`}>
          
          {/* Filter by Subcollection (CRITICAL FOR PERFORMANCE) */}
          <div className="filter-group">
            <label htmlFor="subcollection-select">Filter:</label>
            <select 
              id="subcollection-select" 
              value={selectedSubcollectionId} 
              onChange={(e) => setSelectedSubcollectionId(e.target.value)}
            >
              <option value="all">All Products (Select a Subcollection for Speed)</option>
              {subcollections.map(sub => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Sort by */}
          <div className="filter-group">
            <label htmlFor="sort-by">Sort by:</label>
            <select
              id="sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="default">Default (By Code)</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
          
          {/* Search Bar */}
          <div className="search-group">
            <input
              type="text"
              placeholder="Search by product code/name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        {/* END OF CONTROLS BLOCK */}
        
        {/* PRODUCTS GRID */}
        {sortedProducts.length === 0 && !isLoading ? (
          <p className="no-products-message">
            No products found for this selection. Please select a subcollection or adjust your filters.
          </p>
        ) : (
          <div className="products-grid collections-grid">
            {sortedProducts.map((product) => {
              const price = getProductPrice(product, subcollectionsMap, userRole, cart);
              const tieredPricing = subcollectionsMap[product.subcollectionId]?.tieredPricing[userRole === 'wholesaler' ? 'wholesale' : 'retail'];

              return (
               <ProductCard
                key={product.id}
                product={product}
                price={price}
                tieredPricing={tieredPricing}
                onIncrement={(productData) => handleAddToCart(productData, productData.variation)}
                onDecrement={(cartItemId) => removeFromCart(cartItemId)}
                onQuickView={() => { /* Implement QuickView later */}}
                cart={cart}
                />
              );
            })}
          </div>
        )}
        
        {/* LOAD MORE BUTTON */}
        {hasMore && products.length > 0 && (
          <div className="load-more-container">
            <button 
              onClick={() => fetchProducts(true)} 
              disabled={isFetchingMore}
              className="load-more-btn"
            >
              {isFetchingMore ? (
                <>
                  <FaSpinner className="loading-spinner-small" /> Loading...
                </>
              ) : (
                `Load More Products`
              )}
            </button>
          </div>
        )}

        {!hasMore && products.length > 0 && (
            <p className="end-of-list-message">You have reached the end of the product list.</p>
        )}

        {/* VIEW CART OVERLAY */}
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
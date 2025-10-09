// src/pages/ProductsPage.jsx

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
    getDoc as getDocument,
     getStorage, 
    ref as storageRef, 
    getDownloadURL 
} from '../firebase';
import ProductCard from '../components/ProductCard';
import { useCart, getPriceForQuantity, createStablePricingId, getCartItemId } from '../components/CartContext';
import { useAuth } from '../components/AuthContext';
import './ProductsPage.css';
import { FaShoppingCart, FaArrowLeft, FaFilter, FaTimes, FaSpinner, FaDownload  } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import * as autoTable from 'jspdf-autotable';
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
    return getPriceForQuantity(pricingTiers, 0); 
};


const ProductsPage = () => {
    const { collectionId } = useParams();
    
    // 🌟 Loop Fix: Ref to manage initial render skip (Kept for Strict Mode resilience)
    const isInitialRender = useRef(true); 
    
    // --- STATE ---
    const [products, setProducts] = useState([]);
    const [lastVisible, setLastVisible] = useState(null);
    const [hasMore, setHasMore] = useState(true);

    const [subcollections, setSubcollections] = useState([]);
    const [selectedSubcollectionId, setSelectedSubcollectionId] = useState('all'); 
    const [mainCollection, setMainCollection] = useState(null);
    const [subcollectionsMap, setSubcollectionsMap] = useState({});
    
    const [isMetadataReady, setIsMetadataReady] = useState(false); 
    const [isLoadingProducts, setIsLoadingProducts] = useState(true); 
    
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [error, setError] = useState(null);
    
    const { cart, addToCart, removeFromCart } = useCart();
    const { currentUser, userRole } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('default');
    const [isControlsVisible, setIsControlsVisible] = useState(false);
    const cartItemsCount = Object.values(cart).reduce((total, item) => total + item.quantity, 0);
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

// ---------------------------------------------------------------------
// ---------------------------------------------------------------------

    useEffect(() => {
        console.log("EFFECT 1: Starting fetchMetadata for collection:", collectionId);
        const fetchMetadata = async () => {
            setError(null);
            setIsMetadataReady(false);
            try {
                // Fetch Main Collection Title
                const mainCollectionDocRef = doc(db, "collections", collectionId);
                const mainCollectionDocSnap = await getDoc(mainCollectionDocRef);
                if (!mainCollectionDocSnap.exists()) {
                    setError(`Main collection "${collectionId}" not found.`);
                    console.error(`Metadata Error: Collection "${collectionId}" not found.`);
                    return;
                }
                const mainData = { id: mainCollectionDocSnap.id, ...mainCollectionDocSnap.data() };
                setMainCollection(mainData);
                console.log(`Metadata Success: Found main collection: ${mainData.title}`);

                // Fetch Subcollections
                const subcollectionRef = collection(db, "collections", collectionId, "subcollections");
                const subcollectionSnapshot = await getDocs(subcollectionRef);
                const fetchedSubcollections = subcollectionSnapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id
                })).sort((a, b) => (a.showNumber || 0) - (b.showNumber || 0)); 
                setSubcollections(fetchedSubcollections);
                
                const map = fetchedSubcollections.reduce((map, sub) => {
                    map[sub.id] = sub;
                    return map;
                }, {});
                setSubcollectionsMap(map);
                
                // Set default ID
                if (fetchedSubcollections.length > 0) {
                    setSelectedSubcollectionId(fetchedSubcollections[0].id);
                    console.log(`Metadata Success: Set default subcollection ID to: ${fetchedSubcollections[0].id}`);
                } else {
                    console.warn("Metadata Warning: No subcollections found. Product fetch will not run.");
                }
                
            } catch (err) {
                console.error("Metadata Catch Error:", err);
                setError("Failed to load collection categories. Check Firebase rules/connection.");
            } finally {
                setIsMetadataReady(true);
                setIsLoadingProducts(false); 
                console.log("Metadata FINISHED. isMetadataReady=true");
            }
        };

        if (collectionId) {
            fetchMetadata();
        }
    }, [collectionId]); 

// --- Debounce Effect (UNCHANGED) ---
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500); 
        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]); 

// ---------------------------------------------------------------------
// ---------------------------------------------------------------------

    // 🌟 DEPENDENCY ADJUSTMENT: lastVisible and hasMore MUST be here for "Load More" to function correctly.
    const fetchProducts = useCallback(async (isLoadMore = false,isSearchOnly = false) => {
        if (!collectionId) return;

        if (!isMetadataReady || selectedSubcollectionId === 'all') {
            console.log("Products Fetch Skipped: Metadata not ready or subcollection not selected.");
            return; 
        }
        
        console.log(`FETCH: Starting product fetch (Load More: ${isLoadMore}) for Subcollection ID: ${selectedSubcollectionId}. Search: ${debouncedSearchTerm}, Sort: ${sortBy}`);

        if (!isLoadMore) {
            
            // 1. Reset Pagination for any new query (search or filter)
            setLastVisible(null);
            setHasMore(true);

            if (isSearchOnly) {
                // Scenario: User is actively searching (typing stopped after debounce).
                // We show no main spinner. Client-side filter handles visible products.
                setIsFetchingMore(true); // Small loading indicator if needed (optional)
                
                // CRITICAL: DO NOT call setProducts([]) here.
                // The new data from the DB will overwrite the old data later.
            } else {
                // Scenario: Full page load, category change, or initial page load.
                // We MUST show the main spinner and clear the screen.
                setIsLoadingProducts(true);
                setProducts([]); 
            }
        } else {
            // Scenario: User clicked "Load More".
            setIsFetchingMore(true);
            if (!hasMore) { 
                setIsFetchingMore(false);
                return;
            }
        }
        try {
            const productsCollectionPath = collection(
                db, 
                "collections", 
                collectionId, 
                "subcollections", 
                selectedSubcollectionId, 
                "products"
            );
            
            let baseQuery = productsCollectionPath;
            const searchUpper = debouncedSearchTerm.toUpperCase(); 
            let orderField = 'productCode'; 

            if (searchUpper) {
                baseQuery = query(
                    baseQuery,
                    where('productCode', '>=', searchUpper),
                    where('productCode', '<=', searchUpper + '\uf8ff'),
                    orderBy('productCode')
                );
            } else {
                if (sortBy === 'product-name-asc') {
                    orderField = 'productName';
                }
                baseQuery = query(baseQuery, orderBy(orderField, 'asc'));
            }

            const lastDoc = isLoadMore ? lastVisible : null; 
            if (lastDoc) {
                baseQuery = query(baseQuery, startAfter(lastDoc));
            }

            const finalQuery = query(baseQuery, limit(PRODUCTS_PER_PAGE));
            
            console.log(`FETCH: Query executed. Awaiting getDocs result...`);
            const documentSnapshots = await getDocs(finalQuery);
            console.log(`FETCH SUCCESS: Received ${documentSnapshots.docs.length} product documents.`);

            const fetchedProducts = documentSnapshots.docs.map(doc => ({
                ...doc.data(),
                id: doc.id,
                subcollectionId: selectedSubcollectionId, 
            }));

            if (isLoadMore) {
                setProducts(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const uniqueNewProducts = fetchedProducts.filter(p => !existingIds.has(p.id));
                    return [...prev, ...uniqueNewProducts];
                });
            } else {
                setProducts(fetchedProducts);
            }

            if (documentSnapshots.docs.length < PRODUCTS_PER_PAGE) {
                setHasMore(false);
            } else {
                setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
                setHasMore(true);
            }

        } catch (err) {
            console.error("PRODUCTS FETCH CATCH ERROR:", err);
            setError("Failed to load products. Check console for required index link or permission errors.");
            setHasMore(false);
        } finally {
            setIsLoadingProducts(false); 
            setIsFetchingMore(false);
            console.log("PRODUCTS FETCH FINISHED.");
        }
    // lastVisible and hasMore are needed here to avoid stale closure for Load More
    }, [collectionId, selectedSubcollectionId, debouncedSearchTerm, sortBy, isMetadataReady, lastVisible, hasMore]); 
    
// ---------------------------------------------------------------------
// ---------------------------------------------------------------------

    useEffect(() => {
        
        // 1. Guard against running if metadata isn't ready or subcollection isn't selected
        if (!collectionId || !isMetadataReady || selectedSubcollectionId === 'all') {
            return;
        }
          const isSearchOnly = Boolean(debouncedSearchTerm);
        

        // 2. Loop Guard (Optional but good practice for Strict Mode)
        if (isInitialRender.current) {
             console.log("EFFECT 2: Initial render check complete. Allowing first fetch.");
        }

        // 3. Main Logic: Trigger fetch on all relevant changes
        console.log("EFFECT 2: Triggering fetchProducts (Initial Load/Filter Change)");
        fetchProducts(false, isSearchOnly);
        
        // Mark initial render complete after the first *intended* fetch runs.
        isInitialRender.current = false;

    // 🌟 THE FIX: fetchProducts IS REMOVED from dependencies. 
    // This breaks the circular dependency chain that caused the infinite loop.
    }, [collectionId, selectedSubcollectionId, debouncedSearchTerm, sortBy, isMetadataReady]); 
    
// ---------------------------------------------------------------------
// ---------------------------------------------------------------------

     const sortedProducts = useMemo(() => {
        let currentProducts = [...products];
        const searchUpper = debouncedSearchTerm.toUpperCase();
        
        // 1. **CLIENT-SIDE FILTERING (THE FIX)**
        if (searchUpper) {
            currentProducts = currentProducts.filter(product => {
                // Check product code (preferred match)
                const codeMatch = product.productCode && product.productCode.toUpperCase().includes(searchUpper);
                // Check product name
                const nameMatch = product.productName && product.productName.toUpperCase().includes(searchUpper);
                return codeMatch || nameMatch;
            });
        }
        
        // 2. Client-side price sorting (Existing Logic)
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
    // 3. IMPORTANT: Add debouncedSearchTerm as a dependency
    }, [products, sortBy, subcollectionsMap, userRole, cart, debouncedSearchTerm]); 
    

    const handleAddToCart = (product, variation) => {
        if (!currentUser) {
            alert("To Add Products To Cart Please Log in");
             navigate('/login');
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
            
            tieredPricing: tieredPricingData,
            subcollectionId: product.subcollectionId,
            collectionId: collectionId,
            pricingId: pricingId,
            variation: variation 
        };
        
        addToCart(productData);
    };
// // src/pages/ProductsPage.jsx (Inside ProductsPage component)

    // // src/pages/ProductsPage.jsx (Inside ProductsPage component)

    // // src/pages/ProductsPage.jsx (Inside ProductsPage component)

    // // src/pages/ProductsPage.jsx (Inside ProductsPage component)

    const handleGeneratePDF = async () => {
        if (selectedSubcollectionId === 'all') {
            alert('Please select a specific category to generate the PDF.');
            return;
        }

        setIsFetchingMore(true);
        const subcollectionName = subcollectionsMap[selectedSubcollectionId]?.name || 'Category';

        try {
            // 1. Fetch ALL products (no limit)
            const productsCollectionPath = collection(
                db, 
                "collections", 
                collectionId, 
                "subcollections", 
                selectedSubcollectionId, 
                "products"
            );
            
            const allProductsQuery = query(productsCollectionPath, orderBy('productCode'));
            const snapshot = await getDocs(allProductsQuery);
            
            if (snapshot.empty) {
                 alert('No products found in this category.');
                 return;
            }

            const doc = new jsPDF();
            let productCount = 0;
            const docWidth = doc.internal.pageSize.getWidth();
            const docHeight = doc.internal.pageSize.getHeight();
            const margin = 10; // A small margin for padding

            // 2. Fetch all image data URLs concurrently
            const imagePromises = snapshot.docs.map(async (productDoc, index) => {
                const product = productDoc.data();
                if (product.image) {
                    try {
                        const storageInstance = getStorage();
                        const imageRef = storageRef(storageInstance, product.image);
                        const url = await getDownloadURL(imageRef);
                        
                        // Fetch the image and convert it to a Data URL (Base64)
                        const response = await fetch(url);
                        const blob = await response.blob();
                        
                        return new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                resolve({
                                    dataUrl: reader.result,
                                    productCode: product.productCode || `Product ${index + 1}`,
                                    quantity: product.quantity ?? 'N/A' // Use ?? to handle missing/null quantity

                                });
                            };
                            reader.readAsDataURL(blob);
                        });
                    } catch (urlError) {
                        console.error(`Error processing image for product ${product.productCode}:`, urlError);
                        return null; // Skip problematic images
                    }
                }
                return null;
            });

            // Resolve all promises, filtering out any nulls
            const images = (await Promise.all(imagePromises)).filter(img => img !== null);
            
            if (images.length === 0) {
                 alert('No images found to include in the PDF.');
                 return;
            }
            
            // 3. Embed images into the PDF (one per page)
            images.forEach((img, index) => {
                if (index > 0) {
                    doc.addPage();
                }

                // Get image type (jsPDF supports JPEG, PNG, WEBP)
                const imgType = img.dataUrl.match(/^data:image\/(.+?);/)[1].toUpperCase();

                // Add header text
                doc.setFontSize(12);
                doc.text(
                    `${img.productCode} (${subcollectionName}) | Qty: ${img.quantity}`, 
                    margin, 
                    margin
                );
                
                // Add the image. We assume a full-width image for simplicity.
                // Start position Y is 15 (below the header text)
                const startY = 15;
                const availableHeight = docHeight - startY - margin;
                const availableWidth = docWidth - (2 * margin);
                
                // For demonstration, let's use a fixed size that fits well (e.g., 180mm width)
                const imgWidth = 180;
                const imgHeight = 180; // Placeholder, in a real app you'd calculate aspect ratio

                doc.addImage(
                    img.dataUrl, 
                    imgType, 
                    (docWidth - imgWidth) / 2, // Center the image horizontally
                    startY, 
                    imgWidth, 
                    availableHeight > imgHeight ? imgHeight : availableHeight
                );

                productCount++;
            });

            // 4. Save and download the PDF
            doc.save(`${subcollectionName}_Images.pdf`);
            alert(`Successfully generated a PDF with ${productCount} images for ${subcollectionName}.`);

        } catch (err) {
            console.error("PDF Generation Error:", err);
            // Show a generic error to the user
            alert("Failed to generate the image PDF. Check console for details.");
        } finally {
            setIsFetchingMore(false);
        }
    };
    
    // Helper function to get the image URL (must be defined or imported)
    // Ensure this helper is available in your component scope or is defined globally
    const getImageUrl = async (imagePath) => {
        try {
            const storageInstance = getStorage();
            const imageRef = storageRef(storageInstance, imagePath);
            return await getDownloadURL(imageRef);
        } catch (error) {
            console.warn(`Could not get download URL for ${imagePath}:`, error);
            return 'URL Not Available';
        }
    };


    
// --- Loading and Error States (Final Check) ---
    if (error) {
        return <div className="products-page-container"><p className="error-message">{error}</p></div>;
    }

    if (!isMetadataReady) {
         return <div className="products-page-container loading-state">
            <FaSpinner className="loading-spinner" />
            <p>Loading collection categories...</p>
        </div>;
    }
     const isActivelySearching = debouncedSearchTerm.length > 0;
    // Only show spinner if we are actively loading AND we have no products yet
   if (isLoadingProducts && products.length === 0 && !isActivelySearching) {
        return <div className="products-page-container loading-state">
            <FaSpinner className="loading-spinner" />
        </div>;
    }

    
// --- JSX RENDER (UNCHANGED) ---
    return (
        <>
            <div className="products-page-container">
                
                {/* HEADER */}
                <div className="page-header-container">
                    <Link 
                        to="/" 
                        className="back-to-collections-icon"
                        aria-label="Back to Collections"
                    >
                        <FaArrowLeft />
                    </Link>
                    
                    <div className="title-and-toggle-wrapper">
                        
                        <button 
                            className="mobile-controls-toggle"
                            onClick={() => setIsControlsVisible(!isControlsVisible)}
                            aria-label={isControlsVisible ? "Close filters and search" : "Open filters and search"}
                        >
                            {isControlsVisible ? <FaTimes /> : <FaFilter />} 
                        </button>
                    </div>
                </div>
                
                {/* CONTROLS BLOCK */}
                <div className={`product-controls ${isControlsVisible ? 'open' : ''}`}>
                    
                    {/* Filter by Subcollection */}
                    <div className="filter-group">
                        <label htmlFor="subcollection-select">Filter:</label>
                        <select 
                            id="subcollection-select" 
                            value={selectedSubcollectionId} 
                            onChange={(e) => {
                                // Trigger the fetch by changing the ID
                                setSelectedSubcollectionId(e.target.value);
                            }}
                        >
                            <option 
                                value="all" 
                                disabled
                            >
                                {subcollections.length === 0 ? 'No Categories Found' : 'Select a Subcollection'}
                            </option>
                            {subcollections.map(sub => (
                                <option key={sub.id} value={sub.id}>
                                    {sub.name}
                                </option>
                            ))}
                        </select>
                    </div>
                         {selectedSubcollectionId !== 'all' && (
    <div className="filter-group">
        <button 
            // 🌟 CHANGE THE HANDLER 🌟
            onClick={handleGeneratePDF}
            disabled={isFetchingMore || isLoadingProducts}
            className="download-btn"
            title={`Generate PDF catalog for ${subcollectionsMap[selectedSubcollectionId]?.name || 'category'}`}
        >
            {/* You can still use the FaDownload icon */}
            <FaDownload /> 
            {/* 🌟 CHANGE THE TEXT 🌟 */}
            {isFetchingMore ? 'Preparing PDF...' : 'Generate PDF'}
        </button>
    </div>
)}
                    
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
                {sortedProducts.length === 0 && !isLoadingProducts && !isFetchingMore ? (
                    <p className="no-products-message">
                        No products found for this selection. Please select a subcollection or adjust your filters.
                    </p>
                ) : (
                    <div className="products-grid collections-grid">
                        {sortedProducts.map((product) => {
                            const price = getProductPrice(product, subcollectionsMap, userRole, cart);
                            const subcollection = subcollectionsMap[product.subcollectionId];
                            const tieredPricing = subcollection 
                                ? subcollection.tieredPricing[userRole === 'wholesaler' ? 'wholesale' : 'retail']
                                : null;

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
// NewArrivalsSection.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { db, collectionGroup, getDocs, query, where } from '../firebase'; 
import { Link } from 'react-router-dom';
import './NewArrivalsSection.css'; // Keep the import for aesthetic styles like hover/shadows

const NEW_ARRIVAL_TAG = 'new_arrival';

// Function to calculate a semi-random height multiplier for visual diversity
const calculateRandomHeight = (index) => {
    // Multipliers to ensure different visual sizes (e.g., 90%, 110%, 125% of base height)
    const multipliers = [0.9, 1.1, 1.25, 1.0, 1.15, 0.85, 1.3]; 
    const baseHeight = 250; // Base height in pixels
    // Use the index to cycle through multipliers for a consistent, but varied, look
    return `${baseHeight * multipliers[index % multipliers.length]}px`;
};

const NewArrivalsSection = () => { 
    const [newArrivals, setNewArrivals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Memoize the fetched data and pre-calculate the random heights
    const productData = useMemo(() => {
        return newArrivals.map((product, index) => ({
            ...product,
            imageUrl: product.image || (product.images && product.images[0]?.url),
            productPrice: product.price != null ? product.price.toFixed(2) : 'N/A',
            randomHeight: calculateRandomHeight(index), // Pre-calculate height
            itemIndex: index
        })).filter(p => p.imageUrl); // Filter out products without an image
    }, [newArrivals]);


    useEffect(() => {
        const fetchNewArrivals = async () => {
            setIsLoading(true);
            // ... (Firebase fetch logic remains the same) ...
            try {
                const productsRef = collectionGroup(db, 'products');
                const q = query(
                    productsRef, 
                    where('tags', 'array-contains', NEW_ARRIVAL_TAG)
                );
                const querySnapshot = await getDocs(q);
                
                const fetchedProducts = querySnapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                }));
                setNewArrivals(fetchedProducts);
            } catch (error) {
                console.error("Error fetching New Arrivals:", error);
            }
            setIsLoading(false);
        };
        fetchNewArrivals();
    }, []); 

    if (isLoading || productData.length === 0) {
        return null; 
    }

    return (
        <div className="jewel-grid-section masonry-ui">
            <h3>New Arrivals ✨</h3>
            
            {/* ⚠️ CRITICAL: INLINE MASONRY STYLES on the container to prevent conflicts ⚠️ */}
            <div 
                className="jewel-grid-container"
                style={{
                    // These styles enforce the Masonry/CSS Columns on Desktop
                    columnCount: 4,     // The number of columns for desktop
                    columnGap: '15px',  // Spacing between columns
                }}
            >
                {productData.map((product) => (
                    <Link 
                        to={`/products/${product.id}`} 
                        key={product.id} 
                        className="jewel-grid-tile" 
                        title={product.productName}
                        // ⚠️ CRITICAL: INLINE MASONRY STYLES on the individual tile ⚠️
                        style={{ 
                            '--item-index': product.itemIndex,
                            display: 'inline-block', // MUST be inline-block for CSS columns
                            width: '100%', 
                            marginBottom: '15px', 
                            breakInside: 'avoid',   // MUST be avoid for masonry look
                            
                            // 💥 FORCED VISUAL HEIGHT DIVERSITY 💥
                            height: product.randomHeight, //
                        }} 
                    >
                        {/* New class: jewel-tile-img-wrapper */}
                        <div 
                            className="jewel-tile-img-wrapper"
                            style={{height: '100%'}} // Take up the forced height
                        > 
                            <img 
                                src={product.imageUrl} 
                                alt={product.productName} 
                                className="jewel-tile-img" 
                                loading="lazy" 
                                onError={(e) => {
                                    e.target.onerror = null; 
                                    e.target.src = `https://placehold.co/400x500/cccccc/333333?text=${product.productName.substring(0, 10)}`;
                                }}
                            />
                        </div>

                        {/* New class: jewel-tile-info-overlay */}
                        <div className="jewel-tile-info-overlay">
                            <span className="jewel-info-name">{product.productName}</span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default NewArrivalsSection;
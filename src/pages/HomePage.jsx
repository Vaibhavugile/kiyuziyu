// src/pages/HomePage.jsx - UPDATED

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, collection, getDocs } from '../firebase';
import CollectionCard from '../components/CollectionCard';
import BrowseCollectionSection from '../components/BrowseCollectionSection';
import HeroSection from '../components/HeroSection';
import BestSellersSection from '../components/BestSellersSection'; 
import NewArrivalsSection from '../components/NewArrivalsSection'; 
import TrendingSection from '../components/TrendingSection'; // <<< NEW IMPORT
import './HomePage.css';

const HomePage = () => {
  // ... (Collections state and useEffect remain for the Featured Collections section)
  const [collections, setCollections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // ... (logic to fetch collections for the 'Featured Collections' grid)
    const fetchCollections = async () => {
      setIsLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "collections"));
        const fetchedCollections = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        }));
        setCollections(fetchedCollections.sort((a, b) => a.showNumber - b.showNumber));
      } catch (error) {
        console.error("Error fetching collections:", error);
      }
      setIsLoading(false);
    };

    fetchCollections();
  }, []);


  return (
    <>
      <HeroSection />
      {/* ... Featured Collections Section ... */}
      <div className="collections-section">
        <h3>Featured Collections</h3>
        {isLoading ? (
          <p>Loading collections...</p>
        ) : (
          <div className="collections-grid">
            {collections.map((item) => (
              <Link to={`/collections/${item.id}/all-products`} key={item.id} style={{ display: 'contents' }}>
                <CollectionCard title={item.title} image={item.image} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* <<< ADDED TRENDING SECTION */}
      <TrendingSection /> 

      {/* New Arrivals Section */}
      <NewArrivalsSection /> 

      <BestSellersSection />
      <BrowseCollectionSection />
    </>
  );
};

export default HomePage;
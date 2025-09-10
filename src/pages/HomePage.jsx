import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, collection, getDocs } from '../firebase';
import CollectionCard from '../components/CollectionCard';
import BrowseCollectionSection from '../components/BrowseCollectionSection';
import HeroSection from '../components/HeroSection';

const HomePage = () => {
  const [collections, setCollections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
      <div className="collections-section">
        <h3>Featured Collections</h3>
        {isLoading ? (
          <p>Loading collections...</p>
        ) : (
          <div className="collections-grid">
            {collections.map((item) => (
              // This is the updated Link component to a new URL
              <Link to={`/collections/${item.id}/all-products`} key={item.id}>
                <CollectionCard title={item.title} image={item.image} />
              </Link>
            ))}
          </div>
        )}
      </div>
      <BrowseCollectionSection />
    </>
  );
};

export default HomePage;
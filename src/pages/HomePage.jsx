import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // New: Import Link for navigation
import { db, collection, getDocs } from '../firebase'; // Import db, collection, getDocs
import CollectionCard from '../components/CollectionCard';
import BrowseCollectionSection from '../components/BrowseCollectionSection';
import HeroSection from '../components/HeroSection';
// import Footer from '../components/Footer'; // Removed: Footer is now global in App.jsx

const HomePage = () => {
  const [collections, setCollections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch collections from Firebase on component mount
  useEffect(() => {
    const fetchCollections = async () => {
      setIsLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "collections"));
        const fetchedCollections = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id // Ensure ID is included for routing
        }));
        // Sort collections by showNumber before setting them
        setCollections(fetchedCollections.sort((a, b) => a.showNumber - b.showNumber));
      } catch (error) {
        console.error("Error fetching collections:", error);
      }
      setIsLoading(false);
    };

    fetchCollections();
  }, []); // Empty dependency array means this runs once on mount

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
              // New: Wrap each CollectionCard in a Link component
              <Link to={`/collections/${item.id}`} key={item.id}>
                <CollectionCard title={item.title} image={item.image} />
              </Link>
            ))}
          </div>
        )}
      </div>
      <BrowseCollectionSection />
      {/* <Footer /> */} {/* Removed: Footer is now rendered globally by App.jsx */}
    </>
  );
};

export default HomePage;

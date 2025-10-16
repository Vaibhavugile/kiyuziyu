import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, collection, getDocs } from '../firebase';
import CollectionCard from '../components/CollectionCard';
import BrowseCollectionSection from '../components/BrowseCollectionSection';
import HeroSection from '../components/HeroSection';
import BestSellersSection from '../components/BestSellersSection';
import NewArrivalsSection from '../components/NewArrivalsSection';
import TrendingSection from '../components/TrendingSection';
import './HomePage.css';

const HomePage = () => {
  const [collections, setCollections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCollections = async () => {
      setIsLoading(true);
      try {
        const qSnap = await getDocs(collection(db, 'collections'));
        const fetched = qSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // safe sort if showNumber missing
        fetched.sort((a, b) => (a.showNumber || 0) - (b.showNumber || 0));
        setCollections(fetched);
      } catch (err) {
        console.error('Error fetching collections:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollections();
  }, []);
    // after your fetch useEffect, inside HomePage:
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const observerOpts = {
      root: null,
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.08,
    };
    const revealCb = (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal');
          obs.unobserve(entry.target);
        }
      });
    };
    const io = new IntersectionObserver(revealCb, observerOpts);
    const nodes = document.querySelectorAll('.collection-link');
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [collections]); // run again if collections change


  return (
    <>
      <HeroSection />

      {/* Featured Collections */}
      <section className="collections-section" aria-labelledby="featured-collections-heading">
        <div className="collections-header">
          <h2 id="featured-collections-heading">Featured Collections</h2>
          <p className="collections-subtitle">Curated lines crafted with ethical gold and artisan finishes.</p>
        </div>

        {isLoading ? (
          <div className="collections-loading" aria-live="polite">
            Loading collections…
          </div>
        ) : (
          <div className="collections-grid" role="list">
            {collections.map((col) => (
              <Link
                to={`/collections/${col.id}/all-products`}
                key={col.id}
                className="collection-link"
                aria-label={`Open ${col.title} collection`}
              >
                <CollectionCard
                  id={col.id}
                  title={col.title || col.name}
                  description={col.subtitle || col.description || ''}
                  image={col.image}
                  alt={col.imageAlt || col.title || col.name}
                  startingPrice={col.startingPrice || col.starting_price || null}
                />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Trending / New / Bestsellers */}
      <TrendingSection />
      <NewArrivalsSection />
     

      {/* Browse Collections CTA */}
      
    </>
  );
};

export default HomePage;

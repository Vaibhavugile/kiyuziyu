import React, { useState, useEffect, useCallback } from 'react';

// Import your five images here (adjust paths/names as needed)
import heroImage1 from '../assets/h10.png'; 
import heroImage2 from '../assets/h11.png';
import heroImage3 from '../assets/h12.png';
import heroImage4 from '../assets/h16.png';
import heroImage5 from '../assets/h15.png';

const heroImages = [
  { url: heroImage1 },
  { url: heroImage2 },
  { url: heroImage3 },
  { url: heroImage4 },
  { url: heroImage5 },
];

const HeroSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const slideInterval = 5000; // Slide every 5 seconds

  const nextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => 
      (prevIndex === heroImages.length - 1 ? 0 : prevIndex + 1)
    );
  }, []);

  useEffect(() => {
    const timer = setInterval(nextSlide, slideInterval);
    // Clear the interval when the component unmounts
    return () => clearInterval(timer);
  }, [nextSlide]);

  // Function to jump to a specific slide
  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  return (
    <div className="hero-slider">
      
      {/* Background Image Container with Crossfade Effect */}
      {heroImages.map((image, index) => (
        <div 
          key={index}
          className={`hero-slide ${index === currentIndex ? 'active' : ''}`}
          style={{ backgroundImage: `url(${image.url})` }}
        >
          {/* Subtle Overlay for Mood/Depth */}
          <div className="hero-overlay-minimal"></div> 
        </div>
      ))}

      {/* Navigation Dots (REINTRODUCED) */}
      <div className="slider-dots">
        {heroImages.map((_, index) => (
          <span
            key={index}
            className={`dot ${index === currentIndex ? 'active' : ''}`}
            onClick={() => goToSlide(index)}
          ></span>
        ))}
      </div>
      
    </div>
  );
};

export default HeroSection;
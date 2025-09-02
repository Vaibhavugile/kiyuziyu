import React from 'react';
import heroVideo from '../assets/hero.mp4'; // place your video here

const HeroSection = () => {
  return (
    <div className="hero">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="hero-video"
      >
        <source src={heroVideo} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      
    </div>
  );
};

export default HeroSection;

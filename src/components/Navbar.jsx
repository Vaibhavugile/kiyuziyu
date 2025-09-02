import React from 'react';
import { Link } from 'react-router-dom'; // Import Link for routing
import MiniCart from './MiniCart'; // Import the MiniCart component
import logo from '../assets/logoj.png'; // your actual logo path
import '../App.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      {/* Left: Logo and Home Link */}
      <div className="navbar-left">
        <Link to="/">
          <img src={logo} alt="Kiyuziyu Logo" className="logo" />
        </Link>
      </div>

      {/* Center: Title */}
      <div className="navbar-center">
        <h1 className="navbar-title">Kiyuziyu</h1>
      </div>

      {/* Right: Nav Links and Mini Cart */}
      <ul className="navbar-right">
        <li><Link to="/">Home</Link></li>
        <li><Link to="/collections">Collections</Link></li>
        <li><Link to="/contact">Contact</Link></li>
        {/* Add the MiniCart component here */}
        <li><MiniCart /></li>
        <li><Link to="/login">Login</Link></li>
      </ul>
    </nav>
  );
};

export default Navbar;
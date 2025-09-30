// src/components/Navbar.jsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import MiniCart from './MiniCart';
import logo from '../assets/logoj.png';
import '../App.css';
import { useAuth } from './AuthContext';
import { FaUserCircle } from 'react-icons/fa';
import logo1 from '../assets/logotext.png';

const Navbar = () => {
  // Add useState to manage the dropdown's state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Add `logout` to the useAuth hook
  const { currentUser, userRole, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      setIsDropdownOpen(false); // Close dropdown after signing out
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/">
          <img src={logo} alt="Kiyuziyu Logo" className="logo" />
        </Link>
      </div>

      <div className="navbar-center">
        <h1 className="navbar-title"><img src={logo1} alt="Kiyuziyu" /></h1>
      </div>

      <ul className="navbar-right">
        <li><Link to="/">Home</Link></li>
        <li><Link to="/collections">Collections</Link></li>
        {currentUser && <li><Link to="/order-history">Order History</Link></li>}
        {userRole === 'admin' && <li><Link to="/admin">Admin</Link></li>}
        <li><MiniCart /></li>
        
        {/* Conditional rendering for Login or Profile Icon */}
        {/* {currentUser ? (
          <li className="profile-dropdown-container">
            <button
              className="profile-icon-btn"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              aria-label="User Profile"
            >
              <FaUserCircle size={24} />
            </button>
            {isDropdownOpen && (
              <div className="profile-dropdown-menu">
                <button onClick={handleLogout} className="dropdown-item">
                  Sign Out
                </button>
              </div>
            )}
          </li>
        ) : (
          <li>
            <Link to="/login">Login</Link>
          </li>
        )} */}
      </ul>
    </nav>
  );
};

export default Navbar;
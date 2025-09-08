// src/components/Navbar.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import MiniCart from './MiniCart';
import logo from '../assets/logoj.png';
import '../App.css';
import { useAuth } from './AuthContext';
import { FaUserCircle } from 'react-icons/fa'; // Import the user icon

const Navbar = () => {
  const { currentUser, userRole } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/">
          <img src={logo} alt="Kiyuziyu Logo" className="logo" />
        </Link>
      </div>

      <div className="navbar-center">
        <h1 className="navbar-title">Kiyuziyu</h1>
      </div>

      <ul className="navbar-right">
        <li><Link to="/">Home</Link></li>
        <li><Link to="/collections">Collections</Link></li>
        {currentUser && <li><Link to="/order-history">Order History</Link></li>}
        {userRole === 'admin' && <li><Link to="/admin">Admin</Link></li>}
        <li><MiniCart /></li>
        {currentUser ? (
          <li>
            <Link to="/login">
              <FaUserCircle size={24} />
            </Link>
          </li>
        ) : (
          <li>
            <Link to="/login">Login</Link>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
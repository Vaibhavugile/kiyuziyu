// src/components/Navbar.jsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import MiniCart from './MiniCart';
import logo from '../assets/logoj.png'; // your circular logo
import '../App.css';
import { useAuth } from './AuthContext';
import { FaUserCircle } from 'react-icons/fa'; // Animated layout icon
import logo1 from '../assets/logotext.png'; // your text logo

const Navbar = () => {
    // State to manage the profile dropdown's visibility
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
                    {/* The logo height is controlled by CSS */}
                    <img src={logo} alt="Kiyuziyu Logo" className="logo" />
                </Link>
            </div>

            <div className="navbar-center">
                <h1 className="navbar-title"><img src={logo1} alt="Kiyuziyu" className="navbar-text-logo" /></h1>
            </div>

            <ul className="navbar-right">
                {/* Desktop Links (Hidden on Mobile) */}
                <li className="nav-link-item"><Link to="/">Home</Link></li>
                <li className="nav-link-item"><Link to="/collections">Collections</Link></li>
                {currentUser && <li className="nav-link-item"><Link to="/order-history">Order History</Link></li>}
                {userRole === 'admin' && <li className="nav-link-item"><Link to="/admin">Admin</Link></li>}
                
                {/* Always visible icons (MiniCart is another icon) */}
                <li><MiniCart /></li>
                
                {/* Profile Icon and Dropdown */}
                {currentUser ? (
                    <li className="profile-dropdown-container">
                        <button
                            className="profile-icon-btn"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            aria-label="User Profile"
                        >
                            <FaUserCircle size={24} /> {/* Animated Profile Icon */}
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
                    <li className="nav-link-item">
                        <Link to="/login">Login</Link>
                    </li>
                )}
            </ul>
        </nav>
    );
};

export default Navbar;
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import SubcollectionsPage from './pages/SubcollectionsPage';
import ProductsPage from './pages/ProductsPage';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { CartProvider } from './components/CartContext'; // Import the CartProvider
import CartPage from './pages/CartPage';
function App() {
  return (
    // Wrap the entire app with CartProvider
    <CartProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/collections/:collectionId" element={<SubcollectionsPage />} />
          <Route path="/collections/:collectionId/subcollections/:subcollectionId" element={<ProductsPage />} />
          <Route path="/cart" element={<CartPage />} /> 
        </Routes>
        <Footer />
      </Router>
    </CartProvider>
  );
}

export default App;
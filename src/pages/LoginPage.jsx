import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate for redirection
import {
  auth,
  db,
  collection,
  setDoc, // For storing user profiles
  doc, // For specifying document ID
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from '../firebase'; // Import auth and Firestore functions
import '../styles/LoginPage.css';

const countryCodes = [
  { code: '+91', country: 'India' },
  { code: '+1', country: 'USA' },
  { code: '+44', country: 'UK' },
  { code: '+86', country: 'China' },
  { code: '+49', country: 'Germany' },
  // Add more country codes as needed
];

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate(); // Initialize useNavigate hook

  // State for Login form
  const [loginMobile, setLoginMobile] = useState('');
  const [loginCountryCode, setLoginCountryCode] = useState('+91');
  const [loginPassword, setLoginPassword] = useState('');

  // State for Sign-up form
  const [signupName, setSignupName] = useState('');
  const [signupMobile, setSignupMobile] = useState('');
  const [signupCountryCode, setSignupCountryCode] = useState('+91');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupCity, setSignupCity] = useState('');
  const [signupCountry, setSignupCountry] = useState('');
  const [signupRole, setSignupRole] = useState('retailer'); // New state for role, default to 'retailer'

  // State to manage feedback messages
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setMessage(''); // Clear previous messages
    setMessageType('');

    // Firebase Authentication uses email, so we combine mobile and a placeholder domain
    const email = `${loginCountryCode}${loginMobile}@example.com`;

    try {
      await signInWithEmailAndPassword(auth, email, loginPassword);
      setMessage('Login successful! Redirecting...');
      setMessageType('success');
      setTimeout(() => {
        navigate('/'); // Redirect to homepage after successful login
      }, 1500);
    } catch (error) {
      console.error("Error logging in:", error.code, error.message);
      setMessage(`Login failed: ${error.message}`);
      setMessageType('error');
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setMessage(''); // Clear previous messages
    setMessageType('');

    // Firebase Authentication uses email, so we combine mobile and a placeholder domain
    const email = `${signupCountryCode}${signupMobile}@example.com`;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, signupPassword);
      const user = userCredential.user;

      // Store additional user details in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: signupName,
        mobile: signupMobile,
        countryCode: signupCountryCode,
        city: signupCity,
        country: signupCountry,
        role: signupRole, // Store the selected role
        email: email, // Store the generated email for reference
        createdAt: new Date(),
      });

      setMessage('Account created successfully! Please log in.');
      setMessageType('success');
      // Optionally switch to login form after successful signup
      setTimeout(() => {
        setIsLogin(true);
        setMessage(''); // Clear message when switching forms
        setMessageType('');
      }, 2000);
    } catch (error) {
      console.error("Error signing up:", error.code, error.message);
      setMessage(`Sign up failed: ${error.message}`);
      setMessageType('error');
    }
  };

  return (
    <div className="login-container">
      <div className="form-toggle">
        <button
          className={isLogin ? 'active' : ''}
          onClick={() => {
            setIsLogin(true);
            setMessage('');
            setMessageType('');
          }}
        >
          Login
        </button>
        <button
          className={!isLogin ? 'active' : ''}
          onClick={() => {
            setIsLogin(false);
            setMessage('');
            setMessageType('');
          }}
        >
          Sign Up
        </button>
      </div>

      {/* Display message */}
      {message && <div className={`message ${messageType}`}>{message}</div>}

      {isLogin ? (
        <form className="login-form" onSubmit={handleLoginSubmit}>
          <h2>Log In</h2>
          <div className="form-group mobile-input-group">
            <label htmlFor="login-mobile">Mobile Number</label>
            <div className="input-with-dropdown">
              <select
                className="country-code-dropdown"
                value={loginCountryCode}
                onChange={(e) => setLoginCountryCode(e.target.value)}
              >
                {countryCodes.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.country})
                  </option>
                ))}
              </select>
              <input
                type="tel"
                id="login-mobile"
                value={loginMobile}
                onChange={(e) => setLoginMobile(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              type="password"
              id="login-password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="login-button">
            Log In
          </button>
        </form>
      ) : (
        <form className="login-form" onSubmit={handleSignupSubmit}>
          <h2>Sign Up</h2>
          <div className="form-group">
            <label htmlFor="signup-name">Name</label>
            <input
              type="text"
              id="signup-name"
              value={signupName}
              onChange={(e) => setSignupName(e.target.value)}
              required
            />
          </div>
          <div className="form-group mobile-input-group">
            <label htmlFor="signup-mobile">Mobile Number</label>
            <div className="input-with-dropdown">
              <select
                className="country-code-dropdown"
                value={signupCountryCode}
                onChange={(e) => setSignupCountryCode(e.target.value)}
              >
                {countryCodes.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.country})
                  </option>
                ))}
              </select>
              <input
                type="tel"
                id="signup-mobile"
                value={signupMobile}
                onChange={(e) => setSignupMobile(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="signup-password">Password</label>
            <input
              type="password"
              id="signup-password"
              value={signupPassword}
              onChange={(e) => setSignupPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="signup-city">City</label>
            <input
              type="text"
              id="signup-city"
              value={signupCity}
              onChange={(e) => setSignupCity(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="signup-country">Country</label>
            <input
              type="text"
              id="signup-country"
              value={signupCountry}
              onChange={(e) => setSignupCountry(e.target.value)}
              required
            />
          </div>
          {/* New Role Dropdown */}
          <div className="form-group">
            <label htmlFor="signup-role">Role</label>
            <select
              id="signup-role"
              className="form-control" // You might want to style this class in LoginPage.css
              value={signupRole}
              onChange={(e) => setSignupRole(e.target.value)}
              required
            >
              <option value="retailer">Retailer</option>
              <option value="wholesaler">Wholesaler</option>
            </select>
          </div>
          <button type="submit" className="login-button">
            Sign Up
          </button>
        </form>
      )}
    </div>
  );
};

export default LoginPage;

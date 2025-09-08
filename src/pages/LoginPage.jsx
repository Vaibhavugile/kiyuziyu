import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  auth,
  db,
  doc,
  setDoc,
  onAuthStateChanged,
  RecaptchaVerifier,
  getDoc,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from '../firebase';
import '../styles/LoginPage.css';

const countryCodes = [
    { code: "+91", name: "India" },
    { code: "+1", name: "United States" },
    { code: "+44", name: "United Kingdom" },
    { code: "+61", name: "Australia" },
  ];


const LoginPage = () => {
  // State for login form
  const [loginCountryCode, setLoginCountryCode] = useState('+91');
  const [loginMobile, setLoginMobile] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // State for signup form
  const [signupCountryCode, setSignupCountryCode] = useState('+91');
  const [signupMobile, setSignupMobile] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
//     onAuthStateChanged(auth, (user) => {
//       if (user) {
//         navigate('/'); // Change this line to navigate to the homepage
//       }
//     });

    if (!isLogin) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'invisible',
        });
    }
  }, [isLogin, navigate]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('Logging in...');
    try {
      const email = `${loginCountryCode.replace('+', '')}${loginMobile}@example.com`;
      await signInWithEmailAndPassword(auth, email, loginPassword);
      setInfo('Login successful! Redirecting...');
      setTimeout(() => navigate('/'), 1000); // Change this line to navigate to the homepage
    } catch (err) {
      console.error('Error logging in:', err);
      setError('Login failed. Please check your mobile number and password.');
      setInfo('');
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('Signing up...');
    
    const email = `${signupCountryCode.replace('+', '')}${signupMobile}@example.com`;
    const password = signupPassword;

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setInfo('');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user role to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        mobile: `${signupCountryCode}${signupMobile}`,
        role: 'retailer', // Set a default role
      });
      
      setInfo('Account created successfully! Redirecting...');
      setTimeout(() => navigate('/'), 1000);
    } catch (err) {
      console.error('Error signing up:', err);
      setError(`Signup failed: ${err.message}`);
      setInfo('');
    }
  };

  const handleToggleForm = () => {
    setIsLogin(!isLogin);
    setError('');
    setInfo('');
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>Login Page</h1>
        {error && <p className="error-message">{error}</p>}
        {info && <p className="info-message">{info}</p>}
        
        {isLogin ? (
          // Login Form
          <form onSubmit={handleLoginSubmit}>
            <h2>Login</h2>
            <div className="form-group">
                <label htmlFor="login-country-code">Country</label>
                <select
                    id="login-country-code"
                    value={loginCountryCode}
                    onChange={(e) => setLoginCountryCode(e.target.value)}
                >
                    {countryCodes.map((cc) => (
                        <option key={cc.code} value={cc.code}>
                            {cc.name} ({cc.code})
                        </option>
                    ))}
                </select>
            </div>
            <div className="form-group">
              <label htmlFor="login-mobile">Mobile Number</label>
              <input
                type="tel"
                id="login-mobile"
                value={loginMobile}
                onChange={(e) => setLoginMobile(e.target.value)}
                placeholder="Enter mobile number"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <input
                type="password"
                id="login-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Password"
                required
              />
            </div>
            <button type="submit" className="login-button">
              Login
            </button>
          </form>
        ) : (
          // Sign Up Form
          <form onSubmit={handleSignupSubmit}>
            <h2>Sign Up</h2>
            <div className="form-group">
                <label htmlFor="signup-country-code">Country</label>
                <select
                    id="signup-country-code"
                    value={signupCountryCode}
                    onChange={(e) => setSignupCountryCode(e.target.value)}
                >
                    {countryCodes.map((cc) => (
                        <option key={cc.code} value={cc.code}>
                            {cc.name} ({cc.code})
                        </option>
                    ))}
                </select>
            </div>
            <div className="form-group">
              <label htmlFor="signup-mobile">Mobile Number</label>
              <input
                type="tel"
                id="signup-mobile"
                value={signupMobile}
                onChange={(e) => setSignupMobile(e.target.value)}
                placeholder="Enter mobile number"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="signup-password">Password</label>
              <input
                type="password"
                id="signup-password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
              />
            </div>
            {/* The role selection is removed from the signup form */}
            <button type="submit" className="login-button">
              Sign Up
            </button>
          </form>
        )}
        <div id="recaptcha-container"></div>
        <p className="toggle-text">
          {isLogin ? (
            <>
              Don't have an account?{' '}
              <span onClick={handleToggleForm}>Sign Up</span>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <span onClick={handleToggleForm}>Login</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
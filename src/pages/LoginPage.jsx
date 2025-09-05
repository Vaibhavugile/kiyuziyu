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
  createUserWithEmailAndPassword, // Ensure this is imported
  signInWithEmailAndPassword,     // Ensure this is imported
} from '../firebase';
import '../styles/LoginPage.css';

// ... (other imports and countryCodes remain the same)
const countryCodes = [
    { code: "+91", name: "India" },
    { code: "+1", name: "United States" },
    { code: "+44", name: "United Kingdom" },
    { code: "+61", name: "Australia" },
    // Add more country codes as needed
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
  const [signupRole, setSignupRole] = useState('retailer');

  const [isLogin, setIsLogin] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);

  const navigate = useNavigate();

  // useEffect to setup the RecaptchaVerifier
  useEffect(() => {
    // Check if re-captcha container already exists to prevent duplication
    if (!document.getElementById('recaptcha-container')) {
      const appVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response) => {
          console.log('Recaptcha resolved');
        },
        'expired-callback': () => {
          console.log('Recaptcha expired');
        }
      });
      setRecaptchaVerifier(appVerifier);
    }
  }, []);

  // Use useEffect to handle auth state changes and redirection
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // if (user) {
      //   // User is logged in, redirect to the home page after a small delay
      //   setTimeout(() => {
      //     navigate('/');
      //   }, 1000);
      // }
    });

    return unsubscribe;
  }, [navigate]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('Logging in...');

    // The email must be constructed in the same way it was during signup
    const email = `${loginCountryCode.replace('+', '')}${loginMobile}@example.com`;
    const password = loginPassword;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setInfo('Login successful! Redirecting...');
    } catch (err) {
      console.error('Error logging in:', err);
      setError(`Login failed: ${err.message}`);
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
        role: signupRole,
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
    <div className="login-container">
      <div className="login-box">
        <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
        {error && <p className="error-message">{error}</p>}
        {info && <p className="info-message">{info}</p>}
        {isLogin ? (
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label htmlFor="login-mobile">Mobile Number</label>
              <div className="mobile-input-group">
                <select
                  value={loginCountryCode}
                  onChange={(e) => setLoginCountryCode(e.target.value)}
                  className="country-code-select"
                >
                  {countryCodes.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.name})
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  id="login-mobile"
                  value={loginMobile}
                  onChange={(e) => setLoginMobile(e.target.value)}
                  placeholder="Enter mobile number"
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
                placeholder="Enter password"
                required
              />
            </div>
            <button type="submit" className="login-button">
              Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignupSubmit}>
            <div className="form-group">
              <label htmlFor="signup-mobile">Mobile Number</label>
              <div className="mobile-input-group">
                <select
                  value={signupCountryCode}
                  onChange={(e) => setSignupCountryCode(e.target.value)}
                  className="country-code-select"
                >
                  {countryCodes.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.name})
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  id="signup-mobile"
                  value={signupMobile}
                  onChange={(e) => setSignupMobile(e.target.value)}
                  placeholder="Enter mobile number"
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
                placeholder="At least 6 characters"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="signup-role">Role</label>
              <select
                id="signup-role"
                value={signupRole}
                onChange={(e) => setSignupRole(e.target.value)}
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

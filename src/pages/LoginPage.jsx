import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  auth,
  db,
  doc,
  setDoc,
  signInWithPhoneNumber,
  onAuthStateChanged,
  signOut,
  getDoc,
  RecaptchaVerifier, // Ensure this is imported
} from '../firebase';

import '../styles/LoginPage.css';

const countryCodes = [
  { code: '+91', country: 'India' },
  { code: '+1', country: 'USA' },
  { code: '+44', country: 'UK' },
];

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const [loginPhoneNumber, setLoginPhoneNumber] = useState('');
  const [loginCountryCode, setLoginCountryCode] = useState('+91');
  const [signupPhoneNumber, setSignupPhoneNumber] = useState('');
  const [signupCountryCode, setSignupCountryCode] = useState('+91');
  const [signupName, setSignupName] = useState('');
  const [signupRole, setSignupRole] = useState('retailer');
  const [verificationCode, setVerificationCode] = useState('');

  const [isVerifying, setIsVerifying] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // We will initialize the verifier inside a useEffect hook
  // to ensure the DOM element exists.
  useEffect(() => {
    // Check if reCAPTCHA has already been initialized
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible', // This makes the reCAPTCHA invisible
        'callback': (response) => {
          // reCAPTCHA solved, allows you to proceed with phone sign-in
          console.log("reCAPTCHA solved, response:", response);
        },
        'expired-callback': () => {
          console.log("reCAPTCHA expired.");
        }
      });
    }

    // Cleanup function to clear reCAPTCHA when the component unmounts
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        delete window.recaptchaVerifier;
      }
    };
  }, []);

  const handleSendCode = async (fullPhoneNumber) => {
    setError('');
    setInfo('');
    setIsSendingCode(true);

    if (!window.recaptchaVerifier) {
      setError('reCAPTCHA not initialized. Please refresh the page.');
      setIsSendingCode(false);
      return;
    }

    try {
      // The signInWithPhoneNumber function requires the auth instance,
      // the phone number, and the recaptchaVerifier instance.
      const result = await signInWithPhoneNumber(auth, fullPhoneNumber, window.recaptchaVerifier);

      setConfirmationResult(result);
      setIsVerifying(true);
      setInfo('Verification code sent! Please check your phone.');

    } catch (err) {
      console.error("Error sending code:", err);
      setError(`Failed to send code: ${err.message}`);
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async (fullPhoneNumber) => {
    setError('');
    setInfo('');

    if (!confirmationResult || !verificationCode) {
      setError('Please enter the verification code.');
      return;
    }

    try {
      const userCredential = await confirmationResult.confirm(verificationCode);
      const user = userCredential.user;

      if (!isLogin) {
        await setDoc(doc(db, 'users', user.uid), {
          name: signupName,
          phoneNumber: fullPhoneNumber,
          role: signupRole,
          createdAt: new Date(),
        });
        setInfo('Sign-up successful! Redirecting...');
      } else {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          console.warn('User found in auth but not in Firestore. Redirecting to sign-up.');
          await signOut(auth);
          setIsLogin(false);
          setSignupPhoneNumber(loginPhoneNumber);
          setSignupCountryCode(loginCountryCode);
          setError('User profile not found. Please sign up.');
          return;
        }
        setInfo('Login successful! Redirecting...');
      }

      navigate('/');

    } catch (err) {
      console.error("Error verifying code:", err);
      setError(`Verification failed: ${err.message}`);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const fullPhoneNumber = `${loginCountryCode}${loginPhoneNumber}`;
    await handleSendCode(fullPhoneNumber);
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    const fullPhoneNumber = `${signupCountryCode}${signupPhoneNumber}`;
    await handleSendCode(fullPhoneNumber);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h2>{isLogin ? 'Login to your Account' : 'Create an Account'}</h2>
        {error && <p className="error-message">{error}</p>}
        {info && <p className="info-message">{info}</p>}

        {!isVerifying ? (
          <>
            {isLogin ? (
              <form onSubmit={handleLoginSubmit}>
                {/* ... (login form fields) ... */}
                <div className="form-group">
                  <label htmlFor="login-phone">Phone Number</label>
                  <div className="phone-input-group">
                    <select
                      id="login-country-code"
                      value={loginCountryCode}
                      onChange={(e) => setLoginCountryCode(e.target.value)}
                    >
                      {countryCodes.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.country} ({c.code})
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      id="login-phone"
                      value={loginPhoneNumber}
                      onChange={(e) => setLoginPhoneNumber(e.target.value)}
                      placeholder="Enter phone number"
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="login-button" disabled={isSendingCode}>
                  {isSendingCode ? 'Sending Code...' : 'Send Login Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignupSubmit}>
                {/* ... (signup form fields) ... */}
                <div className="form-group">
                  <label htmlFor="signup-name">Full Name</label>
                  <input
                    type="text"
                    id="signup-name"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="signup-phone">Phone Number</label>
                  <div className="phone-input-group">
                    <select
                      id="signup-country-code"
                      value={signupCountryCode}
                      onChange={(e) => setSignupCountryCode(e.target.value)}
                    >
                      {countryCodes.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.country} ({c.code})
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      id="signup-phone"
                      value={signupPhoneNumber}
                      onChange={(e) => setSignupPhoneNumber(e.target.value)}
                      placeholder="Enter phone number"
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="signup-role">Role</label>
                  <select
                    id="signup-role"
                    value={signupRole}
                    onChange={(e) => setSignupRole(e.target.value)}
                    required
                  >
                    <option value="retailer">Retailer</option>
                    <option value="wholesaler">Wholesaler</option>
                  </select>
                </div>
                <button type="submit" className="login-button" disabled={isSendingCode}>
                  {isSendingCode ? 'Sending Code...' : 'Send Sign Up Code'}
                </button>
              </form>
            )}
            {/* The reCAPTCHA container MUST be rendered for the verifier to attach to it */}
            <div id="recaptcha-container"></div>
          </>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handleVerifyCode(isLogin ? `${loginCountryCode}${loginPhoneNumber}` : `${signupCountryCode}${signupPhoneNumber}`); }}>
            {/* ... (verification form fields) ... */}
            <div className="form-group">
              <label htmlFor="verification-code">Verification Code</label>
              <input
                type="text"
                id="verification-code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                required
              />
            </div>
            <button type="submit" className="login-button">
              Verify Code
            </button>
          </form>
        )}

        <p className="toggle-text">
          {isLogin ? (
            <>
              Don't have an account?{' '}
              <span onClick={() => {
                setIsLogin(false);
                setIsVerifying(false);
                setInfo('');
                setError('');
              }}>Sign Up</span>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <span onClick={() => {
                setIsLogin(true);
                setIsVerifying(false);
                setInfo('');
                setError('');
              }}>Login</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
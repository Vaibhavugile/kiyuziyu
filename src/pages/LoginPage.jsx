import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  auth,
  db,
  doc,
  setDoc,
  getDoc,
  RecaptchaVerifier,
  signInAnonymously,
  // 👇 REQUIRED NEW FIRESTORE IMPORTS
  collection, 
  query, 
  where, 
  getDocs,
} from '../firebase';
import '../styles/LoginPage.css';

const countryCodes = [
  { code: "+91", name: "India" },
  { code: "+1", name: "United States" },
  { code: "+44", name: "United Kingdom" },
  { code: "+61", name: "Australia" },
];

const FIREBASE_FUNCTION_URL = "https://us-central1-jewellerywholesale-2e57c.cloudfunctions.net/sendWhatsappOtp";

const LoginPage = () => {
  const [countryCode, setCountryCode] = useState('+91');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // States for Profile Setup
  const [userName, setUserName] = useState(''); 
  const [userAddress, setUserAddress] = useState(''); 
  const [userCountry, setUserCountry] = useState(countryCodes[0].name); 

  const navigate = useNavigate();
  
  // State to hold the user object after anonymous sign-in, before profile is created
  const [tempUser, setTempUser] = useState(null); 

  useEffect(() => {
    // Initialize the invisible reCAPTCHA verifier
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
    });
  }, []);

  const generateRandomOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setIsProcessing(true);

    if (!mobile) {
      setError('Please enter your mobile number.');
      setIsProcessing(false);
      return;
    }

    const fullMobileNumber = `${countryCode}${mobile}`;
    const otpValue = generateRandomOtp();

    try {
      setGeneratedOtp(otpValue);
      setInfo(`Sending OTP to ${fullMobileNumber}...`);

      const myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/json");

      const raw = JSON.stringify({
        "integrated_number": "15558299861",
        "content_type": "template",
        "payload": {
          "messaging_product": "whatsapp",
          "type": "template",
          "template": {
            "name": "kiyuotp",
            "language": { "code": "en", "policy": "deterministic" },
            "namespace": "60cbb046_c34d_4f04_8c62_2cb720ccf00d",
            "to_and_components": [{
              "to": [fullMobileNumber.replace('+', '')],
              "components": {
                "body_1": { "type": "text", "value": otpValue },
                "button_1": { 
                    "subtype": "url", 
                    "type": "text", 
                    "value": otpValue 
                }
              }
            }]
          }
        }
      });

      const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
      };

      const response = await fetch(FIREBASE_FUNCTION_URL, requestOptions);
      const result = await response.json();
      
      if (response.ok && result.status === "success") { 
        setIsOtpSent(true);
        setInfo('OTP sent successfully. Please check your WhatsApp.');
      } else {
        setError(result.message || 'Failed to send OTP. Please check server logs.');
        console.error('API Error:', result);
      }
    } catch (err) {
      console.error('Error sending OTP:', err);
      setError('Failed to send OTP. Network error or function not accessible.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // 👇 CORRECTED: handleVerifyOtp function checks for profile existence via mobile number
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setIsProcessing(true);

    if (otp !== generatedOtp) {
        setError('Invalid OTP. Please try again.');
        setIsProcessing(false);
        return;
    }

    try {
      setInfo('OTP verified! Checking user status...');

      const fullMobileNumber = `${countryCode}${mobile}`;
      
      // 1. Check if a profile with this mobile number already exists in Firestore
      const usersCollectionRef = collection(db, 'users');
      // Create a query to search by the 'mobile' field
      const q = query(usersCollectionRef, where("mobile", "==", fullMobileNumber));
      const querySnapshot = await getDocs(q);

      // 2. Sign the user into a *new* anonymous session
      // This is necessary to satisfy AuthContext and create a current user session.
      const userCredential = await signInAnonymously(auth);
      const firebaseUser = userCredential.user;
      setTempUser(firebaseUser);

      if (!querySnapshot.empty) {
        // --- RETURNING USER (LOGIN) ---
        // A document with this mobile number already exists.
        
        // Update the existing user's document with the *new* anonymous UID.
        // This is crucial: we update the existing profile with the new UID
        // so AuthContext uses the right user document next time.
        const existingDoc = querySnapshot.docs[0];
        const existingDocRef = doc(db, 'users', existingDoc.id);

        await setDoc(existingDocRef, {
            uid: firebaseUser.uid, // Update to the current anonymous UID
            lastLogin: new Date(),
        }, { merge: true });

        setInfo('Welcome back! Logging in...');
        setTimeout(() => navigate('/'), 1000); // Redirect immediately

      } else {
        // --- NEW USER (SIGN UP) ---
        // No document found with this mobile number.
        setInfo('Verified! Now, please complete your profile.');

        // Create the initial minimal document using the new anonymous UID
        const newUserRef = doc(db, 'users', firebaseUser.uid); 
        await setDoc(newUserRef, {
            uid: firebaseUser.uid, 
            mobile: fullMobileNumber, 
            role: 'retailer', 
            createdAt: new Date(),
        });

        setIsOtpVerified(true); // Move to profile setup screen
      }

    } catch (err) {
      console.error('Error during login:', err);
      setError('An error occurred during sign-in. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 👇 handleProfileSetup function (unchanged from the working version)
  const handleProfileSetup = async (e) => {
      e.preventDefault();
      setError('');
      setInfo('');
      setIsProcessing(true);

      if (!userName || !userAddress || !userCountry) {
          setError('All profile fields are required.');
          setIsProcessing(false);
          return;
      }
      
      if (!tempUser) {
          setError('Authentication session lost. Please restart the process.');
          setIsProcessing(false);
          return;
      }

      try {
          setInfo('Saving profile...');
          // Use the UID from the anonymous session
          const userRef = doc(db, 'users', tempUser.uid); 
          
          // Update the existing document with full profile details
          await setDoc(userRef, {
              name: userName, 
              country: userCountry,
              address: userAddress,
          }, { merge: true }); 

          setInfo('Sign up successful! Redirecting...');
          setTimeout(() => navigate('/'), 1000);

      } catch (err) {
          console.error('Error during profile setup:', err);
          setError('An error occurred while saving your profile. Please try again.');
      } finally {
          setIsProcessing(false);
      }
  }
  
  // 👇 renderForm function (unchanged from the working version)
  const renderForm = () => {
    if (!isOtpSent) {
      // Form to get mobile number and send OTP
      return (
        <form onSubmit={handleSendOtp}>
          <h2>Login or Sign Up</h2>
          <div className="form-group">
            <label htmlFor="country-code">Country</label>
            <select
              id="country-code"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              disabled={isProcessing}
            >
              {countryCodes.map((cc) => (
                <option key={cc.code} value={cc.code}>
                  {cc.name} ({cc.code})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="mobile">Mobile Number</label>
            <input
              type="tel"
              id="mobile"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="Enter mobile number"
              required
              disabled={isProcessing}
            />
          </div>
          <button type="submit" className="login-button" disabled={isProcessing}>
            {isProcessing ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </form>
      );
    } else if (isOtpSent && !isOtpVerified) {
      // Form to verify OTP
      return (
        <form onSubmit={handleVerifyOtp}>
          <h2>Verify OTP</h2>
          <p>An OTP has been sent to {mobile}. Please enter it below.</p>
          <div className="form-group">
            <label htmlFor="otp">OTP</label>
            <input
              type="text"
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit OTP"
              required
              disabled={isProcessing}
            />
          </div>
          <button type="submit" className="login-button" disabled={isProcessing}>
            {isProcessing ? 'Verifying...' : 'Verify & Proceed'}
          </button>
        </form>
      );
    } else {
        // Profile Setup Form
        return (
            <form onSubmit={handleProfileSetup}>
                <h2>Complete Your Profile</h2>
                <p>One final step to get started!</p>
                <div className="form-group">
                    <label htmlFor="name">Full Name</label>
                    <input
                        type="text"
                        id="name"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="Your full name"
                        required
                        disabled={isProcessing}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="address">Address</label>
                    <input
                        type="text"
                        id="address"
                        value={userAddress}
                        onChange={(e) => setUserAddress(e.target.value)}
                        placeholder="Your full address"
                        required
                        disabled={isProcessing}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="profile-country">Country</label>
                    <select
                        id="profile-country"
                        value={userCountry}
                        onChange={(e) => setUserCountry(e.target.value)}
                        disabled={isProcessing}
                    >
                        {countryCodes.map((cc) => (
                            <option key={cc.code} value={cc.name}>
                                {cc.name}
                            </option>
                        ))}
                    </select>
                </div>
                <button type="submit" className="login-button" disabled={isProcessing}>
                    {isProcessing ? 'Saving...' : 'Finish Sign Up & Login'}
                </button>
            </form>
        );
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-image-section">
        <div className="logo">Your Logo Here</div>
        <p className="welcome-text">Welcome to your dashboard. We're happy to have you back!</p>
      </div>
      <div className="login-form-section">
        <div className="login-container">
          <h1>Welcome</h1>
          {error && <p className="error-message">{error}</p>}
          {info && <p className="info-message">{info}</p>}
          
          {renderForm()}
          
          <div id="recaptcha-container"></div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
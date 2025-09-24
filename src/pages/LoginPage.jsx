import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  auth,
  db,
  doc,
  setDoc,
  getDoc,
  RecaptchaVerifier,
} from '../firebase';
import '../styles/LoginPage.css';

const countryCodes = [
  { code: "+91", name: "India" },
  { code: "+1", name: "United States" },
  { code: "+44", name: "United Kingdom" },
  { code: "+61", name: "Australia" },
];

const LoginPage = () => {
  const [countryCode, setCountryCode] = useState('+91');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize the invisible reCAPTCHA verifier
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
    });
  }, []);

  const generateRandomOtp = () => {
    // Generate a random 6-digit number
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
      myHeaders.append("authkey", "468116AwggRESvY68bf021bP1"); // REPLACE WITH YOUR AUTH KEY

      const raw = JSON.stringify({
        "integrated_number": "15558299861", // The WhatsApp business number from your MSG91 account
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
                "button_1": { "subtype": "url", "type": "text", "value": "Go to Kiyuziyu" }
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

      // Changed to a relative path to use the proxy
      const response = await fetch("/api/v5/whatsapp/whatsapp-outbound-message/bulk/", requestOptions);
      const result = await response.json();
      
      if (result.type === "success") {
        setIsOtpSent(true);
        setInfo('OTP sent successfully. Please check your WhatsApp.');
      } else {
        setError(result.message || 'Failed to send OTP. Please try again.');
        console.error('MSG91 API error:', result);
      }
    } catch (err) {
      console.error('Error sending OTP:', err);
      setError('Failed to send OTP. Network error or invalid number.');
    } finally {
      setIsProcessing(false);
    }
  };
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setIsProcessing(true);
    
    if (otp === generatedOtp) {
      try {
        setInfo('OTP verified! Logging in...');
        const userRef = doc(db, 'users', mobile); // Use mobile as the document ID
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          // This is a new user, create their document
          await setDoc(userRef, {
            mobile: `${countryCode}${mobile}`,
            role: 'retailer', // Default role for new users
            createdAt: new Date(),
          });
        }

        setInfo('Login successful! Redirecting...');
        setTimeout(() => navigate('/'), 1000);
      } catch (err) {
        console.error('Error during login:', err);
        setError('An error occurred. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    } else {
      setError('Invalid OTP. Please try again.');
      setIsProcessing(false);
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

          {!isOtpSent ? (
            // Form to get mobile number and send OTP
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
          ) : (
            // Form to verify OTP
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
                {isProcessing ? 'Verifying...' : 'Verify & Login'}
              </button>
            </form>
          )}
          <div id="recaptcha-container"></div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
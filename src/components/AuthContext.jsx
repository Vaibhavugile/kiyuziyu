import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, doc, onAuthStateChanged, getDoc, signOut } from '../firebase';

// Create the context
export const AuthContext = createContext();

// Create the provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // New logout function to sign the user out
  const logout = () => {
    return signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // User is logged in, fetch their role from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserRole(userDocSnap.data().role);
        } else {
          // No user profile found, default to 'retailer' or handle as an error
          console.error("User profile not found in Firestore.");
          setUserRole('retailer');
        }
      } else {
        // User is logged out
        setUserRole(null);
      }
      setIsLoading(false);
    });

    return unsubscribe; // Cleanup subscription on unmount
  }, []);

  const value = {
    currentUser,
    userRole,
    isLoading,
    logout, // Add the logout function to the context value
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

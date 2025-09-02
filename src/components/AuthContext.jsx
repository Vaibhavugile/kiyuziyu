import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, doc, onAuthStateChanged, getDoc } from '../firebase';

// Create the Auth Context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This listener checks for changes in the user's authentication state
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is logged in, now fetch their profile from Firestore
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserProfile(docSnap.data());
        }
        setCurrentUser(user);
      } else {
        // User is logged out
        setCurrentUser(null);
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    // Clean up the listener on component unmount
    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    userProfile,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};
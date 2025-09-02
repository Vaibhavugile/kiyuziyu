// src/firebase.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, setDoc, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { getAuth, signInWithPhoneNumber, onAuthStateChanged, RecaptchaVerifier, signOut } from 'firebase/auth'; // Import signOut here
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBrxx_BAmHnqKciFqh9E_3Yu6ziRzANnYQ",
  authDomain: "jewellerywholesale-2e57c.firebaseapp.com",
  projectId: "jewellerywholesale-2e57c",
  storageBucket: "jewellerywholesale-2e57c.firebasestorage.app",
  messagingSenderId: "440314889833",
  appId: "1:440314889833:web:73c417a87cad4168fe84f8",
  measurementId: "G-5JSNGTJPPE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Export all necessary services and functions
export {
  db,
  collection,
  getDocs,
  addDoc,
  getDoc,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  auth,
  signInWithPhoneNumber,
  onAuthStateChanged,
  RecaptchaVerifier,
  signOut, // Export signOut here
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
};
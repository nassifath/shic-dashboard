// src/firebase.js
// === Firebase v9 avec Authentification, Database et Storage === //

import { initializeApp } from "firebase/app";

// Database
import {
  getDatabase,
  ref,
  onValue,
  set,
  update,
  push,
  remove,
  get,
  query,
  orderByChild,
  equalTo
} from "firebase/database";

// Auth
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "firebase/auth";

// Storage (pour les fichiers/rapports)
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll
} from "firebase/storage";

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB9MX4G4veXt_0fDtVfxbvQOLHzpYnE1YY",
  authDomain: "shic-app-96d3e.firebaseapp.com",
  databaseURL: "https://shic-app-96d3e-default-rtdb.firebaseio.com",
  projectId: "shic-app-96d3e",
  storageBucket: "shic-app-96d3e.firebasestorage.app",
  messagingSenderId: "163674726477",
  appId: "1:163674726477:web:89a8a98870670dc6c6fc04",
  measurementId: "G-7SK0DLTZYN"
};

// Initialisation Firebase
const app = initializeApp(firebaseConfig);

// Services Firebase
const db = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);

// ✅ Exporter la config pour pouvoir créer des instances secondaires
export { firebaseConfig };

// Exportations
export { 
  // App
  app,
  
  // Database
  db, 
  ref, 
  onValue, 
  set, 
  update, 
  push, 
  remove,
  get,
  query,
  orderByChild,
  equalTo,
  
  // Auth
  auth,
  getAuth, // ✅ AJOUTÉ - nécessaire pour AuthContext
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  
  // Storage
  storage,
  storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  
  // ✅ AJOUTÉ - nécessaire pour créer des instances secondaires
  initializeApp
};

export default app;
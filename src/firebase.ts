import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

import { Capacitor } from '@capacitor/core';
import { initializeAuth, browserLocalPersistence } from 'firebase/auth';

// Initialize Firebase safely
let app: any;
let db: any;
let auth: any;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  
  if (Capacitor.isNativePlatform()) {
    auth = initializeAuth(app, {
      persistence: browserLocalPersistence
    });
  } else {
    auth = getAuth(app);
  }
} catch (error: any) {
  // Report the error to the DOM directly so we can see it on the white screen
  setTimeout(() => {
    const errDiv = document.createElement('div');
    errDiv.style.cssText = 'color:blue;font-size:16px;z-index:10000;position:absolute;top:250px;background:white;padding:10px;border:2px solid blue;';
    errDiv.innerText = 'Firebase Init Error: ' + error.message;
    document.body.appendChild(errDiv);
  }, 1000);
}

export { db, auth };

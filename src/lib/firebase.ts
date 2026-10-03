
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDlelxJtrg4K9VqdULYc1WG2eW935qhMRk",
  authDomain: "capwalletapp.firebaseapp.com",
  databaseURL: "https://capwalletapp-default-rtdb.firebaseio.com",
  projectId: "capwalletapp",
  storageBucket: "capwalletapp.firebasestorage.app",
  messagingSenderId: "410003915551",
  appId: "1:410003915551:web:6b9079e41f2ed74c48a62a",
  measurementId: "G-SBX4G5QLCT"
};

// **IMPORTANT**: Replace this with the actual UID of your designated admin user from Firebase Authentication.
// You can find the UID in the Firebase Console under Authentication > Users.
export const ADMIN_UID: string = "QdMuAKkPnKWDD7QuLCVjuWQ55M13";


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

export { app, auth, db, rtdb };

import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// This is copied directly from your Firebase project settings
const firebaseConfig = {
  apiKey: "AIzaSyDTXRAQNZ1zJ4XokiX1nrHuquwGtpeViZE",
  authDomain: "caic-chat-app-2025.firebaseapp.com",
  databaseURL: "https://caic-chat-app-2025-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "caic-chat-app-2025",
  storageBucket: "caic-chat-app-2025.appspot.com",
  messagingSenderId: "42383721383",
  appId: "1:42383721383:web:799238dff101dbced17082",
  measurementId: "G-TVHYEMDX9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services you'll need for the rest of your app
export const database = getDatabase(app);
export const auth = getAuth(app);
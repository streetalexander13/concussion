import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBMKfrDTKaz6xSZbSUbjzYI3CDiYCvHWQ8",
  authDomain: "maddysnogginfixer.firebaseapp.com",
  projectId: "maddysnogginfixer",
  storageBucket: "maddysnogginfixer.firebasestorage.app",
  messagingSenderId: "1094871051467",
  appId: "1:1094871051467:web:b32fa0d7a8e694eb5d3f4e",
  measurementId: "G-CF7X2L5HP5"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Analytics (only in browser)
let analytics: any;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}
export { analytics };


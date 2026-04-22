import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBnkdcmTvNGyP1sXB0xS01Un70LKrnIa60",
  authDomain: "oddfeed-15294.firebaseapp.com",
  projectId: "oddfeed-15294",
  storageBucket: "oddfeed-15294.firebasestorage.app",
  messagingSenderId: "272354842276",
  appId: "1:272354842276:web:685666fe34d5389f69b831",
  measurementId: "G-LP6L0FS19V",
};

const app = initializeApp(firebaseConfig);

// Auth con persistenza AsyncStorage — mantiene il login tra una sessione e l'altra
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const db = getFirestore(app);
export default app;

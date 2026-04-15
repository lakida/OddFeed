import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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

// Auth — persistenza con AsyncStorage aggiunta in fase successiva
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

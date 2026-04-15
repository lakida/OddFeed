import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// Registrazione con email e password
export async function registerUser(name: string, email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });

  // Crea il profilo utente su Firestore
  await setDoc(doc(db, 'users', credential.user.uid), {
    name,
    email,
    createdAt: serverTimestamp(),
    isPremium: false,
    points: 0,
    streak: 0,
    level: 0,
    interests: [],
    notificationSlot: 'Colazione',
    language: 'it',
  });

  return credential.user;
}

// Login con email e password
export async function loginUser(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

// Logout
export async function logoutUser() {
  await signOut(auth);
}

// Recupera password
export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}

// Carica profilo utente da Firestore
export async function getUserProfile(uid: string) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

// Aggiorna preferenze utente
export async function updateUserPreferences(uid: string, data: Partial<{
  interests: string[];
  notificationSlot: string;
  language: string;
  isPremium: boolean;
  points: number;
  streak: number;
  level: number;
}>) {
  await setDoc(doc(db, 'users', uid), data, { merge: true });
}

// Ascolta lo stato di autenticazione
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

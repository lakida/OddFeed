import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  deleteUser,
  signInWithCredential,
  GoogleAuthProvider,
  FacebookAuthProvider,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { sendVerificationOTP } from './emailService';

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
    emailVerified: false,
  });

  // Invia OTP via SendGrid
  try {
    await sendVerificationOTP(credential.user.uid, email);
    console.log('✅ OTP di verifica inviato a:', email);
  } catch (emailErr: any) {
    // In sviluppo mostra l'errore reale per debug
    console.warn('⚠️ sendVerificationOTP error:', emailErr?.message);
    throw new Error(`OTP_EMAIL_FAILED: ${emailErr?.message}`);
  }

  return credential.user;
}

// Reinvia OTP via SendGrid
export async function resendVerificationEmail(): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('Nessun utente loggato');
  await sendVerificationOTP(user.uid, user.email);
}

// Non più usato con OTP — mantenuto per compatibilità
export async function reloadUser(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  await user.reload();
  return auth.currentUser?.emailVerified ?? false;
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
  name: string;
  interests: string[];
  notificationSlot: string;
  language: string;
  isPremium: boolean;
  points: number;
  streak: number;
  level: number;
  emailVerified: boolean;
  onboardingDone: boolean;
  expoPushToken: string;
  notificationsEnabled: boolean;
  notificationPrefs: Record<string, unknown>;
  readArticleIds: string[];
  updatedAt: string;
  lastNotifDate: string;
  lastNotifMorning: string;
  lastNotifLunch: string;
  lastNotifEvening: string;
}>) {
  await setDoc(doc(db, 'users', uid), data, { merge: true });
}

// Elimina account (Firestore + Firebase Auth)
// onBeforeDelete: callback chiamato APPENA PRIMA di deleteUser,
// così il flag può essere settato prima che Firebase triggeri onAuthStateChanged.
export async function deleteAccount(onBeforeDelete?: () => void): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Nessun utente loggato');

  // 1. Elimina i dati da Firestore
  try {
    await deleteDoc(doc(db, 'users', user.uid));
  } catch (e) {
    console.warn('Impossibile eliminare dati Firestore:', e);
  }

  // 2. Setta il flag subito prima di deleteUser:
  //    deleteUser disconnette l'utente e triggera onAuthStateChanged istantaneamente,
  //    dobbiamo essere pronti prima che arrivi quell'evento.
  onBeforeDelete?.();

  // 3. Elimina l'account da Firebase Auth
  await deleteUser(user);
}

// Ascolta lo stato di autenticazione
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Login con Google (passa il token ottenuto da expo-auth-session)
export async function signInWithGoogle(idToken: string | null, accessToken: string | null) {
  const credential = GoogleAuthProvider.credential(idToken, accessToken);
  const result = await signInWithCredential(auth, credential);
  return result.user;
}

// Login con Facebook (passa il token ottenuto da expo-auth-session)
export async function signInWithFacebook(accessToken: string) {
  const credential = FacebookAuthProvider.credential(accessToken);
  const result = await signInWithCredential(auth, credential);
  return result.user;
}

// Crea il profilo Firestore per un nuovo utente social (Google/Facebook).
// Ritorna true se il profilo esisteva già, false se è stato creato ora.
export async function ensureSocialUserProfile(user: User): Promise<boolean> {
  const snap = await getDoc(doc(db, 'users', user.uid));
  if (snap.exists()) return true; // profilo già presente

  await setDoc(doc(db, 'users', user.uid), {
    name: user.displayName ?? '',
    email: user.email ?? '',
    createdAt: serverTimestamp(),
    isPremium: false,
    points: 0,
    streak: 0,
    level: 0,
    interests: [],
    notificationSlot: 'Colazione',
    language: 'it',
    emailVerified: true,
    provider: user.providerData[0]?.providerId ?? 'social',
  });
  return false; // profilo appena creato → va all'onboarding
}

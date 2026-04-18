import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
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

  // Imposta la lingua prima di inviare — Firebase usa questo per scegliere il template
  auth.languageCode = 'it';

  // Invia email di verifica — con URL di reindirizzamento esplicito
  try {
    await sendEmailVerification(credential.user, {
      url: 'https://oddfeed-15294.firebaseapp.com/__/auth/action',
      handleCodeInApp: false,
    });
    console.log('✅ Email di verifica inviata a:', credential.user.email);
  } catch (emailErr: any) {
    // L'account è stato creato correttamente — logghiamo l'errore ma non blocchiamo il flusso
    console.warn('⚠️ sendEmailVerification error:', emailErr?.code, emailErr?.message);
  }

  return credential.user;
}

// Reinvia email di verifica
export async function resendVerificationEmail(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Nessun utente loggato');
  auth.languageCode = 'it';
  await sendEmailVerification(user, {
    url: 'https://oddfeed-15294.firebaseapp.com/__/auth/action',
    handleCodeInApp: false,
  });
}

// Controlla se l'utente ha verificato l'email (ricarica il profilo da Firebase)
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

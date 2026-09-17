import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const DEVICE_ID_KEY = '@oddFeed_deviceId';

// Genera (o recupera) un ID dispositivo stabile — usato come documento utente in Firestore
async function getOrCreateDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/**
 * Chiede il permesso per le notifiche push e registra il token su Firestore.
 * Ritorna true se l'utente ha accettato e il token è stato salvato.
 */
export async function registerAndSaveToken(interests: string[]): Promise<boolean> {
  try {
    // Richiedi permesso (iOS mostra il dialog di sistema)
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return false;

    // Ottieni il token Expo
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '18a2437f-f82a-46ce-a760-1f7228f71f6a',
    });
    const token = tokenData.data;

    // Salva su Firestore sotto users/{deviceId}
    const deviceId = await getOrCreateDeviceId();
    await setDoc(
      doc(db, 'users', deviceId),
      {
        expoPushToken: token,
        notificationsEnabled: true,
        interests,
        notificationSlot: 'Colazione',
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return true;
  } catch (e) {
    console.warn('[OddFeed] Notifica registrazione fallita:', e);
    return false;
  }
}

/**
 * Aggiorna gli interessi dell'utente su Firestore (chiamato da SettingsScreen).
 */
export async function updateInterestsOnFirestore(interests: string[]): Promise<void> {
  try {
    const deviceId = await getOrCreateDeviceId();
    await setDoc(
      doc(db, 'users', deviceId),
      { interests, updatedAt: new Date().toISOString() },
      { merge: true },
    );
  } catch (e) {
    console.warn('[OddFeed] Aggiornamento interessi Firestore fallito:', e);
  }
}

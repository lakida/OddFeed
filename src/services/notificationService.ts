import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Configurazione comportamento notifiche quando l'app è aperta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Richiede permesso e ottiene il token Expo Push
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  // Le notifiche funzionano solo su dispositivo fisico
  if (!Device.isDevice) {
    console.log('ℹ️ Notifiche non disponibili nel simulatore');
    return null;
  }

  // Controlla permesso attuale
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Chiedi permesso se non ancora concesso
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('ℹ️ Permesso notifiche negato');
    return null;
  }

  // Configurazione speciale per Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('oddfeed', {
      name: 'OddFeed',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366F1',
    });
  }

  // Ottieni token Expo Push
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: 'oddfeed-15294',
  });
  const token = tokenData.data;

  // Salva token su Firestore collegato all'utente
  if (userId) {
    await setDoc(doc(db, 'users', userId), {
      expoPushToken: token,
      notificationsEnabled: true,
    }, { merge: true });
  }

  return token;
}

// Schedula una notifica locale (per test)
export async function scheduleLocalNotification(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
  });
}

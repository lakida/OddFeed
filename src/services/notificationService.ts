// OddFeed — Servizio notifiche push
// Logica: 1 notifica/giorno, weighted random, anti-ripetizione, deep link

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Category } from '../types';
import { CATEGORY_MAP } from '../data/categoryConfig';

// ─── CONFIGURAZIONE ───────────────────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Orari di invio per fascia (ora locale dell'utente)
export const NOTIFICATION_SLOT_HOURS: Record<string, number> = {
  'Colazione':  8,
  'Pranzo':    12,
  'Pomeriggio': 16,
  'Cena':      20,
  'Breakfast':  8,
  'Lunch':     12,
  'Afternoon': 16,
  'Dinner':    20,
};

// ─── COPY NOTIFICHE ───────────────────────────────────────────────────────────
// Titoli brevi e cliccabili per ogni categoria
// Usati dallo script fetch-news.js lato backend

export const NOTIFICATION_COPY: Record<Category, string[]> = {
  sesso_relazioni: [
    'La coppia più strana del mondo ha fatto {titolo} 👀',
    'Questo studio sul sesso ti sorprenderà',
    'Una storia d\'amore che non avresti mai immaginato 💋',
  ],
  gossip: [
    'Indovina chi ha fatto cosa ieri 🌟',
    'Il gossip del giorno: non ci crederai',
    'La celebrity che ha sconvolto tutti 😱',
  ],
  crimini_strani: [
    'Il crimine più assurdo della settimana 🔪',
    'Hanno rubato... cosa? Non indovineresti mai',
    'Un crimine così strano che sembra inventato',
  ],
  storie_assurde: [
    'Questa storia è al 100% vera (giuriamo) 🤪',
    'La cosa più assurda successa oggi nel mondo',
    'Non ci crederai, ma è tutto vero 🤯',
  ],
  psicologia_strana: [
    'Il tuo cervello ti sta mentendo in questo modo 🧠',
    'Perché le persone fanno cose così bizzarre?',
    'Lo studio psicologico che cambierà come pensi',
  ],
  soldi_folli: [
    'Qualcuno ha speso un milione per... questo 💸',
    'La storia di soldi più assurda della settimana',
    'Come si diventa ricchi in modo ridicolo 🤑',
  ],
  coincidenze: [
    'Una coincidenza così assurda da sembrare un film 🌀',
    'Le probabilità erano 1 su un miliardo. È successo.',
    'Il destino esiste? Questa storia fa riflettere',
  ],
  tecnologia: [
    'Qualcuno ha inventato una cosa che non sapevi di volere 💻',
    'La tecnologia più inutile (e geniale) della settimana',
    'Un ingegnere annoiato ha fatto questo…',
  ],
  record: [
    'Il nuovo record mondiale più inutile di sempre 🏆',
    'Qualcuno ha battuto un record che non sapevi esistesse',
    'Il primato più bizzarro appena certificato',
  ],
  animali: [
    'Questo animale ha fatto qualcosa di impossibile 🐾',
    'La storia dell\'animale più strano di oggi',
    'Un animale ha sorpreso tutti gli scienziati',
  ],
  scienza: [
    'Gli scienziati hanno scoperto qualcosa di assurdo 🔬',
    'La scoperta scientifica più bizzarra della settimana',
    'La fisica non funziona come pensavi',
  ],
  leggi: [
    'In questo paese è ancora illegale fare {cosa} ⚖️',
    'La legge più assurda ancora in vigore nel mondo',
    'Attenzione: potresti essere un criminale senza saperlo',
  ],
  cultura: [
    'La tradizione più strana del mondo: la scopri oggi 🌍',
    'In questo paese fanno una cosa che non avresti mai immaginato',
    'La storia culturale più assurda del mese',
  ],
  gastronomia: [
    'Qualcuno ha mangiato davvero questa cosa 🍽️',
    'Il piatto più assurdo che esiste al mondo',
    'Il cibo che non avresti mai pensato di mettere in bocca',
  ],
  luoghi: [
    'Esiste davvero un posto così nel mondo 📍',
    'Il luogo più strano del pianeta: lo scopri oggi',
    'Questo posto sembra uscito da un film. Esiste.',
  ],
};

// ─── REGISTRAZIONE TOKEN ──────────────────────────────────────────────────────

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('ℹ️ Notifiche non disponibili nel simulatore');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('ℹ️ Permesso notifiche negato');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('oddfeed', {
      name: 'OddFeed',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366F1',
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: '18a2437f-f82a-46ce-a760-1f7228f71f6a',
  });
  const token = tokenData.data;

  if (userId) {
    await setDoc(doc(db, 'users', userId), {
      expoPushToken: token,
      notificationsEnabled: true,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }

  return token;
}

// ─── PREFERENZE NOTIFICHE ─────────────────────────────────────────────────────

export interface NotificationPreferences {
  enabled: boolean;
  slot: string;              // 'Colazione' | 'Pranzo' | 'Pomeriggio' | 'Cena'
  topNewsOnly: boolean;      // se true, solo la top notizia del giorno
  customHour?: number;       // ora personalizzata (0-23)
}

export async function updateNotificationPreferences(
  userId: string,
  prefs: Partial<NotificationPreferences>
): Promise<void> {
  await setDoc(doc(db, 'users', userId), {
    notificationPrefs: prefs,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    const data = snap.data();
    return data?.notificationPrefs ?? {
      enabled: true,
      slot: 'Pranzo',
      topNewsOnly: false,
    };
  } catch {
    return { enabled: true, slot: 'Pranzo', topNewsOnly: false };
  }
}

// ─── COSTRUZIONE NOTIFICA ─────────────────────────────────────────────────────

/**
 * Genera il testo della notifica per una notizia specifica.
 * Usa i template della categoria con titolo inserito dove possibile.
 */
export function buildNotificationContent(params: {
  newsTitle: string;
  newsId: string;
  category: Category;
}): { title: string; body: string; data: Record<string, string> } {
  const { newsTitle, newsId, category } = params;
  const templates = NOTIFICATION_COPY[category] ?? ['Nuova notizia curiosa per te'];

  // Sceglie un template a caso
  const template = templates[Math.floor(Math.random() * templates.length)];

  // Titolo: usa il template se generico, o il titolo della notizia se troppo lungo
  const title = newsTitle.length <= 60 ? newsTitle : newsTitle.slice(0, 57) + '...';

  // Body: usa il template come sottotitolo
  const body = template.replace('{titolo}', newsTitle).replace('{cosa}', 'qualcosa');

  const categoryConfig = CATEGORY_MAP[category];
  const emoji = categoryConfig?.emoji ?? '📰';

  return {
    title: `${emoji} ${title}`,
    body,
    data: {
      newsId,
      category,
      screen: 'Article',
    },
  };
}

// ─── NOTIFICA LOCALE (per test) ───────────────────────────────────────────────

export async function scheduleLocalNotification(
  title: string,
  body: string,
  delaySeconds: number = 2,
  data?: Record<string, string>
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      data: data ?? {},
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: delaySeconds,
    },
  });
}

// ─── HANDLER DEEP LINK ────────────────────────────────────────────────────────

/**
 * Registra il listener per le notifiche cliccate.
 * Naviga direttamente all'articolo specificato.
 * Da chiamare in App.tsx al mount.
 */
export function registerNotificationResponseHandler(
  onNavigate: (newsId: string) => void
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data as Record<string, string>;
    if (data?.newsId) {
      onNavigate(data.newsId);
    }
  });

  return () => subscription.remove();
}

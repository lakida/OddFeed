import { doc, getDoc, setDoc, increment, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';
import { USER_LEVELS } from '../data/mockData';

// Punti assegnati per ogni azione — allineati con HOW_TO_EARN in mockData
export const POINTS_CONFIG = {
  openApp: 5,
  readArticle: 10,
  react: 3,
  share: 25,
  streak7bonus: 75,
} as const;

// Calcola il livello numerico dato un totale di punti
export function getLevelForPoints(points: number): number {
  for (let i = USER_LEVELS.length - 1; i >= 0; i--) {
    if (points >= USER_LEVELS[i].minPoints) return i;
  }
  return 0;
}

// ─── Attività giornaliera ────────────────────────────────────────────────────
// Chiama al login / ogni volta che l'utente apre l'app.
// Se è il primo accesso di oggi: +5 pt + aggiorna streak.
// Se è il 7° giorno consecutivo: +75 pt bonus.
// Restituisce { newStreak, pointsEarned } per l'aggiornamento ottimistico locale.
export async function updateDailyActivity(
  uid: string,
): Promise<{ newStreak: number; pointsEarned: number }> {
  const today = new Date().toISOString().split('T')[0];
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return { newStreak: 0, pointsEarned: 0 };

  const data = snap.data();
  if (data.lastActivityDate === today) {
    // Già aggiornato oggi — nessuna modifica
    return { newStreak: data.streak ?? 0, pointsEarned: 0 };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split('T')[0];

  const oldStreak = data.streak ?? 0;
  const newStreak = data.lastActivityDate === yStr ? oldStreak + 1 : 1;
  const streakBonus = newStreak >= 7 ? POINTS_CONFIG.streak7bonus : 0;
  const pointsEarned = POINTS_CONFIG.openApp + streakBonus;
  const newPoints = (data.points ?? 0) + pointsEarned;
  const newLevel = getLevelForPoints(newPoints);

  await setDoc(
    doc(db, 'users', uid),
    { streak: newStreak, lastActivityDate: today, points: increment(pointsEarned), level: newLevel },
    { merge: true },
  );

  return { newStreak, pointsEarned };
}

// ─── Lettura articolo ────────────────────────────────────────────────────────
// +10 pt, una sola volta per articolo.
// Restituisce i punti guadagnati (0 se l'articolo era già stato letto).
export async function awardReadPoints(
  uid: string,
  articleId: string,
  currentPoints: number,
  readArticleIds: string[],
): Promise<number> {
  if (readArticleIds.includes(articleId)) return 0; // già letto, niente punti

  const newPoints = currentPoints + POINTS_CONFIG.readArticle;
  const newLevel = getLevelForPoints(newPoints);

  await setDoc(
    doc(db, 'users', uid),
    {
      points: increment(POINTS_CONFIG.readArticle),
      level: newLevel,
      readArticleIds: arrayUnion(articleId),
    },
    { merge: true },
  );

  return POINTS_CONFIG.readArticle;
}

// ─── Reazione ────────────────────────────────────────────────────────────────
// +3 pt ogni volta che l'utente reagisce (già gestita l'unicità nell'UI).
export async function awardReactPoints(uid: string, currentPoints: number): Promise<number> {
  const newPoints = currentPoints + POINTS_CONFIG.react;
  const newLevel = getLevelForPoints(newPoints);

  await setDoc(
    doc(db, 'users', uid),
    { points: increment(POINTS_CONFIG.react), level: newLevel },
    { merge: true },
  );

  return POINTS_CONFIG.react;
}

// ─── Annuncio video ──────────────────────────────────────────────────────────
// +N pt quando l'utente guarda un rewarded ad (default 100 pt).
export async function awardAdPoints(uid: string, currentPoints: number, delta: number): Promise<number> {
  const newPoints = currentPoints + delta;
  const newLevel = getLevelForPoints(newPoints);

  await setDoc(
    doc(db, 'users', uid),
    { points: increment(delta), level: newLevel },
    { merge: true },
  );

  return delta;
}

// ─── Condivisione ────────────────────────────────────────────────────────────
// +25 pt quando l'utente condivide un articolo.
export async function awardSharePoints(uid: string, currentPoints: number): Promise<number> {
  const newPoints = currentPoints + POINTS_CONFIG.share;
  const newLevel = getLevelForPoints(newPoints);

  await setDoc(
    doc(db, 'users', uid),
    { points: increment(POINTS_CONFIG.share), level: newLevel },
    { merge: true },
  );

  return POINTS_CONFIG.share;
}

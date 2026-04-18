import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { NewsItem } from '../types';

// Converte un documento Firestore in NewsItem compatibile con l'app
function docToNewsItem(docSnap: any, language: 'it' | 'en'): NewsItem {
  const d = docSnap.data();
  const isIt = language === 'it';

  return {
    id: docSnap.id,
    title: isIt ? d.titleIt : d.titleEn,
    description: isIt ? d.descriptionIt : d.descriptionEn,
    fullText: isIt ? d.fullTextIt : d.fullTextEn,
    imageEmoji: d.imageEmoji ?? '🌍',
    imageColor: d.imageColor ?? ['#1a1a2e', '#16213e'],
    country: d.country ?? '🌍 Mondo',
    countryCode: d.countryCode ?? 'WD',
    category: d.category ?? 'curiosità',
    categoryLabel: isIt ? (d.categoryLabelIt ?? '🌍 Curiosità') : (d.categoryLabelEn ?? '🌍 Curiosity'),
    source: d.source ?? 'The Guardian',
    publishedAt: d.date ?? 'Oggi',
    isToday: d.isToday ?? false,
    daysAgo: d.daysAgo ?? 0,
    reactions: d.reactions ?? [
      { emoji: '🤯', count: 0, label: 'Sconvolto' },
      { emoji: '😮', count: 0, label: 'Sorpreso' },
      { emoji: '😂', count: 0, label: 'Divertente' },
      { emoji: '🤔', count: 0, label: 'Interessante' },
      { emoji: '❤️', count: 0, label: 'Adoro' },
    ],
    userReaction: null,
  };
}

// Carica la notizia di oggi (la prima, quella free).
// Nota: orderBy rimosso per evitare la necessità di un indice composito Firestore.
// L'ordinamento viene fatto lato client sul campo 'order'.
export async function fetchTodayNews(
  language: 'it' | 'en',
  _isPremium: boolean
): Promise<NewsItem[]> {
  const today = new Date().toISOString().split('T')[0];

  const q = query(
    collection(db, 'articles'),
    where('date', '==', today),
  );

  const snap = await getDocs(q);
  const all = snap.docs
    .map(d => ({ item: docToNewsItem(d, language), order: d.data().order ?? 0 }))
    .sort((a, b) => a.order - b.order)
    .map(x => x.item);

  // Home mostra sempre solo 1 notizia di oggi (la prima, free)
  return all.slice(0, 1);
}

// Carica le 2 notizie più recenti dei giorni precedenti (per la Home).
// Mostrate a tutti, free e premium — danno sempre qualcosa da leggere.
export async function fetchRecentPastNews(
  language: 'it' | 'en',
  count = 2
): Promise<NewsItem[]> {
  const today = new Date().toISOString().split('T')[0];

  const q = query(
    collection(db, 'articles'),
    where('date', '<', today),
  );

  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ item: docToNewsItem(d, language), date: d.data().date ?? '', order: d.data().order ?? 0 }))
    .sort((a, b) => b.date.localeCompare(a.date) || a.order - b.order)
    .slice(0, count)
    .map(x => x.item);
}

// Carica l'archivio (ultimi 7 giorni free, tutto per premium).
// Ordinamento lato client per evitare indici compositi.
export async function fetchArchive(
  language: 'it' | 'en',
  isPremium: boolean
): Promise<NewsItem[]> {
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - (isPremium ? 365 : 7));
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const q = query(
    collection(db, 'articles'),
    where('date', '>=', cutoffStr),
  );

  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ item: docToNewsItem(d, language), date: d.data().date ?? '', order: d.data().order ?? 0 }))
    .sort((a, b) => b.date.localeCompare(a.date) || a.order - b.order)
    .map(x => x.item);
}

// Aggiorna il conteggio di una reazione
export async function addReaction(
  articleId: string,
  emoji: string,
  increment_value: 1 | -1
): Promise<void> {
  try {
    const ref = doc(db, 'articles', articleId);
    await updateDoc(ref, {
      [`reactionCounts.${emoji}`]: increment(increment_value),
    });
  } catch (e) {
    // Silently fail — non critico
  }
}

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

  // Calcola isToday e daysAgo dinamicamente dalla data dell'articolo,
  // così rimangono corretti ogni giorno senza dover aggiornare Firestore.
  const todayStr = new Date().toISOString().split('T')[0];
  const articleDate = d.date ?? todayStr;
  const isToday = articleDate === todayStr;
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysAgo = Math.max(0, Math.floor(
    (new Date(todayStr).getTime() - new Date(articleDate).getTime()) / msPerDay
  ));

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
    isToday,
    daysAgo,
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

// Ordinamento per priorità: interessi > italiano > data > order.
// Non filtra mai — mostra sempre tutti gli articoli accessibili,
// ma quelli delle categorie preferite e in italiano vengono prima.
function filterAndSort<T extends { item: NewsItem; date?: string; order: number }>(
  items: T[],
  interests: string[],
  language: 'it' | 'en'
): T[] {
  return [...items].sort((a, b) => {
    // 1. Categorie di interesse prima
    const aI = interests.length === 0 || interests.includes(a.item.category) ? 0 : 1;
    const bI = interests.length === 0 || interests.includes(b.item.category) ? 0 : 1;
    if (aI !== bI) return aI - bI;

    // 2. Italiano prima se lingua italiana
    if (language === 'it') {
      const aIt = a.item.country.includes('Italia') ? 0 : 1;
      const bIt = b.item.country.includes('Italia') ? 0 : 1;
      if (aIt !== bIt) return aIt - bIt;
    }

    // 3. Data più recente prima, poi order
    if (a.date && b.date && a.date !== b.date) return b.date.localeCompare(a.date);
    return a.order - b.order;
  });
}

// Carica la notizia di oggi.
// Se l'utente ha interessi, mostra la notizia gratuita che li soddisfa (se esiste).
export async function fetchTodayNews(
  language: 'it' | 'en',
  isPremium: boolean,
  interests: string[] = []
): Promise<NewsItem[]> {
  const today = new Date().toISOString().split('T')[0];

  const q = query(
    collection(db, 'articles'),
    where('date', '==', today),
  );

  const snap = await getDocs(q);
  const all = snap.docs
    .filter(d => isPremium || !d.data().isPremium)
    .map(d => ({ item: docToNewsItem(d, language), order: d.data().order ?? 0 }));

  const sorted = filterAndSort(all, interests, language);
  return sorted.slice(0, 1).map(x => x.item);
}

// Carica le notizie recenti dei giorni precedenti (per la Home).
// Prioritizza le categorie preferite dall'utente.
export async function fetchRecentPastNews(
  language: 'it' | 'en',
  isPremium: boolean,
  count = 2,
  interests: string[] = []
): Promise<NewsItem[]> {
  const today = new Date().toISOString().split('T')[0];

  const q = query(
    collection(db, 'articles'),
    where('date', '<', today),
  );

  const snap = await getDocs(q);
  const all = snap.docs
    .filter(d => isPremium || !d.data().isPremium)
    .map(d => ({ item: docToNewsItem(d, language), date: d.data().date ?? '', order: d.data().order ?? 0 }));

  return filterAndSort(all, interests, language).slice(0, count).map(x => x.item);
}

// Carica l'archivio (ultimi 7 giorni free, tutto per premium).
// Prioritizza categorie preferite dall'utente, con fallback a tutto se nessun match.
export async function fetchArchive(
  language: 'it' | 'en',
  isPremium: boolean,
  interests: string[] = []
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
  const all = snap.docs
    .filter(d => isPremium || !d.data().isPremium)
    .map(d => ({ item: docToNewsItem(d, language), date: d.data().date ?? '', order: d.data().order ?? 0 }));

  return filterAndSort(all, interests, language).map(x => x.item);
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

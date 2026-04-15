import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  increment,
  limit,
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

// Carica le notizie di oggi
export async function fetchTodayNews(
  language: 'it' | 'en',
  isPremium: boolean
): Promise<NewsItem[]> {
  const today = new Date().toISOString().split('T')[0];

  const q = query(
    collection(db, 'articles'),
    where('date', '==', today),
    orderBy('order', 'asc'),
    limit(isPremium ? 10 : 1)
  );

  const snap = await getDocs(q);
  return snap.docs.map(d => docToNewsItem(d, language));
}

// Carica l'archivio (ultimi 7 giorni free, tutto per premium)
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
    orderBy('date', 'desc'),
    orderBy('order', 'asc'),
    limit(50)
  );

  const snap = await getDocs(q);
  return snap.docs.map(d => docToNewsItem(d, language));
}

// Aggiorna il conteggio di una reazione
export async function addReaction(
  articleId: string,
  emoji: string,
  increment_value: 1 | -1
): Promise<void> {
  try {
    const ref = doc(db, 'articles', articleId);
    // Firestore non supporta update di array-of-objects direttamente
    // In V2 implementeremo con subcollection reactions
    // Per ora aggiorniamo il contatore direttamente
    await updateDoc(ref, {
      [`reactionCounts.${emoji}`]: increment(increment_value),
    });
  } catch (e) {
    // Silently fail — non critico
  }
}

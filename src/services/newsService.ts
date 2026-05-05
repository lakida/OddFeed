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

// Mappe di fallback per le label delle categorie (usate quando il valore salvato è grezzo o mancante)
const FALLBACK_LABELS_IT: Record<string, string> = {
  attualita: '📰 Attualità',
  gossip_spettacolo: '🌟 Gossip & Spettacolo',
  animali: '🐾 Animali',
  tecnologia: '💻 Tecnologia',
  record: '🏆 Record',
  leggi: '⚖️ Leggi Assurde',
  scienza: '🔬 Scienza',
  gastronomia: '🍽️ Gastronomia',
  cultura: '🌍 Cultura',
  luoghi: '📍 Luoghi',
  sesso_relazioni: '💋 Sesso & Relazioni',
  gossip: '🌟 Gossip',
  crimini_strani: '🔪 Crimini Strani',
  storie_assurde: '🤪 Storie Assurde',
  psicologia_strana: '🧠 Psicologia Strana',
  soldi_folli: '💸 Soldi Folli',
  coincidenze: '🌀 Coincidenze',
};
const FALLBACK_LABELS_EN: Record<string, string> = {
  attualita: '📰 Current Affairs',
  gossip_spettacolo: '🌟 Gossip & Entertainment',
  animali: '🐾 Animals',
  tecnologia: '💻 Technology',
  record: '🏆 Records',
  leggi: '⚖️ Weird Laws',
  scienza: '🔬 Science',
  gastronomia: '🍽️ Food',
  cultura: '🌍 Culture',
  luoghi: '📍 Places',
  sesso_relazioni: '💋 Sex & Relationships',
  gossip: '🌟 Gossip',
  crimini_strani: '🔪 Strange Crimes',
  storie_assurde: '🤪 Absurd Stories',
  psicologia_strana: '🧠 Strange Psychology',
  soldi_folli: '💸 Crazy Money',
  coincidenze: '🌀 Coincidences',
};

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
    articleType: d.articleType ?? 'bizarre',
    title: isIt ? d.titleIt : d.titleEn,
    description: isIt ? d.descriptionIt : d.descriptionEn,
    fullText: isIt ? d.fullTextIt : d.fullTextEn,
    imageEmoji: d.imageEmoji ?? '🌍',
    imageColor: d.imageColor ?? ['#1a1a2e', '#16213e'],
    country: d.country ?? '🌍 Mondo',
    countryCode: d.countryCode ?? 'WD',
    category: d.category ?? 'curiosità',
    categoryLabel: isIt
      ? (d.categoryLabelIt && d.categoryLabelIt.trim().length > 3 && !['attualita','gossip_spettacolo'].includes(d.categoryLabelIt)
          ? d.categoryLabelIt
          : FALLBACK_LABELS_IT[d.category] ?? d.categoryLabelIt ?? '🌍 Curiosità')
      : (d.categoryLabelEn && d.categoryLabelEn.trim().length > 3 && !['attualita','gossip_spettacolo'].includes(d.categoryLabelEn)
          ? d.categoryLabelEn
          : FALLBACK_LABELS_EN[d.category] ?? d.categoryLabelEn ?? '🌍 Curiosity'),
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
    isTopOdd: d.isTopOdd ?? false,
    isForbidden: d.isForbidden ?? false,
    viewSeed: d.viewSeed ?? null,
    isPremium: d.isPremium ?? false,
  };
}

// Ordinamento: data più recente prima (priorità assoluta),
// poi interessi e italiano come spareggio all'interno dello stesso giorno.
// Questo garantisce che le notizie di ieri appaiono sempre prima
// di quelle di una settimana fa, indipendentemente dalla categoria.
function filterAndSort<T extends { item: NewsItem; date?: string; order: number }>(
  items: T[],
  interests: string[],
  language: 'it' | 'en'
): T[] {
  return [...items].sort((a, b) => {
    // 1. Data più recente prima (priorità assoluta)
    const aDate = a.date ?? a.item.publishedAt ?? '';
    const bDate = b.date ?? b.item.publishedAt ?? '';
    if (aDate !== bDate) return bDate.localeCompare(aDate);

    // 2. Stesso giorno: categorie di interesse prima
    const aI = interests.length === 0 || interests.includes(a.item.category) ? 0 : 1;
    const bI = interests.length === 0 || interests.includes(b.item.category) ? 0 : 1;
    if (aI !== bI) return aI - bI;

    // 3. Stesso giorno + stessi interessi: italiano prima
    if (language === 'it') {
      const aIt = a.item.country.includes('Italia') ? 0 : 1;
      const bIt = b.item.country.includes('Italia') ? 0 : 1;
      if (aIt !== bIt) return aIt - bIt;
    }

    // 4. Stesso giorno: order (posizione nell'articolo del giorno)
    return a.order - b.order;
  });
}

// Carica le notizie di oggi.
// Restituisce fino a `limit` articoli, ordinati per interessi/lingua.
export async function fetchTodayNews(
  language: 'it' | 'en',
  isPremium: boolean,
  interests: string[] = [],
  limit = 1
): Promise<NewsItem[]> {
  const today = new Date().toISOString().split('T')[0];

  const q = query(
    collection(db, 'articles'),
    where('date', '==', today),
  );

  const snap = await getDocs(q);
  const all = snap.docs
    .filter(d => isPremium || !d.data().isPremium)
    .filter(d => {
      const t = d.data().articleType ?? 'bizarre';
      return t !== 'current' && t !== 'forbidden'; // Escludi attualità e "non dovresti"
    })
    .map(d => ({ item: docToNewsItem(d, language), order: d.data().order ?? 0 }));

  const sorted = filterAndSort(all, interests, language);
  return sorted.slice(0, limit).map(x => x.item);
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
    .filter(d => {
      const t = d.data().articleType ?? 'bizarre';
      return t !== 'current' && t !== 'forbidden';
    })
    .map(d => ({ item: docToNewsItem(d, language), date: d.data().date ?? '', order: d.data().order ?? 0 }));

  return filterAndSort(all, interests, language).slice(0, count).map(x => x.item);
}

// Carica l'archivio (ultimi 7 giorni free, tutto per premium).
// Per utenti free limita il totale a `newsLimit` articoli.
export async function fetchArchive(
  language: 'it' | 'en',
  isPremium: boolean,
  interests: string[] = [],
  newsLimit = 1
): Promise<NewsItem[]> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // L'archivio parte da 2 giorni fa: oggi e ieri sono visibili solo in Home,
  // così l'utente non vede le stesse notizie scorrendo tra le due sezioni.
  const archiveEnd = new Date(today);
  archiveEnd.setDate(archiveEnd.getDate() - 1);
  const archiveEndStr = archiveEnd.toISOString().split('T')[0];

  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - (isPremium ? 365 : 7));
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const q = query(
    collection(db, 'articles'),
    where('date', '>=', cutoffStr),
    where('date', '<', archiveEndStr), // Escludi oggi e ieri — già visibili in Home
  );

  const snap = await getDocs(q);
  const all = snap.docs
    .filter(d => isPremium || !d.data().isPremium)
    .filter(d => {
      const t = d.data().articleType ?? 'bizarre';
      return t !== 'current' && t !== 'forbidden';
    })
    .map(d => ({ item: docToNewsItem(d, language), date: d.data().date ?? '', order: d.data().order ?? 0 }));

  const sorted = filterAndSort(all, interests, language);
  // Premium: tutto senza limite. Free: max `newsLimit` articoli per giorno × giorni
  // (in pratica limitiamo il totale a newsLimit * 7 per evitare liste infinite)
  const totalLimit = isPremium ? Infinity : newsLimit * 7;
  return sorted.slice(0, totalLimit).map(x => x.item);
}

// Carica le 3 notizie di attualità di oggi (visibili a tutti).
export async function fetchCurrentNews(language: 'it' | 'en'): Promise<NewsItem[]> {
  const today = new Date().toISOString().split('T')[0];
  const q = query(
    collection(db, 'articles'),
    where('date', '==', today),
    where('articleType', '==', 'current'),
  );
  const snap = await getDocs(q);
  return snap.docs
    .sort((a, b) => (a.data().order ?? 0) - (b.data().order ?? 0))
    .map(d => docToNewsItem(d, language));
}

// Carica le Top Odd News di oggi (isTopOdd = true) — visibili a tutti, leggibili solo dai Premium.
export async function fetchTopOddNews(language: 'it' | 'en'): Promise<NewsItem[]> {
  const today = new Date().toISOString().split('T')[0];
  const q = query(
    collection(db, 'articles'),
    where('date', '==', today),
    where('isTopOdd', '==', true),
  );
  const snap = await getDocs(q);
  return snap.docs
    .sort((a, b) => (a.data().order ?? 0) - (b.data().order ?? 0))
    .map(d => docToNewsItem(d, language));
}

// Carica gli articoli "Non dovresti leggerla" di oggi — solo Premium.
export async function fetchForbiddenNews(language: 'it' | 'en'): Promise<NewsItem[]> {
  const today = new Date().toISOString().split('T')[0];
  const q = query(
    collection(db, 'articles'),
    where('date', '==', today),
    where('articleType', '==', 'forbidden'),
  );
  const snap = await getDocs(q);
  return snap.docs
    .sort((a, b) => (a.data().order ?? 0) - (b.data().order ?? 0))
    .map(d => docToNewsItem(d, language));
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

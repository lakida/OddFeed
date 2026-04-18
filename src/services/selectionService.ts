// OddFeed — Servizio di selezione notizie e categorie
// Weighted random, anti-ripetizione, logica free/premium

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Category, CategoryConfig, NewsItem } from '../types';
import { CATEGORY_CONFIG, CATEGORY_MAP, FREE_CATEGORIES } from '../data/categoryConfig';

// ─── COSTANTI ────────────────────────────────────────────────────────────────
const ANTI_REPEAT_WINDOW = 3;          // non ripetere le ultime N categorie
const STORAGE_KEY_LAST_CATS = '@oddfeed_last_categories';
const STORAGE_KEY_SEEN_NEWS  = '@oddfeed_seen_news';
const STORAGE_KEY_TOP_NEWS   = '@oddfeed_top_news_date';
const MAX_SEEN_NEWS_MEMORY   = 50;     // ricorda le ultime 50 notizie viste

// ─── WEIGHTED RANDOM ─────────────────────────────────────────────────────────

/**
 * Seleziona un elemento da una lista con probabilità proporzionale ai pesi.
 * Pseudo-codice:
 *   total = sum(weights)
 *   r = random() * total
 *   cumulative = 0
 *   for each item:
 *     cumulative += item.weight
 *     if r <= cumulative → return item
 */
export function weightedRandomPick<T extends { weight: number }>(items: T[]): T {
  if (items.length === 0) throw new Error('Lista vuota');
  if (items.length === 1) return items[0];

  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let r = Math.random() * total;

  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }

  return items[items.length - 1]; // fallback
}

// ─── MEMORIA ANTI-RIPETIZIONE ─────────────────────────────────────────────────

/** Legge le ultime categorie mostrate (max ANTI_REPEAT_WINDOW) */
export async function getLastCategories(): Promise<Category[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_LAST_CATS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Salva la categoria appena mostrata in coda, mantenendo solo le ultime N */
export async function pushLastCategory(category: Category): Promise<void> {
  try {
    const last = await getLastCategories();
    const updated = [...last, category].slice(-ANTI_REPEAT_WINDOW);
    await AsyncStorage.setItem(STORAGE_KEY_LAST_CATS, JSON.stringify(updated));
  } catch {
    // ignora errori di storage
  }
}

/** Legge gli ID delle notizie già viste */
export async function getSeenNewsIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_SEEN_NEWS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Segna una notizia come vista */
export async function markNewsAsSeen(newsId: string): Promise<void> {
  try {
    const seen = await getSeenNewsIds();
    if (!seen.includes(newsId)) {
      const updated = [...seen, newsId].slice(-MAX_SEEN_NEWS_MEMORY);
      await AsyncStorage.setItem(STORAGE_KEY_SEEN_NEWS, JSON.stringify(updated));
    }
  } catch {
    // ignora
  }
}

// ─── SELEZIONE CATEGORIE ──────────────────────────────────────────────────────

/**
 * Seleziona le categorie da mostrare oggi per un utente.
 *
 * Logica:
 * 1. Filtra le categorie disponibili (free/premium)
 * 2. Interseca con le preferenze dell'utente (se selezionate)
 * 3. Esclude le ultime N categorie (anti-ripetizione)
 * 4. Applica weighted random per scegliere la categoria
 * 5. Per premium: bilancia HIGH/MEDIUM/LOW
 */
export async function selectCategoriesForToday(params: {
  isPremium: boolean;
  userPreferences: Category[];  // categorie scelte dall'utente in onboarding
  count: number;                // quante categorie/notizie selezionare (1 per free, fino a 10 per premium)
}): Promise<Category[]> {
  const { isPremium, userPreferences, count } = params;

  // 1. Pool base: categorie accessibili dall'utente
  const accessibleCategories = isPremium
    ? CATEGORY_CONFIG
    : FREE_CATEGORIES;

  // 2. Filtra per preferenze utente (se ha preferenze impostate)
  const preferenceSet = new Set(userPreferences);
  const candidatePool = userPreferences.length > 0
    ? accessibleCategories.filter(c => preferenceSet.has(c.id))
    : accessibleCategories;

  // 3. Carica ultime categorie mostrate (anti-ripetizione)
  const lastCategories = await getLastCategories();
  const lastSet = new Set(lastCategories);

  // 4. Rimuovi le categorie recenti (solo se rimangono abbastanza candidate)
  let filteredPool = candidatePool.filter(c => !lastSet.has(c.id));
  if (filteredPool.length < count) {
    // Se troppe rimosse, usa il pool completo
    filteredPool = candidatePool;
  }

  if (filteredPool.length === 0) {
    filteredPool = candidatePool; // fallback totale
  }

  // 5. Seleziona le categorie con weighted random (senza ripetizioni nella selezione)
  const selected: Category[] = [];
  let pool = [...filteredPool];

  for (let i = 0; i < count && pool.length > 0; i++) {
    const picked = weightedRandomPick(pool);
    selected.push(picked.id);
    pool = pool.filter(c => c.id !== picked.id); // evita duplicati nella stessa sessione
  }

  // 6. Salva le categorie selezionate per anti-ripetizione futura
  for (const cat of selected) {
    await pushLastCategory(cat);
  }

  return selected;
}

// ─── SELEZIONE NOTIZIE ────────────────────────────────────────────────────────

/**
 * Filtra e ordina le notizie disponibili per un utente.
 * - Esclude notizie già viste
 * - Per free: solo 1 notizia, priorità a categoria HIGH engagement
 * - Per premium: fino a 10, mix bilanciato
 */
export async function selectNewsForToday(params: {
  allNews: NewsItem[];
  isPremium: boolean;
  selectedCategories: Category[];
  maxCount: number;
}): Promise<NewsItem[]> {
  const { allNews, isPremium, selectedCategories, maxCount } = params;

  // Leggi notizie già viste
  const seenIds = await getSeenNewsIds();
  const seenSet = new Set(seenIds);

  // Filtra per categorie selezionate e non viste
  const catSet = new Set(selectedCategories);
  let candidates = allNews.filter(n =>
    catSet.has(n.category) && !seenSet.has(n.id)
  );

  // Se non ci sono notizie non viste, mostra comunque (reset parziale)
  if (candidates.length === 0) {
    candidates = allNews.filter(n => catSet.has(n.category));
  }

  // Ordina per engagement (somma reazioni)
  const scored = candidates.map(n => ({
    news: n,
    score: n.reactions.reduce((sum, r) => sum + r.count, 0) +
           (CATEGORY_MAP[n.category]?.engagementScore ?? 5) * 100,
  }));
  scored.sort((a, b) => b.score - a.score);

  // Prendi le migliori N
  return scored.slice(0, maxCount).map(s => s.news);
}

// ─── NOTIZIA DEL GIORNO ────────────────────────────────────────────────────────

/**
 * Seleziona la "Top Notizia del Giorno" — uguale per tutti gli utenti.
 * Criteri:
 * - Categoria con engagementScore >= 8
 * - Non cambia durante la giornata (salvata per data)
 * - Notizia con più reazioni totali tra le HIGH categories
 */
export async function getTopNewsOfTheDay(allNews: NewsItem[]): Promise<NewsItem | null> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    // Controlla se abbiamo già selezionato la top news di oggi
    const raw = await AsyncStorage.getItem(STORAGE_KEY_TOP_NEWS);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved.date === today && saved.newsId) {
        const found = allNews.find(n => n.id === saved.newsId);
        if (found) return found;
      }
    }
  } catch { /* ignora */ }

  // Seleziona la top news del giorno
  const highEngagementCategories = CATEGORY_CONFIG
    .filter(c => c.engagementScore >= 8)
    .map(c => c.id);

  const highNews = allNews.filter(n =>
    highEngagementCategories.includes(n.category) && n.isToday
  );

  const pool = highNews.length > 0 ? highNews : allNews;
  const scored = pool.map(n => ({
    news: n,
    score: n.reactions.reduce((sum, r) => sum + r.count, 0),
  }));
  scored.sort((a, b) => b.score - a.score);

  const topNews = scored[0]?.news ?? null;

  // Salva la scelta per oggi
  if (topNews) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_TOP_NEWS, JSON.stringify({
        date: today,
        newsId: topNews.id,
      }));
    } catch { /* ignora */ }
  }

  return topNews;
}

// ─── CONTEGGIO NOTIZIE GIORNALIERE ───────────────────────────────────────────

/** Quante notizie spettano all'utente in base a premium e livello */
export function getDailyNewsCount(isPremium: boolean, userLevel: number): number {
  if (isPremium) return 10;

  // Free: 1 base, aumenta con i livelli
  const levelBonus: Record<number, number> = {
    0: 1,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
  };
  return levelBonus[userLevel] ?? 1;
}

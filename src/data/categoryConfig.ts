// OddFeed — Configurazione categorie
// Fonte di verità per pesi, label, flag premium e logica di selezione

import { Category, CategoryConfig } from '../types';

// ─── CONFIGURAZIONE CATEGORIE ───────────────────────────────────────────────
// weight: 5=alta, 3=media, 1=bassa
// premiumOnly: le categorie esclusive richiedono abbonamento
// engagementScore: 1-10, usato per scegliere la "notizia del giorno"

export const CATEGORY_CONFIG: CategoryConfig[] = [
  // ── HIGH ENGAGEMENT – PREMIUM ONLY ──────────────────────────────────────
  {
    id: 'sesso_relazioni',
    labelIt: '💋 Sesso',
    labelEn: '💋 Sex',
    emoji: '💋',
    weight: 5,
    premiumOnly: true,
    engagementScore: 10,
  },
  {
    id: 'gossip',
    labelIt: '🌟 Gossip',
    labelEn: '🌟 Gossip',
    emoji: '🌟',
    weight: 5,
    premiumOnly: true,
    engagementScore: 9,
  },
  {
    id: 'crimini_strani',
    labelIt: '🔪 Crimini',
    labelEn: '🔪 Crimes',
    emoji: '🔪',
    weight: 5,
    premiumOnly: true,
    engagementScore: 9,
  },

  // ── HIGH ENGAGEMENT – LIBERE ─────────────────────────────────────────────
  {
    id: 'storie_assurde',
    labelIt: '🤪 Storie assurde',
    labelEn: '🤪 Absurd Stories',
    emoji: '🤪',
    weight: 5,
    premiumOnly: false,
    engagementScore: 8,
  },

  // ── MEDIUM ENGAGEMENT ────────────────────────────────────────────────────
  {
    id: 'psicologia_strana',
    labelIt: '🧠 Psicologia',
    labelEn: '🧠 Psychology',
    emoji: '🧠',
    weight: 3,
    premiumOnly: false,
    engagementScore: 7,
  },
  {
    id: 'soldi_folli',
    labelIt: '💸 Soldi folli',
    labelEn: '💸 Crazy Money',
    emoji: '💸',
    weight: 3,
    premiumOnly: false,
    engagementScore: 7,
  },
  {
    id: 'coincidenze',
    labelIt: '🌀 Coincidenze',
    labelEn: '🌀 Coincidences',
    emoji: '🌀',
    weight: 3,
    premiumOnly: false,
    engagementScore: 6,
  },
  {
    id: 'tecnologia',
    labelIt: '💻 Tecnologia',
    labelEn: '💻 Technology',
    emoji: '💻',
    weight: 3,
    premiumOnly: false,
    engagementScore: 6,
  },
  {
    id: 'record',
    labelIt: '🏆 Record',
    labelEn: '🏆 Records',
    emoji: '🏆',
    weight: 3,
    premiumOnly: false,
    engagementScore: 5,
  },

  // ── LOW ENGAGEMENT ────────────────────────────────────────────────────────
  {
    id: 'animali',
    labelIt: '🐾 Animali',
    labelEn: '🐾 Animals',
    emoji: '🐾',
    weight: 1,
    premiumOnly: false,
    engagementScore: 5,
  },
  {
    id: 'scienza',
    labelIt: '🔬 Scienza',
    labelEn: '🔬 Science',
    emoji: '🔬',
    weight: 1,
    premiumOnly: false,
    engagementScore: 4,
  },
  {
    id: 'leggi',
    labelIt: '⚖️ Leggi',
    labelEn: '⚖️ Laws',
    emoji: '⚖️',
    weight: 1,
    premiumOnly: false,
    engagementScore: 4,
  },
  {
    id: 'cultura',
    labelIt: '🌍 Cultura',
    labelEn: '🌍 Culture',
    emoji: '🌍',
    weight: 1,
    premiumOnly: false,
    engagementScore: 3,
  },
  {
    id: 'gastronomia',
    labelIt: '🍽️ Gastronomia',
    labelEn: '🍽️ Food',
    emoji: '🍽️',
    weight: 1,
    premiumOnly: false,
    engagementScore: 3,
  },
  {
    id: 'luoghi',
    labelIt: '📍 Luoghi',
    labelEn: '📍 Places',
    emoji: '📍',
    weight: 1,
    premiumOnly: false,
    engagementScore: 3,
  },
];

// Mappa rapida per accesso per ID
export const CATEGORY_MAP: Record<Category, CategoryConfig> = Object.fromEntries(
  CATEGORY_CONFIG.map(c => [c.id, c])
) as Record<Category, CategoryConfig>;

// Categorie disponibili per utenti free
export const FREE_CATEGORIES = CATEGORY_CONFIG.filter(c => !c.premiumOnly);

// Categorie premium (esclusive)
export const PREMIUM_ONLY_CATEGORIES = CATEGORY_CONFIG.filter(c => c.premiumOnly);

// Helper: ottieni label nella lingua corrente
export function getCategoryLabel(id: Category, lang: 'it' | 'en' = 'it'): string {
  const config = CATEGORY_MAP[id];
  if (!config) return id;
  return lang === 'it' ? config.labelIt : config.labelEn;
}

// Helper: ottieni emoji per una categoria
export function getCategoryEmoji(id: Category): string {
  return CATEGORY_MAP[id]?.emoji ?? '📰';
}

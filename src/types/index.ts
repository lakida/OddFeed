// OddFeed — Tipi globali TypeScript

export type Category =
  // Categorie esistenti
  | 'animali'
  | 'tecnologia'
  | 'record'
  | 'leggi'
  | 'scienza'
  | 'gastronomia'
  | 'cultura'
  | 'luoghi'
  // Nuove categorie
  | 'sesso_relazioni'
  | 'gossip'
  | 'crimini_strani'
  | 'storie_assurde'
  | 'psicologia_strana'
  | 'soldi_folli'
  | 'coincidenze'
  // Attualità
  | 'attualita'
  | 'gossip_spettacolo';

export type CategoryWeight = 'high' | 'medium' | 'low';

export interface CategoryConfig {
  id: Category;
  labelIt: string;
  labelEn: string;
  emoji: string;
  weight: number;          // 5=alta, 3=media, 1=bassa
  premiumOnly: boolean;    // se true, solo utenti premium
  engagementScore: number; // 1-10, usato per "notizia del giorno"
}

export type ReactionType = '🤯' | '😮' | '😂' | '🤔' | '❤️';

export interface Reaction {
  emoji: ReactionType;
  count: number;
  label: string;
}

export interface NewsItem {
  id: string;
  title: string;
  description: string;       // breve, per la card
  fullText: string;          // completo, per il dettaglio
  imageEmoji: string;        // emoji placeholder immagine
  imageColor: string[];      // gradiente sfondo immagine
  country: string;           // es. "🇯🇵 Giappone"
  countryCode: string;       // es. "JP"
  category: Category;
  categoryLabel: string;     // es. "🐾 Animali"
  source: string;            // es. "The Guardian"
  publishedAt: string;       // es. "3 ore fa"
  isToday: boolean;
  daysAgo: number;
  reactions: Reaction[];
  userReaction: ReactionType | null;
  articleType?: 'bizarre' | 'current'; // tipo di articolo
}

export interface UserLevel {
  level: number;
  name: string;
  emoji: string;
  minPoints: number;
  maxPoints: number;
  unlock: string;
}

export interface LeaderboardUser {
  rank: number;
  name: string;
  initial: string;
  level: string;
  points: number;
  isCurrentUser: boolean;
  isPremium: boolean;
}

// Navigazione
export type RootStackParamList = {
  MainTabs: undefined;
  Article: { newsId: string };
};

export type TabParamList = {
  Notizie: undefined;
  Punti: undefined;
  Profilo: undefined;
};

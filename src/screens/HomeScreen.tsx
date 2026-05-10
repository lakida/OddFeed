import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Image,
} from 'react-native';
import * as Haptics from 'expo-haptics';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { Colors, getColors, FontSize, Spacing, Radius } from '../theme/colors';
import { MOCK_NEWS, USER_LEVELS } from '../data/mockData';
import { useTranslation } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { fetchTodayNews, fetchRecentPastNews, fetchCurrentNews, fetchTopOddNews, fetchForbiddenNews } from '../services/newsService';
import { DAILY_NEWS_LIMITS, PREMIUM_NEWS_LIMIT } from '../../App';
import { NewsItem } from '../types';
import { UserStats } from '../../App';
import { SkeletonNewsList } from '../components/SkeletonNewsCard';

const UNREAD_COLOR = Colors.text;
const READ_COLOR   = Colors.border;

// Rimuove emoji e simboli dai titoli (surrogate pairs + simboli BMP comuni)
const cleanTitle = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/[\uD800-\uDFFF]/g, '')
    .replace(/[☀-➿]/g, '')
    .replace(/[⬀-⯿]/g, '')
    .replace(/️/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};
const cleanCatLabel = (label: string) => {
  if (!label) return '';
  return label
    .replace(/[\uD800-\uDFFF]/g, '')
    .replace(/[☀-➿]/g, '')
    .replace(/[⬀-⯿]/g, '')
    .replace(/️/g, '')
    .replace(/^[a-z]{1,3}\.\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
};

function StatusBadge({ read, t }: { read: boolean; t: any }) {
  return (
    <View style={badgeStyles.wrap}>
      <View style={[badgeStyles.badge, read && badgeStyles.badgeRead]}>
        <Text style={[badgeStyles.text, read && badgeStyles.textRead]}>
          {read ? t.home.read : t.home.unread}
        </Text>
      </View>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: UNREAD_COLOR,
  },
  badgeRead: {
    backgroundColor: READ_COLOR,
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  textRead: {
    color: Colors.textTertiary,
  },
});

interface HomeScreenProps {
  onOpenArticle: (id: string, article: NewsItem) => void;
  onGoToArchive: () => void;
  onGoToPremium?: () => void;
  onGoToPoints?: () => void;
  readIds: Set<string>;
  isPremium: boolean;
  userName: string;
  userStats: UserStats;
  interests?: string[];
  /** Sblocco one-time regalo onboarding: mostra banner nella sezione forbidden */
  freeUnlockActive?: boolean;
}

export default function HomeScreen({ onOpenArticle, onGoToArchive, onGoToPremium, onGoToPoints, readIds, isPremium, userName, userStats, interests = [], freeUnlockActive = false }: HomeScreenProps) {
  const { t, language } = useTranslation();
  const { isDark } = useTheme();
  const C = getColors(isDark);
  const [todayNews, setTodayNews] = useState<NewsItem[]>([]);
  const [pastNews, setPastNews] = useState<NewsItem[]>([]);
  const [currentNews, setCurrentNews] = useState<NewsItem[]>([]);
  const [topOddNews, setTopOddNews] = useState<NewsItem[]>([]);
  const [forbiddenNews, setForbiddenNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Limite notizie basato su livello + premium
  const newsLimit = isPremium
    ? PREMIUM_NEWS_LIMIT
    : (DAILY_NEWS_LIMITS[userStats?.level ?? 0] ?? 1);

  const loadNews = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setHasError(false);
    Promise.all([
      fetchTodayNews(language, isPremium, interests, newsLimit).catch(() => []),
      fetchRecentPastNews(language, isPremium, newsLimit, interests).catch(() => []),
      fetchCurrentNews(language).catch(() => []),
      fetchTopOddNews(language).catch(() => []),
      fetchForbiddenNews(language).catch(() => []),
    ]).then(([todayArr, pastArr, currentArr, topOddArr, forbiddenArr]) => {
      // Deduplicazione: rimuovi da today/past gli articoli già presenti in topOdd
      const topOddIds = new Set(topOddArr.map((n) => n.id));
      const today = todayArr.filter((n) => !topOddIds.has(n.id));
      const remaining = Math.max(0, newsLimit - today.length);
      const past = pastArr.filter((n) => !topOddIds.has(n.id)).slice(0, remaining);
      setTodayNews(today);
      setPastNews(past);
      setCurrentNews(currentArr);
      setTopOddNews(topOddArr);
      setForbiddenNews(forbiddenArr);
      // Se nessuna notizia ricevuta, segnala errore
      if (today.length === 0 && past.length === 0 && currentArr.length === 0) {
        setHasError(true);
      }
      if (isRefresh) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }).catch(() => {
      setHasError(true);
    }).finally(() => {
      setLoading(false);
      setRefreshing(false);
    });
  }, [language, isPremium, newsLimit]);

  useEffect(() => { loadNews(); }, [loadNews]);


  // Livello e progresso reali
  const currentLevel = USER_LEVELS[userStats.level] ?? USER_LEVELS[0];
  const nextLevel = USER_LEVELS[userStats.level + 1];
  const progress = nextLevel
    ? (userStats.points - currentLevel.minPoints) / (nextLevel.minPoints - currentLevel.minPoints)
    : 1;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadNews(true)}
            tintColor={C.textTertiary}
          />
        }
      >
        {/* Header violet */}
        <View style={[styles.heroArea, { backgroundColor: C.hero }]}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroKicker}>BENVENUTO · OGGI</Text>
              <Text style={styles.heroTitle}>OddFeed</Text>
              <Text style={[styles.heroSubtitle, { color: C.heroSubtext }]}>
                {isPremium ? t.home.todayNewsPlural : t.home.todayNews}
              </Text>
            </View>
            <Text style={styles.heroEmoji}>🌍</Text>
          </View>
        </View>

        {/* ── Sezione Attualità ── */}
        {!loading && currentNews.length > 0 && (
          <View style={[currentStyles.section, { borderBottomColor: C.border }]}>
            <View style={currentStyles.secHdr}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Ionicons name="newspaper-outline" size={22} color={Colors.violet} />
                <Text style={[currentStyles.sectionTitle, { color: '#1E1B4B' }]}>ATTUALITÀ</Text>
              </View>
              <TouchableOpacity onPress={onGoToArchive}>
                <Text style={currentStyles.secHdrLink}>Vedi tutte ›</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={currentStyles.row}
            >
              {currentNews.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[currentStyles.card, { backgroundColor: C.cardWhite, borderColor: C.border }]}
                  onPress={() => onOpenArticle(item.id, item)}
                  activeOpacity={0.75}
                >
                  {/* Immagine con pill categoria */}
                  <View style={currentStyles.cardImgWrap}>
                    <Image
                      source={{ uri: item.imageUrl || `https://picsum.photos/seed/${item.id}/380/180` }}
                      style={currentStyles.cardImg}
                    />
                    <View style={currentStyles.cardPill}>
                      <Text style={currentStyles.cardPillText}>{cleanCatLabel(item.categoryLabel ?? item.category)}</Text>
                    </View>
                  </View>
                  <View style={currentStyles.cardBody}>
                    <Text style={[currentStyles.cardTitle, { color: C.text }]} numberOfLines={2}>
                      {cleanTitle(item.title)}
                    </Text>
                    <Text style={[currentStyles.cardSource, { color: C.textTertiary }]}>
                      {item.source} · {item.publishedAt}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── NON DOVRESTI LEGGERE ── */}
        {!loading && (forbiddenNews.length > 0 || !isPremium) && (
          <View style={ndlStyles.container}>
            {/* Header */}
            <View style={ndlStyles.header}>
              <View style={ndlStyles.lockBox}>
                <Ionicons name="lock-closed-outline" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ndlStyles.headerTitle}>NON DOVRESTI LEGGERE ✨</Text>
                <Text style={ndlStyles.headerSub}>Alcune storie sono troppo assurde per essere vere. O forse no.</Text>
              </View>
            </View>

            {/* PREMIUM: articoli reali sbloccati */}
            {isPremium && forbiddenNews.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={ndlStyles.row}
                onPress={() => onOpenArticle(item.id, item)}
                activeOpacity={0.75}
              >
                <View style={[ndlStyles.rowLock, { backgroundColor: 'rgba(99,102,241,0.4)' }]}>
                  <Text style={{ fontSize: 16 }}>{item.imageEmoji}</Text>
                </View>
                <View style={ndlStyles.rowBody}>
                  <Text style={ndlStyles.rowTitle} numberOfLines={2}>{cleanTitle(item.title)}</Text>
                  {!!item.description && (
                    <Text style={ndlStyles.rowBlur} numberOfLines={1}>{item.description}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward-outline" size={14} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            ))}

            {/* FREE + regalo sbloccato: primo articolo accessibile */}
            {!isPremium && freeUnlockActive && forbiddenNews.length > 0 && (
              <TouchableOpacity
                style={ndlStyles.row}
                onPress={() => onOpenArticle(forbiddenNews[0].id, forbiddenNews[0])}
                activeOpacity={0.75}
              >
                <View style={[ndlStyles.rowLock, { backgroundColor: 'rgba(99,102,241,0.4)' }]}>
                  <Text style={{ fontSize: 14 }}>🔓</Text>
                </View>
                <View style={ndlStyles.rowBody}>
                  <Text style={ndlStyles.rowTitle} numberOfLines={2}>{forbiddenNews[0].title}</Text>
                  <Text style={[ndlStyles.rowBlur, { color: 'rgba(255,255,255,0.6)' }]}>🎁 Sbloccato per te</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={14} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            )}

            {/* FREE senza regalo: 2 righe bloccate con testo oscurato */}
            {!isPremium && !freeUnlockActive && ([
              'La scoperta che potrebbe cambiare tutto ciò che sappiamo',
              'Il segreto che le aziende non vogliono che tu conosca',
            ] as string[]).map((title, i) => (
              <TouchableOpacity key={i} style={ndlStyles.row} onPress={onGoToPremium} activeOpacity={0.75}>
                <View style={ndlStyles.rowLock}>
                  <Ionicons name="lock-closed-outline" size={14} color="rgba(255,255,255,0.5)" />
                </View>
                <View style={ndlStyles.rowBody}>
                  <Text style={ndlStyles.rowTitle}>{title}</Text>
                  <Text style={ndlStyles.rowBlurText} numberOfLines={2}>
                    {i === 0
                      ? 'Una scoperta sconvolgente che sta cambiando tutto quello che credevamo di sapere...'
                      : 'Il dettaglio nascosto che nessuno vuole che tu conosca davvero fino in fondo...'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={14} color="rgba(255,255,255,0.35)" />
              </TouchableOpacity>
            ))}

            {/* Gold CTA — solo per utenti free */}
            {!isPremium && (
              <TouchableOpacity style={ndlStyles.cta} onPress={onGoToPremium} activeOpacity={0.85}>
                <Text style={{ fontSize: 20 }}>👑</Text>
                <Text style={ndlStyles.ctaText}>Scopri Premium e leggi tutto senza limiti</Text>
                <Text style={{ fontSize: 11, color: '#5C3A00', opacity: 0.75 }}>✦</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Skeleton mentre carica */}
        {loading && <SkeletonNewsList count={4} variant="row" />}

        {/* Errore / nessuna notizia */}
        {!loading && hasError && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📡</Text>
            <Text style={[styles.emptyTitle, { color: C.text }]}>Connessione assente</Text>
            <Text style={[styles.emptySub, { color: C.textSecondary }]}>Controlla la connessione e riprova.</Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: C.text }]}
              onPress={() => loadNews()}
              activeOpacity={0.8}
            >
              <Text style={styles.retryBtnText}>Riprova</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Ultime Notizie ── */}
        {!loading && (todayNews.length > 0 || pastNews.length > 0) && (
          <View style={[currentStyles.secHdr, { paddingTop: 14, paddingBottom: 8 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Ionicons name="time-outline" size={22} color={Colors.violet} />
              <Text style={[currentStyles.sectionTitle, { color: '#1E1B4B' }]}>ULTIME NOTIZIE</Text>
            </View>
            <TouchableOpacity onPress={onGoToArchive}>
              <Text style={currentStyles.secHdrLink}>Vedi tutte ›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Notizie di oggi */}
        {!loading && todayNews.map((item, idx) => {
          const isRead = readIds.has(item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.unRow, { borderBottomColor: C.border, borderBottomWidth: idx === todayNews.length - 1 && pastNews.length === 0 ? 0 : 0.5 }]}
              onPress={() => onOpenArticle(item.id, item)}
              activeOpacity={0.7}
            >
              <Image
                source={{ uri: `https://picsum.photos/seed/${item.id}/152/128` }}
                style={styles.unThumb}
              />
              <View style={styles.unBody}>
                <Text style={[styles.itemTitle, { color: C.text, marginBottom: 3 }]} numberOfLines={2}>{cleanTitle(item.title)}</Text>
                <Text style={[styles.itemMeta, { color: C.textTertiary, marginBottom: 2 }]}>{item.source} · {item.publishedAt}</Text>
                <Text style={[styles.unCat, { color: Colors.violet }]}>{cleanCatLabel(item.categoryLabel ?? item.category)}</Text>
              </View>
              <Ionicons name="bookmark-outline" size={18} color={C.textTertiary} />
            </TouchableOpacity>
          );
        })}

        {/* Notizie dai giorni precedenti */}
        {!loading && pastNews.map((item, idx) => {
          const isRead = readIds.has(item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.unRow, { borderBottomColor: C.border, borderBottomWidth: idx === pastNews.length - 1 ? 0 : 0.5 }]}
              onPress={() => onOpenArticle(item.id, item)}
              activeOpacity={0.7}
            >
              <Image
                source={{ uri: `https://picsum.photos/seed/${item.id}/152/128` }}
                style={styles.unThumb}
              />
              <View style={styles.unBody}>
                <Text style={[styles.itemTitle, { color: C.text, marginBottom: 3 }]} numberOfLines={2}>{cleanTitle(item.title)}</Text>
                <Text style={[styles.itemMeta, { color: C.textTertiary, marginBottom: 2 }]}>{item.source} · {item.publishedAt}</Text>
                <Text style={[styles.unCat, { color: Colors.violet }]}>{cleanCatLabel(item.categoryLabel ?? item.category)}</Text>
              </View>
              <Ionicons name="bookmark-outline" size={18} color={C.textTertiary} />
            </TouchableOpacity>
          );
        })}

        {/* ── I tuoi punti banner ── */}
        {!loading && (
          <TouchableOpacity
            style={[ptsBannerStyles.container, { backgroundColor: C.bg2, borderColor: C.border }]}
            onPress={onGoToPoints}
            activeOpacity={0.75}
          >
            <View style={ptsBannerStyles.body}>
              <Text style={[ptsBannerStyles.label, { color: C.textSecondary }]}>I TUOI PUNTI</Text>
              <Text style={ptsBannerStyles.value}>{userStats.points.toLocaleString('it')} pts</Text>
              <Text style={[ptsBannerStyles.sub, { color: C.textSecondary }]}>
                Accumula punti leggendo notizie e ottieni vantaggi esclusivi!
              </Text>
            </View>
            <View style={ptsBannerStyles.btn}>
              <Ionicons name="gift-outline" size={15} color="#fff" />
              <Text style={ptsBannerStyles.btnText}>Scopri i premi</Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  heroArea: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 16,
    paddingBottom: 16,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroKicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 33,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  heroSubtitle: {
    fontSize: 13,
    marginTop: 3,
  },
  heroEmoji: {
    fontSize: 72,
    lineHeight: 80,
    marginTop: 4,
  },

  // Ultime Notizie rows
  unRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
  },
  unThumb: {
    width: 76,
    height: 64,
    borderRadius: 10,
    flexShrink: 0,
    overflow: 'hidden',
  },
  unThumbEmoji: {
    fontSize: 28,
  },
  unBody: {
    flex: 1,
    minWidth: 0,
  },
  unCat: {
    fontSize: 11,
    fontWeight: '700',
  },
  readDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.violet,
    flexShrink: 0,
  },

  // Notizie
  item: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemRead: {
    opacity: 0.4,
  },
  itemMeta: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  itemDescription: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sourceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.green,
  },
  itemSource: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  itemDot: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  itemTime: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },

  premiumBanner: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: '#FFFCF0',
    borderWidth: 1,
    borderColor: '#F0D98A',
    borderRadius: Radius.md,
  },
  premiumBannerText: {
    fontSize: FontSize.sm,
    color: '#7A6010',
    fontWeight: '500',
  },
  // CTA archivio
  ctaArchive: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: Colors.text,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#fff',
  },

  // Empty / error state
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 48,
    gap: 8,
  },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.text,
  },
  retryBtnText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#fff',
  },

  // Widget punti
  pointsWidget: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pwTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  pwTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  pwStreak: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#4F46E5',
  },
  pwBarBg: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  pwBarFill: {
    height: 4,
    backgroundColor: '#4F46E5',
    borderRadius: 2,
  },
  pwHint: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
});

// Stili sezione attualità
const currentStyles = StyleSheet.create({
  section: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
  },
  secHdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 0,
    marginBottom: Spacing.md,
  },
  secHdrIcon: {
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E1B4B',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  secHdrLink: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.violet,
  },
  row: {
    paddingHorizontal: Spacing.lg,
    gap: 10,
  },
  card: {
    width: 190,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  cardImgWrap: {
    height: 90,
    position: 'relative',
  },
  cardImg: {
    height: 90,
    width: '100%',
  },
  cardImgEmoji: {
    fontSize: 36,
  },
  cardPill: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.violet,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cardPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  cardBody: {
    paddingTop: 10,
    paddingHorizontal: 11,
    paddingBottom: 12,
    gap: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 4,
  },
  cardSource: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    marginTop: 2,
  },
});

// Stili Top Odd News
const topOddStyles = StyleSheet.create({
  card: {
    width: 210,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    gap: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#dc2626',
  },
  lockBadge: {
    backgroundColor: '#ede9fe',
    borderWidth: 1,
    borderColor: '#c4b5fd',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  lockText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6d28d9',
  },
  paywallHint: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    fontStyle: 'italic',
    lineHeight: 14,
  },
});

// Stili "Non dovresti leggerla"
const forbiddenStyles = StyleSheet.create({
  // Contenitore sezione — sfondo scuro per enfatizzare il carattere "proibito"
  section: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    backgroundColor: '#1E1B4B',
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#9ca3af',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },

  // Articolo leggibile (per PREMIUM o freeUnlock)
  itemPremium: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#1f1f35',
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  badge: {
    backgroundColor: '#7c3aed',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  badgeGift: { backgroundColor: '#059669' },
  titlePremium: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#f3f4f6',
    lineHeight: 24,
  },
  subtitlePremium: {
    fontSize: FontSize.xs,
    color: '#9ca3af',
    lineHeight: 16,
  },
  sourcePremium: {
    fontSize: FontSize.xs,
    color: '#6b7280',
    fontWeight: '500',
  },

  // Card bloccata per FREE — dark overlay
  lockedContainer: {
    paddingHorizontal: Spacing.lg,
    gap: 10,
    paddingBottom: Spacing.sm,
  },
  darkCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#2d2d4e',
    padding: Spacing.md,
    gap: 6,
    alignItems: 'flex-start',
  },
  lockIcon: {
    fontSize: 20,
  },
  blurredTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#374151',
    letterSpacing: 2,
    lineHeight: 22,
  },
  lockedHint: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: '#6b7280',
  },

  // Banner regalo onboarding
  giftBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: 8,
    backgroundColor: '#1e1b4b',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#4338ca',
  },
  giftBannerText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#a5b4fc',
    textAlign: 'center',
  },
});

// ── Stili NDL block (NON DOVRESTI LEGGERE) ──────────────────────────────────
const ndlStyles = StyleSheet.create({
  container: {
    marginHorizontal: 14,
    marginBottom: 16,
    backgroundColor: '#1E1B4B',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.10)',
  },
  lockBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(79,70,229,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 17,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  rowLock: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 18,
    marginBottom: 4,
  },
  rowBlur: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    lineHeight: 15,
  },
  rowBlurText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.42)',
    lineHeight: 17,
    marginTop: 3,
    textShadowColor: 'rgba(255,255,255,0.85)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 9,
  },
  cta: {
    margin: 10,
    marginHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#FFD340',
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#C47D0A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 5,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1917',
    letterSpacing: 0.1,
    flexShrink: 1,
  },
});

// ── Stili banner punti ────────────────────────────────────────────────────────
const ptsBannerStyles = StyleSheet.create({
  container: {
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 0.5,
    padding: 13,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  value: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.violet,
    letterSpacing: -0.5,
    lineHeight: 26,
    marginBottom: 3,
  },
  sub: {
    fontSize: 11,
    lineHeight: 15,
  },
  btn: {
    backgroundColor: Colors.violet,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  btnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
});

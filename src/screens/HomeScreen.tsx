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
import { LinearGradient } from 'expo-linear-gradient';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { Colors, getColors, FontSize, Spacing, Radius } from '../theme/colors';
import { useTranslation } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { fetchTodayNews, fetchRecentPastNews, fetchCurrentNews, fetchTopOddNews } from '../services/newsService';
import { NewsItem } from '../types';
import { SkeletonNewsList } from '../components/SkeletonNewsCard';
import { formatDate } from '../utils/date';
import NativeAdCard from '../components/ads/NativeAdCard';
import { NATIVE_AD_EVERY_N } from '../ads/adConfig';
import HeroHeader from '../components/HeroHeader';
import { getCategoryGradient, CATEGORY_ICONS } from '../utils/categoryStyles';

const UNREAD_COLOR = Colors.text;
const READ_COLOR   = Colors.border;
const VIOLET       = Colors.violet;

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
    fontSize: 13,
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
  readIds: Set<string>;
  interests?: string[];
  savedIds?: Set<string>;
  onToggleSave?: (id: string, article: NewsItem) => void;
}

export default function HomeScreen({ onOpenArticle, onGoToArchive, readIds, interests = [], savedIds = new Set(), onToggleSave }: HomeScreenProps) {
  const { t, language } = useTranslation();
  const { isDark } = useTheme();
  const C = getColors(isDark);
  const [todayNews, setTodayNews] = useState<NewsItem[]>([]);
  const [pastNews, setPastNews] = useState<NewsItem[]>([]);
  const [currentNews, setCurrentNews] = useState<NewsItem[]>([]);
  const [topOddNews, setTopOddNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);

  const loadNews = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setHasError(false);
    Promise.all([
      fetchTodayNews(language, interests, 10).catch(() => []),
      fetchRecentPastNews(language, interests, 2, 7).catch(() => []),
      fetchCurrentNews(language).catch(() => []),
      fetchTopOddNews(language).catch(() => []),
    ]).then(([todayArr, pastArr, currentArr, topOddArr]) => {
      const topOddIds = new Set(topOddArr.map((n) => n.id));
      const today = todayArr.filter((n) => !topOddIds.has(n.id));
      setTodayNews(today);
      setPastNews(pastArr.filter((n) => !topOddIds.has(n.id)));
      setCurrentNews(currentArr);
      setTopOddNews(topOddArr);
      if (today.length === 0 && pastArr.length === 0 && currentArr.length === 0) {
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
  }, [language, interests]);

  useEffect(() => { loadNews(); }, [loadNews]);


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
        <HeroHeader
          titleDark="Odd"
          titleViolet="Feed"
          subtitle={t.home.todayNewsPlural}
        />

        {/* ── Sezione Attualità ── */}
        {!loading && currentNews.length > 0 && (
          <View style={[currentStyles.section, { borderBottomColor: C.border }]}>
            <View style={currentStyles.secHdr}>
              <Text style={[currentStyles.sectionTitle, { color: '#1E1B4B' }]}>ATTUALITÀ</Text>
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

                  {/* Layout tipografico — sempre, indipendentemente dall'immagine */}
                  <View style={currentStyles.cardBodyTypo}>
                    <View style={[currentStyles.typoAccent, { backgroundColor: getCategoryGradient(item.category)[0] }]} />
                    <View style={currentStyles.typoInner}>
                      <Text style={currentStyles.typoPill}>{(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())(cleanCatLabel(item.categoryLabel ?? item.category))}</Text>
                      <Text style={[currentStyles.typoTitle, { color: C.text }]} numberOfLines={3}>
                        {cleanTitle(item.title)}
                      </Text>
                      <Text style={[currentStyles.cardSource, { color: C.textTertiary, marginTop: 3 }]}>
                        {item.source} · {formatDate(item.publishedAt)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
          <View style={currentStyles.section}>
            <View style={currentStyles.secHdr}>
              <Text style={[currentStyles.sectionTitle, { color: '#1E1B4B' }]}>ULTIME NOTIZIE BIZZARRE</Text>
              <TouchableOpacity onPress={onGoToArchive}>
                <Text style={currentStyles.secHdrLink}>Vedi tutte ›</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Notizie (oggi + giorni precedenti) con NativeAdCard ogni N items */}
        {!loading && (() => {
          const allNews = [...todayNews, ...pastNews];
          return allNews.map((item, idx) => {
            const isLast = idx === allNews.length - 1;
            // Inserisce un'ad card dopo ogni NATIVE_AD_EVERY_N° articolo
            const showAdAfter = (idx + 1) % NATIVE_AD_EVERY_N === 0 && !isLast;
            return (
              <React.Fragment key={item.id}>
                <TouchableOpacity
                  style={[styles.unRow, { borderBottomColor: C.border, borderBottomWidth: isLast && !showAdAfter ? 0 : 0.5 }]}
                  onPress={() => onOpenArticle(item.id, item)}
                  activeOpacity={0.7}
                >
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.unThumb} />
                  ) : (
                    <LinearGradient
                      colors={getCategoryGradient(item.category)}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.unThumb, { alignItems: 'center', justifyContent: 'center' }]}
                    >
                      <Ionicons
                        name={CATEGORY_ICONS[item.category] ?? 'newspaper-outline'}
                        size={34}
                        color="rgba(255,255,255,0.30)"
                      />
                    </LinearGradient>
                  )}
                  <View style={styles.unBody}>
                    <Text style={[styles.unCat, { color: Colors.violet, marginBottom: 3 }]}>{cleanCatLabel(item.categoryLabel ?? item.category)}</Text>
                    <Text style={[styles.itemTitle, { color: C.text, marginBottom: 5 }]} numberOfLines={2}>{cleanTitle(item.title)}</Text>
                    <Text style={[styles.itemMeta, { color: C.textTertiary }]}>{item.source} · {formatDate(item.publishedAt)}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); onToggleSave?.(item.id, item); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={savedIds.has(item.id) ? 'bookmark' : 'bookmark-outline'}
                      size={22}
                      color={savedIds.has(item.id) ? Colors.violet : C.textTertiary}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
                {showAdAfter && (
                  <NativeAdCard />
                )}
              </React.Fragment>
            );
          });
        })()}

        {/* ── CTA Archivio ── */}
        {!loading && (
          <TouchableOpacity
            style={styles.ctaBanner}
            onPress={onGoToArchive}
            activeOpacity={0.85}
          >
            <View style={styles.ctaLeft}>
              <Text style={styles.ctaLabel}>ARCHIVIO COMPLETO</Text>
              <Text style={styles.ctaTitle}>Tutte le notizie assurde</Text>
              <Text style={styles.ctaSub}>Cerca, filtra e salva gli articoli che ami</Text>
            </View>
            <View style={styles.ctaArrow}>
              <Ionicons name="arrow-forward" size={24} color={VIOLET} />
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

  // Ultime Notizie rows
  dateDivider: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    marginTop: 4,
  },
  dateDividerText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  unRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 13,
  },
  unThumb: {
    width: 69,
    height: 83,
    borderRadius: 10,
    flexShrink: 0,
    overflow: 'hidden',
  },
  unThumbEmoji: {
    fontSize: 41,
  },
  unBody: {
    flex: 1,
    minWidth: 0,
  },
  unCat: {
    fontSize: 13,
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
    fontSize: 17,
    fontWeight: '900',
    color: Colors.text,
    lineHeight: 24,
    marginBottom: Spacing.xs,
  },
  itemDescription: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    lineHeight: 26,
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
  ctaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: '#F0EEFF',
    borderWidth: 1,
    borderColor: 'rgba(85, 64, 255, 0.18)',
  },
  ctaLeft: { flex: 1 },
  ctaLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: Colors.violet,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  ctaTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#080A35',
    marginBottom: 3,
  },
  ctaSub: {
    fontSize: 14,
    color: '#8884AA',
    lineHeight: 20,
  },
  ctaArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(85,64,255,0.15)',
    marginLeft: 12,
    flexShrink: 0,
  },

  // Empty / error state
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 48,
    gap: 8,
  },
  emptyEmoji: { fontSize: 53 },
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
    lineHeight: 26,
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
    paddingBottom: 0,
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
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1E1B4B',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  secHdrLink: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.violet,
  },
  row: {
    paddingHorizontal: Spacing.lg,
    gap: 10,
  },
  card: {
    width: 248,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  cardImgWrap: {
    height: 130,
    position: 'relative',
  },
  cardImg: {
    height: 130,
    width: '100%',
  },
  cardImgEmoji: {
    fontSize: 43,
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
    fontSize: 11,
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
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 23,
    marginBottom: 4,
  },
  cardSource: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    marginTop: 2,
  },

  // Layout tipografico (nessuna immagine)
  cardBodyTypo: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 150,
  },
  typoAccent: {
    width: 4,
    borderBottomLeftRadius: 10,
    borderTopLeftRadius: 10,
  },
  typoInner: {
    flex: 1,
    padding: 12,
    gap: 6,
  },
  typoPill: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.violet,
    marginBottom: 2,
  },
  typoTitle: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 25,
    flex: 1,
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
    fontSize: 12,
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
    fontSize: 12,
    fontWeight: '800',
    color: '#6d28d9',
  },
  paywallHint: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    fontStyle: 'italic',
    lineHeight: 17,
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
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  badgeGift: { backgroundColor: '#059669' },
  titlePremium: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#f3f4f6',
    lineHeight: 29,
  },
  subtitlePremium: {
    fontSize: FontSize.xs,
    color: '#9ca3af',
    lineHeight: 19,
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
    fontSize: 24,
  },
  blurredTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#374151',
    letterSpacing: 2,
    lineHeight: 26,
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
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 20,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 22,
    marginBottom: 4,
  },
  rowBlur: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    lineHeight: 18,
  },
  rowBlurText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.42)',
    lineHeight: 20,
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
    fontSize: 14,
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
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  value: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.violet,
    letterSpacing: -0.5,
    lineHeight: 31,
    marginBottom: 3,
  },
  sub: {
    fontSize: 13,
    lineHeight: 18,
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
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
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
  readIds: Set<string>;
  isPremium: boolean;
  userName: string;
  userStats: UserStats;
  interests?: string[];
}

export default function HomeScreen({ onOpenArticle, onGoToArchive, readIds, isPremium, userName, userStats, interests = [] }: HomeScreenProps) {
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

  // Limite notizie basato su livello + premium
  const newsLimit = isPremium
    ? PREMIUM_NEWS_LIMIT
    : (DAILY_NEWS_LIMITS[userStats?.level ?? 0] ?? 1);

  const loadNews = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    Promise.all([
      fetchTodayNews(language, isPremium, interests, newsLimit).catch(() => []),
      fetchRecentPastNews(language, isPremium, newsLimit, interests).catch(() => []),
      fetchCurrentNews(language).catch(() => []),
      fetchTopOddNews(language).catch(() => []),
      fetchForbiddenNews(language).catch(() => []),
    ]).then(([todayArr, pastArr, currentArr, topOddArr, forbiddenArr]) => {
      const today = todayArr;
      const remaining = Math.max(0, newsLimit - today.length);
      const past = pastArr.slice(0, remaining);
      setTodayNews(today);
      setPastNews(past);
      setCurrentNews(currentArr);
      setTopOddNews(topOddArr);
      setForbiddenNews(forbiddenArr);
      if (isRefresh) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }).finally(() => {
      setLoading(false);
      setRefreshing(false);
    });
  }, [language, isPremium, newsLimit]);

  useEffect(() => { loadNews(); }, [loadNews]);

  // Auto-scroll "In primo piano"
  const currentScrollRef = useRef<ScrollView>(null);
  const currentIndexRef = useRef(0);
  const CARD_WIDTH = 210; // card 200 + gap 10

  useEffect(() => {
    if (currentNews.length < 2) return;
    const interval = setInterval(() => {
      currentIndexRef.current = (currentIndexRef.current + 1) % currentNews.length;
      currentScrollRef.current?.scrollTo({
        x: currentIndexRef.current * CARD_WIDTH,
        animated: true,
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [currentNews]);

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
        {/* Header + Saluto unificati con sfondo colorato */}
        <View style={[styles.heroArea, { backgroundColor: C.hero }]}>
          {/* Cerchi decorativi di sfondo */}
          <View style={[styles.circle1, { backgroundColor: C.heroCircle1 }]} />
          <View style={[styles.circle2, { backgroundColor: C.heroCircle2 }]} />
          <View style={styles.circle3} />

          {/* Logo */}
          <Text style={[styles.logo, { color: C.logoMain }]}>
            Odd<Text style={[styles.logoLight, { color: C.logoLight }]}>Feed</Text>
          </Text>

          {/* Saluto */}
          <Text style={[styles.greetingText, { color: C.heroText }]}>{t.home.greeting(userName)}</Text>
          <Text style={[styles.greetingSubtitle, { color: C.heroSubtext }]}>
            {isPremium ? t.home.todayNewsPlural : t.home.todayNews}
          </Text>
        </View>

        {/* ── Sezione Attualità ── */}
        {!loading && currentNews.length > 0 && (
          <View style={[currentStyles.section, { borderBottomColor: C.border }]}>
            <Text style={[currentStyles.sectionTitle, { color: C.textTertiary }]}>📰 IN PRIMO PIANO</Text>
            <ScrollView
              ref={currentScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={currentStyles.row}
              onMomentumScrollEnd={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                currentIndexRef.current = Math.round(x / CARD_WIDTH);
              }}
            >
              {currentNews.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[currentStyles.card, { backgroundColor: C.bg2, borderColor: C.border }]}
                  onPress={() => onOpenArticle(item.id, item)}
                  activeOpacity={0.75}
                >
                  <Text style={[currentStyles.cardCategory, { color: C.violet }]}>
                    {item.categoryLabel}
                  </Text>
                  <Text style={[currentStyles.cardTitle, { color: C.text }]} numberOfLines={3}>
                    {item.title}
                  </Text>
                  <Text style={[currentStyles.cardSource, { color: C.textTertiary }]}>
                    {item.source}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Top Odd News ── */}
        {!loading && topOddNews.length > 0 && (
          <View style={[currentStyles.section, { borderBottomColor: C.border }]}>
            <View style={currentStyles.sectionHeaderRow}>
              <Text style={[currentStyles.sectionTitle, { color: C.textTertiary }]}>🔥 TOP ODD NEWS</Text>
              {!isPremium && (
                <View style={[currentStyles.sectionBadge, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                  <Text style={[currentStyles.sectionBadgeText, { color: '#dc2626' }]}>Solo Premium</Text>
                </View>
              )}
            </View>
            <Text style={[currentStyles.sectionSubtitle, { color: C.textTertiary }]}>Le 3 più assurde di oggi. Selezionate per te.</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={currentStyles.row}
            >
              {topOddNews.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[topOddStyles.card, { backgroundColor: C.bg2, borderColor: isPremium ? C.border : '#fecaca' }]}
                  onPress={() => onOpenArticle(item.id, item)}
                  activeOpacity={0.75}
                >
                  <View style={topOddStyles.badgeRow}>
                    <View style={topOddStyles.badge}>
                      <Text style={topOddStyles.badgeText}>🔥 TOP</Text>
                    </View>
                    {!isPremium && (
                      <View style={topOddStyles.lockBadge}>
                        <Text style={topOddStyles.lockText}>🔒</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[currentStyles.cardTitle, { color: C.text }]} numberOfLines={3}>
                    {item.title}
                  </Text>
                  {!isPremium && (
                    <Text style={[topOddStyles.paywallHint, { color: '#dc2626' }]}>
                      Tutti la vedono. Solo alcuni possono leggerla.
                    </Text>
                  )}
                  <Text style={[currentStyles.cardSource, { color: C.textTertiary }]}>
                    {item.source}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Non dovresti leggerla ── */}
        {!loading && (forbiddenNews.length > 0 || !isPremium) && (
          <View style={[currentStyles.section, { borderBottomColor: C.border }]}>
            <View style={currentStyles.sectionHeaderRow}>
              <Text style={[currentStyles.sectionTitle, { color: C.textTertiary }]}>🚫 NON DOVRESTI LEGGERLA</Text>
              {!isPremium && (
                <View style={[currentStyles.sectionBadge, { backgroundColor: '#1e1b4b', borderColor: '#3730a3' }]}>
                  <Text style={[currentStyles.sectionBadgeText, { color: '#e0e7ff' }]}>💎 Esclusiva</Text>
                </View>
              )}
            </View>
            <Text style={[currentStyles.sectionSubtitle, { color: C.textTertiary }]}>Le storie che non ti aspetti. Solo per chi ha coraggio.</Text>

            {isPremium && forbiddenNews.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[forbiddenStyles.item, { borderBottomColor: C.border }]}
                onPress={() => onOpenArticle(item.id, item)}
                activeOpacity={0.75}
              >
                <View style={forbiddenStyles.badgeRow}>
                  <View style={forbiddenStyles.badge}>
                    <Text style={forbiddenStyles.badgeText}>🚫 NON DOVRESTI</Text>
                  </View>
                </View>
                <Text style={[forbiddenStyles.title, { color: C.text }]} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={[forbiddenStyles.source, { color: C.textTertiary }]}>{item.source}</Text>
              </TouchableOpacity>
            ))}

            {!isPremium && (
              <View style={forbiddenStyles.lockedContainer}>
                <View style={[forbiddenStyles.lockedCard, { backgroundColor: C.bg2, borderColor: C.border }]}>
                  <View style={forbiddenStyles.badgeRow}>
                    <View style={forbiddenStyles.badge}>
                      <Text style={forbiddenStyles.badgeText}>🚫 NON DOVRESTI</Text>
                    </View>
                  </View>
                  <Text style={[forbiddenStyles.blurredTitle]} numberOfLines={2}>
                    {'█████████ ████ ███████████████ ████████'}
                  </Text>
                  <Text style={[forbiddenStyles.lockedHint, { color: C.textTertiary }]}>
                    Solo per abbonati Premium
                  </Text>
                </View>
                <View style={[forbiddenStyles.lockedCard, { backgroundColor: C.bg2, borderColor: C.border }]}>
                  <View style={forbiddenStyles.badgeRow}>
                    <View style={forbiddenStyles.badge}>
                      <Text style={forbiddenStyles.badgeText}>🚫 NON DOVRESTI</Text>
                    </View>
                  </View>
                  <Text style={forbiddenStyles.blurredTitle} numberOfLines={2}>
                    {'██████████████████ ████ █████████'}
                  </Text>
                  <Text style={[forbiddenStyles.lockedHint, { color: C.textTertiary }]}>
                    Solo per abbonati Premium
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Skeleton mentre carica */}
        {loading && <SkeletonNewsList count={3} />}

        {/* Notizie di oggi (multiple per livelli alti / premium) */}
        {!loading && todayNews.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.item, { borderBottomColor: C.border }]}
            onPress={() => onOpenArticle(item.id, item)}
            activeOpacity={0.7}
          >
            <StatusBadge read={readIds.has(item.id)} t={t} />
            <Text style={[styles.itemMeta, { color: C.textTertiary }]}>{item.country} · {item.categoryLabel}</Text>
            <Text style={[styles.itemTitle, { color: C.text }]}>{item.title}</Text>
            <View style={styles.itemFooter}>
              <View style={styles.sourceDot} />
              <Text style={[styles.itemSource, { color: C.textSecondary }]}>{item.source}</Text>
              <Text style={[styles.itemDot, { color: C.textTertiary }]}>·</Text>
              <Text style={[styles.itemTime, { color: C.textTertiary }]}>{item.publishedAt}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Notizie dai giorni precedenti */}
        {!loading && pastNews.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.item, { borderBottomColor: C.border }]}
            onPress={() => onOpenArticle(item.id, item)}
            activeOpacity={0.7}
          >
            <StatusBadge read={readIds.has(item.id)} t={t} />
            <Text style={[styles.itemMeta, { color: C.textTertiary }]}>{item.country} · {item.categoryLabel}</Text>
            <Text style={[styles.itemTitle, { color: C.text }]}>{item.title}</Text>
            <View style={styles.itemFooter}>
              <View style={styles.sourceDot} />
              <Text style={[styles.itemSource, { color: C.textSecondary }]}>{item.source}</Text>
              <Text style={[styles.itemDot, { color: C.textTertiary }]}>·</Text>
              <Text style={[styles.itemTime, { color: C.textTertiary }]}>{item.publishedAt}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Banner premium per utenti free */}
        {!loading && !isPremium && (
          <View style={[styles.premiumBanner, { backgroundColor: C.premiumBannerBg, borderColor: C.premiumBannerBorder }]}>
            <Text style={[styles.premiumBannerText, { color: C.premiumBannerText }]}>
              {t.home.premiumBanner}
            </Text>
          </View>
        )}

        {/* CTA archivio */}
        {!loading && (
          <TouchableOpacity style={[styles.ctaArchive, { backgroundColor: C.text }]} onPress={onGoToArchive} activeOpacity={0.7}>
            <Text style={styles.ctaText}>{t.common.allNews}</Text>
          </TouchableOpacity>
        )}

        {/* Widget punti */}
        <View style={[styles.pointsWidget, { backgroundColor: C.bg2, borderColor: C.border }]}>
          <View style={styles.pwTop}>
            <Text style={[styles.pwTitle, { color: C.textSecondary }]}>{currentLevel.emoji} {currentLevel.name} · {userStats.points} pt</Text>
            <Text style={styles.pwStreak}>🔥 {userStats.streak}gg</Text>
          </View>
          <View style={[styles.pwBarBg, { backgroundColor: C.border }]}>
            <View style={[styles.pwBarFill, { flex: Math.min(Math.max(progress, 0), 1) }]} />
            <View style={{ flex: Math.max(1 - progress, 0) }} />
          </View>
          <Text style={[styles.pwHint, { color: C.textTertiary }]}>
            {nextLevel
              ? `${nextLevel.minPoints - userStats.points} pt per diventare ${nextLevel.name} ${nextLevel.emoji}`
              : 'Hai raggiunto il livello massimo! 🏆'}
          </Text>
        </View>

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
    backgroundColor: '#EEF2FF',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  // Cerchi decorativi
  circle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#C7D2FE',
    opacity: 0.35,
    top: -60,
    right: -40,
  },
  circle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#A5B4FC',
    opacity: 0.2,
    bottom: -30,
    left: 30,
  },
  circle3: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#818CF8',
    opacity: 0.12,
    top: 20,
    right: 100,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#3730A3',
    letterSpacing: -1,
    marginBottom: Spacing.lg,
  },
  logoLight: {
    fontWeight: '300',
    color: '#6366F1',
  },
  greetingText: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: '#1E1B4B',
    marginBottom: 4,
  },
  greetingSubtitle: {
    fontSize: FontSize.base,
    color: '#4338CA',
    opacity: 0.8,
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
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: Spacing.xs,
  },
  itemTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 24,
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
    color: '#6366F1',
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
    backgroundColor: '#6366F1',
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: 2,
    gap: 8,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  sectionSubtitle: {
    fontSize: FontSize.xs,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    opacity: 0.7,
  },
  sectionBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  sectionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  row: {
    paddingHorizontal: Spacing.lg,
    gap: 10,
  },
  card: {
    width: 200,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 6,
  },
  cardCategory: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cardTitle: {
    fontSize: FontSize.base,
    fontWeight: '600',
    lineHeight: 21,
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
  item: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  badge: {
    backgroundColor: '#dc2626',
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
  title: {
    fontSize: FontSize.base,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 4,
  },
  source: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  lockedContainer: {
    paddingHorizontal: Spacing.lg,
    gap: 10,
    paddingBottom: Spacing.md,
  },
  lockedCard: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 6,
  },
  blurredTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#d1d5db',
    letterSpacing: 2,
    lineHeight: 22,
  },
  lockedHint: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
});

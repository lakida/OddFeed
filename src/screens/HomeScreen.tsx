import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Vibration,
} from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../theme/colors';
import { MOCK_NEWS, USER_LEVELS } from '../data/mockData';
import { useTranslation } from '../context/LanguageContext';
import { fetchTodayNews, fetchRecentPastNews } from '../services/newsService';
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
  const [todayNews, setTodayNews] = useState<NewsItem | null>(null);
  const [pastNews, setPastNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNews = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    Promise.all([
      fetchTodayNews(language, isPremium, interests).catch(() => []),
      fetchRecentPastNews(language, isPremium, 2, interests).catch(() => []),
    ]).then(([todayArr, pastArr]) => {
      setTodayNews(todayArr[0] ?? MOCK_NEWS[0]);
      setPastNews(pastArr.length > 0 ? pastArr : MOCK_NEWS.slice(1, 3));
      if (isRefresh) {
        Vibration.vibrate(80);
      }
    }).finally(() => {
      setLoading(false);
      setRefreshing(false);
    });
  }, [language, isPremium]);

  useEffect(() => { loadNews(); }, [loadNews]);

  // Livello e progresso reali
  const currentLevel = USER_LEVELS[userStats.level] ?? USER_LEVELS[0];
  const nextLevel = USER_LEVELS[userStats.level + 1];
  const progress = nextLevel
    ? (userStats.points - currentLevel.minPoints) / (nextLevel.minPoints - currentLevel.minPoints)
    : 1;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadNews(true)}
            tintColor={Colors.textTertiary}
          />
        }
      >
        {/* Header + Saluto unificati con sfondo colorato */}
        <View style={styles.heroArea}>
          {/* Cerchi decorativi di sfondo */}
          <View style={styles.circle1} />
          <View style={styles.circle2} />
          <View style={styles.circle3} />

          {/* Logo */}
          <Text style={styles.logo}>
            Odd<Text style={styles.logoLight}>Feed</Text>
          </Text>

          {/* Saluto */}
          <Text style={styles.greetingText}>{t.home.greeting(userName)}</Text>
          <Text style={styles.greetingSubtitle}>
            {isPremium ? t.home.todayNewsPlural : t.home.todayNews}
          </Text>
        </View>

        {/* Skeleton mentre carica */}
        {loading && <SkeletonNewsList count={3} />}

        {/* Notizia di oggi */}
        {!loading && todayNews && (
          <TouchableOpacity
            style={styles.item}
            onPress={() => onOpenArticle(todayNews.id, todayNews)}
            activeOpacity={0.7}
          >
            <StatusBadge read={readIds.has(todayNews.id)} t={t} />
            <Text style={styles.itemMeta}>{todayNews.country} · {todayNews.categoryLabel}</Text>
            <Text style={styles.itemTitle}>{todayNews.title}</Text>
            <View style={styles.itemFooter}>
              <View style={styles.sourceDot} />
              <Text style={styles.itemSource}>{todayNews.source}</Text>
              <Text style={styles.itemDot}>·</Text>
              <Text style={styles.itemTime}>{todayNews.publishedAt}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* 2 notizie dai giorni precedenti — visibili a tutti */}
        {!loading && pastNews.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.item}
            onPress={() => onOpenArticle(item.id, item)}
            activeOpacity={0.7}
          >
            <StatusBadge read={readIds.has(item.id)} t={t} />
            <Text style={styles.itemMeta}>{item.country} · {item.categoryLabel}</Text>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <View style={styles.itemFooter}>
              <View style={styles.sourceDot} />
              <Text style={styles.itemSource}>{item.source}</Text>
              <Text style={styles.itemDot}>·</Text>
              <Text style={styles.itemTime}>{item.publishedAt}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Banner premium per utenti free */}
        {!loading && !isPremium && (
          <View style={styles.premiumBanner}>
            <Text style={styles.premiumBannerText}>
              {t.home.premiumBanner}
            </Text>
          </View>
        )}

        {/* CTA archivio */}
        {!loading && (
          <TouchableOpacity style={styles.ctaArchive} onPress={onGoToArchive} activeOpacity={0.7}>
            <Text style={styles.ctaText}>{t.common.allNews}</Text>
          </TouchableOpacity>
        )}

        {/* Widget punti */}
        <View style={styles.pointsWidget}>
          <View style={styles.pwTop}>
            <Text style={styles.pwTitle}>{currentLevel.emoji} {currentLevel.name} · {userStats.points} pt</Text>
            <Text style={styles.pwStreak}>🔥 {userStats.streak}gg</Text>
          </View>
          <View style={styles.pwBarBg}>
            <View style={[styles.pwBarFill, { flex: Math.min(Math.max(progress, 0), 1) }]} />
            <View style={{ flex: Math.max(1 - progress, 0) }} />
          </View>
          <Text style={styles.pwHint}>
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

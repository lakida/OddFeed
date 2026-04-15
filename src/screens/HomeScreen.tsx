import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../theme/colors';
import { MOCK_NEWS, MOCK_USER } from '../data/mockData';
import { useTranslation } from '../context/LanguageContext';
import { fetchTodayNews } from '../services/newsService';
import { NewsItem } from '../types';

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
  onOpenArticle: (id: string) => void;
  onGoToArchive: () => void;
  readIds: Set<string>;
  isPremium: boolean;
}

export default function HomeScreen({ onOpenArticle, onGoToArchive, readIds, isPremium }: HomeScreenProps) {
  const { t, language } = useTranslation();
  const [showBanner, setShowBanner] = useState(true);
  const [allNews, setAllNews] = useState<NewsItem[]>(MOCK_NEWS);

  useEffect(() => {
    fetchTodayNews(language, isPremium)
      .then(news => { if (news.length > 0) setAllNews(news); })
      .catch(() => {}); // fallback ai mock
  }, [language, isPremium]);

  const todayNews = allNews.find((n) => n.isToday) ?? allNews[0];
  const recentNews = allNews.filter((n) => n.id !== (todayNews?.id ?? '')).slice(0, isPremium ? 9 : 2);

  const pointsToday = 18;
  const progress =
    (MOCK_USER.points - MOCK_USER.level.minPoints) /
    (MOCK_USER.level.maxPoints - MOCK_USER.level.minPoints);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
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
          <Text style={styles.greetingText}>{t.home.greeting(MOCK_USER.name)}</Text>
          <Text style={styles.greetingSubtitle}>
            {isPremium ? t.home.todayNewsPlural : t.home.todayNews}
          </Text>
        </View>

        {/* Notizia di oggi */}
        {todayNews && (
          <TouchableOpacity
            style={styles.item}
            onPress={() => onOpenArticle(todayNews.id)}
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

        {/* Ultime 3 notizie */}
        {recentNews.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.item}
            onPress={() => onOpenArticle(item.id)}
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
        {!isPremium && (
          <View style={styles.premiumBanner}>
            <Text style={styles.premiumBannerText}>
              {t.home.premiumBanner}
            </Text>
          </View>
        )}

        {/* CTA archivio */}
        <TouchableOpacity style={styles.ctaArchive} onPress={onGoToArchive} activeOpacity={0.7}>
          <Text style={styles.ctaText}>{t.common.allNews}</Text>
        </TouchableOpacity>

        {/* Widget punti */}
        <View style={styles.pointsWidget}>
          <View style={styles.pwTop}>
            <Text style={styles.pwTitle}>{t.homeWidget.title}</Text>
            <Text style={styles.pwPoints}>{t.homeWidget.earned(pointsToday)}</Text>
          </View>
          <View style={styles.pwBarBg}>
            <View style={[styles.pwBarFill, { flex: Math.min(progress, 1) }]} />
            <View style={{ flex: Math.max(1 - progress, 0) }} />
          </View>
          <Text style={styles.pwHint}>
            {t.homeWidget.hint}
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
  pwPoints: {
    fontSize: FontSize.md,
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

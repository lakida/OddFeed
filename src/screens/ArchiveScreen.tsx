import React, { useState, useEffect, useCallback } from 'react';
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
import { MOCK_NEWS } from '../data/mockData';
import { useTranslation } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { fetchArchive } from '../services/newsService';
import { DAILY_NEWS_LIMITS, PREMIUM_NEWS_LIMIT } from '../../App';
import { NewsItem } from '../types';
import { SkeletonNewsList } from '../components/SkeletonNewsCard';

interface ArchiveScreenProps {
  onOpenArticle: (id: string, article: NewsItem) => void;
  isPremium: boolean;
  interests?: string[];
  userStats?: { level: number; points: number; streak: number; readArticleIds: string[] };
}

export default function ArchiveScreen({ onOpenArticle, isPremium, interests = [], userStats }: ArchiveScreenProps) {
  const { t, language } = useTranslation();
  const { isDark } = useTheme();
  const C = getColors(isDark);

  // Limite notizie basato su livello + premium
  const newsLimit = isPremium
    ? PREMIUM_NEWS_LIMIT
    : (DAILY_NEWS_LIMITS[userStats?.level ?? 0] ?? 1);
  const [activeFilter, setActiveFilter] = useState('tutto');
  const [archiveNews, setArchiveNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadArchive = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    fetchArchive(language, isPremium, interests, newsLimit)
      .then(news => {
        setArchiveNews(news.length > 0 ? news : MOCK_NEWS);
        if (isRefresh) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      })
      .catch(() => { setArchiveNews(MOCK_NEWS); })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [language, isPremium, interests, newsLimit]);

  useEffect(() => { loadArchive(); }, [loadArchive]);

  // Filtri dinamici: "Tutto" + mese corrente + categorie presenti negli articoli
  const dynamicFilters = React.useMemo(() => {
    const now = new Date();
    const monthNames = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
      'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
    const currentMonth = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

    // Categorie uniche presenti negli articoli, con la label localizzata
    const seen = new Set<string>();
    const cats: { key: string; label: string }[] = [];
    archiveNews.forEach(n => {
      if (!seen.has(n.category)) {
        seen.add(n.category);
        cats.push({ key: n.category, label: n.categoryLabel ?? n.category });
      }
    });

    return [
      { key: 'tutto', label: 'Tutto' },
      { key: 'settimana', label: 'Questa settimana' },
      { key: currentMonth, label: currentMonth },
      ...cats,
    ];
  }, [archiveNews]);

  // Applica il filtro attivo agli articoli
  const filteredNews = React.useMemo(() => {
    if (activeFilter === 'tutto') return archiveNews;

    if (activeFilter === 'settimana') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const cutoff = weekAgo.toISOString().split('T')[0];
      return archiveNews.filter(n => (n.publishedAt ?? '') >= cutoff);
    }

    // Filtro per mese (es. "Aprile 2026")
    const monthNames: Record<string, string> = {
      'gennaio':'01','febbraio':'02','marzo':'03','aprile':'04',
      'maggio':'05','giugno':'06','luglio':'07','agosto':'08',
      'settembre':'09','ottobre':'10','novembre':'11','dicembre':'12',
    };
    const monthMatch = activeFilter.match(/^(\w+)\s+(\d{4})$/);
    if (monthMatch) {
      const m = monthNames[monthMatch[1].toLowerCase()];
      const y = monthMatch[2];
      if (m) return archiveNews.filter(n => n.publishedAt?.startsWith(`${y}-${m}`));
    }

    // Filtro per categoria
    return archiveNews.filter(n => n.category === activeFilter);
  }, [archiveNews, activeFilter]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <View style={[styles.heroArea, { backgroundColor: C.hero }]}>
        <View style={[styles.circle1, { backgroundColor: C.heroCircle1 }]} />
        <View style={[styles.circle2, { backgroundColor: C.heroCircle2 }]} />
        <Text style={[styles.logo, { color: C.logoMain }]}>
          Odd<Text style={[styles.logoLight, { color: C.logoLight }]}>Feed</Text>
        </Text>
        <Text style={[styles.headerTitle, { color: C.heroText }]}>{t.archive.title}</Text>
        <Text style={[styles.headerSubtitle, { color: C.heroSubtext }]}>Tutte le notizie passate, in un posto solo.</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadArchive(true)}
            tintColor={C.textTertiary}
          />
        }
      >
        {/* Banner premium per utenti free */}
        {!isPremium && (
          <View style={[styles.premiumBanner, { backgroundColor: C.premiumBannerBg, borderColor: C.premiumBannerBorder }]}>
            <Text style={[styles.premiumBannerText, { color: C.premiumBannerText }]}>{t.archive.freeBanner}</Text>
          </View>
        )}

        {/* Filtri */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {dynamicFilters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterPill,
                { borderColor: C.border },
                activeFilter === f.key && { backgroundColor: C.text, borderColor: C.text },
              ]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Text style={[
                styles.filterPillText,
                { color: C.textSecondary },
                activeFilter === f.key && { color: '#fff', fontWeight: '600' },
              ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Skeleton mentre carica */}
        {loading && <SkeletonNewsList count={5} />}

        {/* Lista notizie */}
        {!loading && filteredNews.length === 0 && (
          <Text style={{ textAlign: 'center', color: C.textTertiary, marginTop: 40, fontSize: FontSize.base }}>
            Nessuna notizia per questo filtro.
          </Text>
        )}
        {!loading && filteredNews.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.item, { borderBottomColor: C.border }]}
            onPress={() => onOpenArticle(item.id, item)}
            activeOpacity={0.7}
          >
            <Text style={[styles.itemMeta, { color: C.textTertiary }]}>
              {item.country} · {item.categoryLabel}
            </Text>
            <Text style={[styles.itemTitle, { color: C.text }]} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.itemFooter}>
              <View style={styles.sourceDot} />
              <Text style={[styles.itemSource, { color: C.textSecondary }]}>{item.source}</Text>
              <Text style={[styles.itemDot, { color: C.textTertiary }]}>·</Text>
              <Text style={[styles.itemTime, { color: C.textTertiary }]}>{item.publishedAt}</Text>
            </View>
          </TouchableOpacity>
        ))}

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
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E1B4B',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: FontSize.base,
    color: '#4338CA',
    opacity: 0.8,
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
    lineHeight: 18,
  },
  filtersRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterPillActive: {
    backgroundColor: Colors.text,
    borderColor: Colors.text,
  },
  filterPillText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  filterPillTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  item: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
});

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
import { Colors, FontSize, Spacing, Radius } from '../theme/colors';
import { MOCK_NEWS } from '../data/mockData';
import { useTranslation } from '../context/LanguageContext';
import { fetchArchive } from '../services/newsService';
import { NewsItem } from '../types';
import { SkeletonNewsList } from '../components/SkeletonNewsCard';

interface ArchiveScreenProps {
  onOpenArticle: (id: string, article: NewsItem) => void;
  isPremium: boolean;
  interests?: string[];
}

const FILTERS = ['Tutto', 'Questa settimana', 'Aprile 2026', 'Animali', 'Record', 'Leggi'];

export default function ArchiveScreen({ onOpenArticle, isPremium, interests = [] }: ArchiveScreenProps) {
  const { t, language } = useTranslation();
  const [activeFilter, setActiveFilter] = useState(t.archive.filters[0]);
  const [archiveNews, setArchiveNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadArchive = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    fetchArchive(language, isPremium, interests)
      .then(news => { setArchiveNews(news.length > 0 ? news : MOCK_NEWS); })
      .catch(() => { setArchiveNews(MOCK_NEWS); })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [language, isPremium, interests]);

  useEffect(() => { loadArchive(); }, [loadArchive]);

  // Filtra gli articoli in base al filtro attivo
  const filteredNews = React.useMemo(() => {
    const f = activeFilter;
    if (!f || f === t.archive.filters[0]) return archiveNews; // "Tutto"

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    // Filtri temporali
    if (f === 'Questa settimana' || f === 'This week') {
      return archiveNews.filter(n => n.publishedAt >= weekAgoStr);
    }
    // Filtro per mese (es. "Aprile 2026")
    const monthMatch = f.match(/(\w+)\s+(\d{4})/);
    if (monthMatch) {
      const monthNames: Record<string, string> = {
        'gennaio': '01', 'febbraio': '02', 'marzo': '03', 'aprile': '04',
        'maggio': '05', 'giugno': '06', 'luglio': '07', 'agosto': '08',
        'settembre': '09', 'ottobre': '10', 'novembre': '11', 'dicembre': '12',
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'may': '05', 'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12',
      };
      const month = monthNames[monthMatch[1].toLowerCase()];
      const year = monthMatch[2];
      if (month) return archiveNews.filter(n => n.publishedAt?.startsWith(`${year}-${month}`));
    }
    // Filtri per categoria (es. "Animali", "Record", "Leggi")
    const categoryMap: Record<string, string> = {
      'animali': 'animali', 'animals': 'animali',
      'record': 'record',
      'leggi': 'leggi', 'laws': 'leggi',
      'gossip': 'gossip',
      'tecnologia': 'tecnologia', 'technology': 'tecnologia',
      'cultura': 'cultura', 'culture': 'cultura',
      'crimini': 'crimini_strani', 'crimes': 'crimini_strani',
    };
    const cat = categoryMap[f.toLowerCase()];
    if (cat) return archiveNews.filter(n => n.category === cat);

    return archiveNews;
  }, [archiveNews, activeFilter, t.archive.filters]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.heroArea}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <Text style={styles.logo}>
          Odd<Text style={styles.logoLight}>Feed</Text>
        </Text>
        <Text style={styles.headerTitle}>{t.archive.title}</Text>
        <Text style={styles.headerSubtitle}>Tutte le notizie passate, in un posto solo.</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadArchive(true)}
            tintColor={Colors.textTertiary}
          />
        }
      >
        {/* Banner premium per utenti free */}
        {!isPremium && (
          <View style={styles.premiumBanner}>
            <Text style={styles.premiumBannerText}>{t.archive.freeBanner}</Text>
          </View>
        )}

        {/* Filtri */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {t.archive.filters.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterPill, activeFilter === f && styles.filterPillActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterPillText, activeFilter === f && styles.filterPillTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Skeleton mentre carica */}
        {loading && <SkeletonNewsList count={5} />}

        {/* Lista notizie */}
        {!loading && filteredNews.length === 0 && (
          <Text style={{ textAlign: 'center', color: Colors.textTertiary, marginTop: 40, fontSize: FontSize.base }}>
            Nessuna notizia per questo filtro.
          </Text>
        )}
        {!loading && filteredNews.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.item}
            onPress={() => onOpenArticle(item.id, item)}
            activeOpacity={0.7}
          >
            <Text style={styles.itemMeta}>
              {item.country} · {item.categoryLabel}
            </Text>
            <Text style={styles.itemTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.itemFooter}>
              <View style={styles.sourceDot} />
              <Text style={styles.itemSource}>{item.source}</Text>
              <Text style={styles.itemDot}>·</Text>
              <Text style={styles.itemTime}>{item.publishedAt}</Text>
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

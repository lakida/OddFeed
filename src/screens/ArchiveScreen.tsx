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
  TextInput,
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
import { formatDate } from '../utils/date';
import BannerAdSlot from '../components/ads/BannerAdSlot';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';

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

function formatArchiveDate(publishedAt: string): string {
  return formatDate(publishedAt);
}

interface ArchiveScreenProps {
  onOpenArticle: (id: string, article: NewsItem) => void;
  isPremium: boolean;
  interests?: string[];
  userStats?: { level: number; points: number; streak: number; readArticleIds: string[] };
  savedIds?: Set<string>;
  savedArticles?: NewsItem[];
  onToggleSave?: (id: string, article: NewsItem) => void;
}

export default function ArchiveScreen({ onOpenArticle, isPremium, interests = [], userStats, savedIds = new Set(), savedArticles = [], onToggleSave }: ArchiveScreenProps) {
  const { t, language } = useTranslation();
  const { isDark } = useTheme();
  const C = getColors(isDark);

  // Limite notizie basato su livello + premium
  const newsLimit = isPremium
    ? PREMIUM_NEWS_LIMIT
    : (DAILY_NEWS_LIMITS[userStats?.level ?? 0] ?? 1);
  const [activeFilter, setActiveFilter] = useState('tutto');
  const [searchQuery, setSearchQuery] = useState('');
  const [archiveNews, setArchiveNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);

  const loadArchive = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setHasError(false);
    fetchArchive(language, isPremium, interests, newsLimit)
      .then(news => {
        setArchiveNews(news);
        if (isRefresh) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      })
      .catch(() => {
        setArchiveNews([]);
        setHasError(true);
      })
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
      { key: 'salvati', label: 'Salvati' },
      { key: 'settimana', label: 'Questa settimana' },
      { key: currentMonth, label: currentMonth },
      ...cats,
    ];
  }, [archiveNews]);

  // Applica il filtro attivo agli articoli
  const filteredNews = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let base: NewsItem[];
    if (activeFilter === 'tutto') base = archiveNews;
    else if (activeFilter === 'salvati') base = savedArticles;
    else if (activeFilter === 'settimana') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const cutoff = weekAgo.toISOString().split('T')[0];
      base = archiveNews.filter(n => (n.publishedAt ?? '') >= cutoff);
    } else {
      const monthNames2: Record<string, string> = {
        'gennaio':'01','febbraio':'02','marzo':'03','aprile':'04',
        'maggio':'05','giugno':'06','luglio':'07','agosto':'08',
        'settembre':'09','ottobre':'10','novembre':'11','dicembre':'12',
      };
      const monthMatch2 = activeFilter.match(/^(\w+)\s+(\d{4})$/);
      if (monthMatch2) {
        const m2 = monthNames2[monthMatch2[1].toLowerCase()];
        const y2 = monthMatch2[2];
        base = m2 ? archiveNews.filter(n => n.publishedAt?.startsWith(`${y2}-${m2}`)) : archiveNews;
      } else {
        base = archiveNews.filter(n => n.category === activeFilter);
      }
    }
    if (!q) return base;
    return base.filter(n => (n.title ?? '').toLowerCase().includes(q) || (n.source ?? '').toLowerCase().includes(q));
  }, [archiveNews, activeFilter, savedArticles, searchQuery]);


  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <View style={[styles.heroArea, { backgroundColor: C.hero }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroKicker}>Storico completo</Text>
            <Text style={styles.heroTitle}>{t.archive.title}</Text>
            <Text style={[styles.heroSubtitle, { color: C.heroSubtext }]}>Tutte le notizie assurde</Text>
          </View>
          <Text style={styles.heroEmoji}>🗄️</Text>
        </View>
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
        {/* Search bar */}
        <View style={[styles.searchRow, { borderColor: C.border, backgroundColor: C.bg2 }]}>
          <Text style={[styles.searchIcon, { color: C.textTertiary }]}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: C.text }]}
            placeholder="Cerca notizie..."
            placeholderTextColor={C.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={{ fontSize: 16, color: C.textTertiary, paddingRight: 4 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

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
                activeFilter === f.key && { backgroundColor: '#EEF2FF', borderColor: Colors.violet },
              ]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Text style={[
                styles.filterPillText,
                { color: C.textSecondary },
                activeFilter === f.key && { color: Colors.violet, fontWeight: '700' },
              ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Count row */}
        {!loading && (
          <View style={styles.countRow}>
            <Text style={[styles.countText, { color: C.textTertiary }]}>{filteredNews.length} notizie trovate</Text>
          </View>
        )}

        {/* Skeleton mentre carica */}
        {loading && <SkeletonNewsList count={5} variant="card" />}

        {/* Lista notizie */}
        {!loading && hasError && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📡</Text>
            <Text style={[styles.emptyTitle, { color: C.text }]}>Connessione assente</Text>
            <Text style={[styles.emptySub, { color: C.textSecondary }]}>Controlla la connessione e riprova.</Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: C.text }]}
              onPress={() => loadArchive()}
              activeOpacity={0.8}
            >
              <Text style={styles.retryBtnText}>Riprova</Text>
            </TouchableOpacity>
          </View>
        )}
        {!loading && !hasError && filteredNews.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{activeFilter === 'salvati' ? '🔖' : '📭'}</Text>
            <Text style={[styles.emptyTitle, { color: C.text }]}>
              {activeFilter === 'salvati' ? 'Nessun articolo salvato' : 'Nessuna notizia'}
            </Text>
            <Text style={[styles.emptySub, { color: C.textSecondary }]}>
              {activeFilter === 'salvati'
                ? 'Premi 🔖 su un articolo per salvarlo e ritrovarlo qui.'
                : 'Nessuna notizia per questo filtro.'}
            </Text>
          </View>
        )}
        {!loading && filteredNews.map((item, idx) => {
          const isSaved = savedIds.has(item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.unRow, { borderBottomColor: C.border, borderBottomWidth: idx === filteredNews.length - 1 ? 0 : 0.5 }]}
              onPress={() => onOpenArticle(item.id, item)}
              activeOpacity={0.7}
            >
              <Image source={{ uri: `https://picsum.photos/seed/${item.id}/152/128` }} style={styles.unThumb} />
              <View style={styles.unBody}>
                <Text style={[styles.unTitle, { color: C.text }]} numberOfLines={2}>{cleanTitle(item.title)}</Text>
                <Text style={[styles.unMeta, { color: C.textTertiary }]}>{item.source} · {formatArchiveDate(item.publishedAt)}</Text>
                <Text style={[styles.unCat, { color: Colors.violet }]}>{cleanCatLabel(item.categoryLabel ?? item.category)}</Text>
              </View>
              <TouchableOpacity
                onPress={() => onToggleSave?.(item.id, item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isSaved ? 'bookmark' : 'bookmark-outline'}
                  size={18}
                  color={isSaved ? Colors.violet : C.textTertiary}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}

        {/* Banner ad — fondo archivio (solo utenti free) */}
        {!loading && <BannerAdSlot isPremium={isPremium} />}

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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 0.5,
    gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    padding: 0,
  },
  filtersRow: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  filterPillActive: {
    backgroundColor: Colors.text,
    borderColor: Colors.text,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
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
  savedBadge: {
    fontSize: FontSize.sm,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 8,
  },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
    color: Colors.text,
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
  countRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6 },
  countText: { fontSize: 11, fontWeight: '500', color: Colors.textSecondary },
  sortText: { fontSize: 11, fontWeight: '700' },
  unRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  unThumb: { width: 76, height: 64, borderRadius: 10, flexShrink: 0 },
  unThumbEmoji: { fontSize: 24 },
  unBody: { flex: 1, minWidth: 0 },
  unCat: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 3 },
  unTitle: { fontSize: 14, fontWeight: '700', lineHeight: 19, marginBottom: 3 },
  unMeta: { fontSize: 11 },
});

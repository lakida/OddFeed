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
import { Colors, getColors, FontSize, Spacing, Radius } from '../theme/colors';
import { useTranslation } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { fetchArchive } from '../services/newsService';
import HeroHeader from '../components/HeroHeader';
import { NewsItem } from '../types';
import { SkeletonNewsList } from '../components/SkeletonNewsCard';
import { formatDate } from '../utils/date';
import BannerAdSlot from '../components/ads/BannerAdSlot';
import { getCategoryGradient, CATEGORY_ICONS } from '../utils/categoryStyles';
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
  interests?: string[];
  savedIds?: Set<string>;
  onToggleSave?: (id: string, article: NewsItem) => void;
}

export default function ArchiveScreen({ onOpenArticle, interests = [], savedIds = new Set(), onToggleSave }: ArchiveScreenProps) {
  const { t, language } = useTranslation();
  const { isDark } = useTheme();
  const C = getColors(isDark);

  const [activeFilter, setActiveFilter] = useState('tutto');
  const [archiveNews, setArchiveNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);

  const loadArchive = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setHasError(false);
    fetchArchive(language, interests)
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
  }, [language, interests]);

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
    const monthNames2: Record<string, string> = {
      'gennaio':'01','febbraio':'02','marzo':'03','aprile':'04',
      'maggio':'05','giugno':'06','luglio':'07','agosto':'08',
      'settembre':'09','ottobre':'10','novembre':'11','dicembre':'12',
    };
    const monthMatch2 = activeFilter.match(/^(\w+)\s+(\d{4})$/);
    if (monthMatch2) {
      const m2 = monthNames2[monthMatch2[1].toLowerCase()];
      const y2 = monthMatch2[2];
      return m2 ? archiveNews.filter(n => n.publishedAt?.startsWith(`${y2}-${m2}`)) : archiveNews;
    }
    return archiveNews.filter(n => n.category === activeFilter);
  }, [archiveNews, activeFilter]);


  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <HeroHeader
        kicker="STORICO COMPLETO"
        titleDark={t.archive.title}
        subtitle="Tutte le notizie assurde"
        titleSize={30}
      />

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
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={[styles.emptyTitle, { color: C.text }]}>Nessuna notizia</Text>
            <Text style={[styles.emptySub, { color: C.textSecondary }]}>
              Nessuna notizia per questo filtro.
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
                <Text style={[styles.unTitle, { color: C.text, marginBottom: 5 }]} numberOfLines={2}>{cleanTitle(item.title)}</Text>
                <Text style={[styles.unMeta, { color: C.textTertiary }]}>{item.source} · {formatArchiveDate(item.publishedAt)}</Text>
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
        {!loading && <BannerAdSlot />}

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
  unRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.lg, paddingVertical: 13 },
  unThumb: { width: 99, height: 83, borderRadius: 10, flexShrink: 0, overflow: 'hidden' },
  unBody: { flex: 1, minWidth: 0 },
  unCat: { fontSize: 13, fontWeight: '700' },
  unTitle: { fontSize: 17, fontWeight: '600', lineHeight: 24 },
  unMeta: { fontSize: FontSize.xs, color: Colors.textTertiary },
});

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
import { MOCK_NEWS } from '../data/mockData';
import { useTranslation } from '../context/LanguageContext';
import { fetchArchive } from '../services/newsService';
import { NewsItem } from '../types';

interface ArchiveScreenProps {
  onOpenArticle: (id: string, article: NewsItem) => void;
  isPremium: boolean;
}

const FILTERS = ['Tutto', 'Questa settimana', 'Aprile 2026', 'Animali', 'Record', 'Leggi'];

export default function ArchiveScreen({ onOpenArticle, isPremium }: ArchiveScreenProps) {
  const { t, language } = useTranslation();
  const [activeFilter, setActiveFilter] = useState(t.archive.filters[0]);
  const [archiveNews, setArchiveNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    fetchArchive(language, isPremium)
      .then(news => { setArchiveNews(news.length > 0 ? news : MOCK_NEWS); })
      .catch(() => { setArchiveNews(MOCK_NEWS); });
  }, [language, isPremium]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.archive.title}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
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

        {/* Lista notizie */}
        {archiveNews.map((item) => (
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
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
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

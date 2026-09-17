import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  TextInput,
} from 'react-native';
import { Colors, getColors, FontSize, Spacing, Radius } from '../theme/colors';
import { useTranslation } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import HeroHeader from '../components/HeroHeader';
import { NewsItem } from '../types';
import { formatDate } from '../utils/date';
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

interface SavedScreenProps {
  onOpenArticle: (id: string, article: NewsItem) => void;
  savedIds?: Set<string>;
  savedArticles?: NewsItem[];
  onToggleSave?: (id: string, article: NewsItem) => void;
}

export default function SavedScreen({
  onOpenArticle,
  savedIds = new Set(),
  savedArticles = [],
  onToggleSave,
}: SavedScreenProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const C = getColors(isDark);

  const [searchQuery, setSearchQuery] = useState('');

  const filtered = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return savedArticles;
    return savedArticles.filter(
      n =>
        (n.title ?? '').toLowerCase().includes(q) ||
        (n.source ?? '').toLowerCase().includes(q),
    );
  }, [savedArticles, searchQuery]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <HeroHeader
        kicker="LA TUA SELEZIONE"
        titleDark={t.tabs.saved ?? 'Salvati'}
        subtitle="Articoli messi da parte"
        titleSize={30}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Search bar */}
        <View style={[styles.searchRow, { borderColor: C.border, backgroundColor: C.bg2 }]}>
          <Text style={[styles.searchIcon, { color: C.textTertiary }]}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: C.text }]}
            placeholder="Cerca nei salvati..."
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

        {/* Count */}
        {savedArticles.length > 0 && (
          <View style={styles.countRow}>
            <Text style={[styles.countText, { color: C.textTertiary }]}>
              {filtered.length} articol{filtered.length === 1 ? 'o' : 'i'} salvat{filtered.length === 1 ? 'o' : 'i'}
            </Text>
          </View>
        )}

        {/* Empty state */}
        {savedArticles.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔖</Text>
            <Text style={[styles.emptyTitle, { color: C.text }]}>Nessun articolo salvato</Text>
            <Text style={[styles.emptySub, { color: C.textSecondary }]}>
              Premi 🔖 su qualsiasi notizia per salvarla e ritrovarla qui.
            </Text>
          </View>
        )}

        {/* Lista */}
        {filtered.map((item, idx) => {
          const isSaved = savedIds.has(item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.row,
                {
                  borderBottomColor: C.border,
                  borderBottomWidth: idx === filtered.length - 1 ? 0 : 0.5,
                },
              ]}
              onPress={() => onOpenArticle(item.id, item)}
              activeOpacity={0.7}
            >
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
              ) : (
                <View
                  style={[
                    styles.thumb,
                    {
                      backgroundColor: item.imageColor?.[0] ?? '#1a1a2e',
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                  ]}
                >
                  <Text style={{ fontSize: 22 }}>{item.imageEmoji ?? '🌍'}</Text>
                </View>
              )}
              <View style={styles.body}>
                <Text style={[styles.title, { color: C.text }]} numberOfLines={2}>
                  {cleanTitle(item.title)}
                </Text>
                <Text style={[styles.meta, { color: C.textTertiary }]}>
                  {item.source} · {formatDate(item.publishedAt)}
                </Text>
                <Text style={[styles.cat, { color: Colors.violet }]}>
                  {cleanCatLabel(item.categoryLabel ?? item.category)}
                </Text>
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

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
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
  searchInput: { flex: 1, fontSize: 13, fontWeight: '500', padding: 0 },
  countRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  countText: { fontSize: 11, fontWeight: '500' },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
    gap: 8,
  },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', textAlign: 'center' },
  emptySub: { fontSize: FontSize.base, textAlign: 'center', lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  thumb: { width: 76, height: 64, borderRadius: 10, flexShrink: 0 },
  body: { flex: 1, minWidth: 0 },
  cat: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 3 },
  title: { fontSize: 14, fontWeight: '700', lineHeight: 19, marginBottom: 3 },
  meta: { fontSize: 11 },
});

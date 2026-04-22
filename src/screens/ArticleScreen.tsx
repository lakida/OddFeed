import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Share,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, Radius } from '../theme/colors';
import { MOCK_NEWS } from '../data/mockData';
import { useTranslation } from '../context/LanguageContext';
import { UserStats } from '../../App';
import { NewsItem } from '../types';

interface ArticleScreenProps {
  newsId: string;
  article?: NewsItem | null;
  onBack: () => void;
  userId: string;
  userStats: UserStats;
  onPointsChange: (action: 'read' | 'react' | 'share', articleId?: string) => void;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n === 0 ? '' : String(n);
}

export default function ArticleScreen({ newsId, article: articleProp, onBack, userId, onPointsChange }: ArticleScreenProps) {
  const { t } = useTranslation();
  const article = articleProp ?? MOCK_NEWS.find((n) => n.id === newsId) ?? MOCK_NEWS[0];
  const articleUrl = `https://oddfeed.app/articolo/${article.id}`;

  // Swipe da sinistra per tornare indietro (standard iOS)
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const startX = evt.nativeEvent.pageX - gestureState.dx;
        return (
          startX < 40 &&
          gestureState.dx > 15 &&
          Math.abs(gestureState.dy) < Math.abs(gestureState.dx)
        );
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 60) onBack();
      },
    })
  ).current;

  useEffect(() => {
    if (userId) onPointsChange('read', article.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id, userId]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${article.title}\n\n${articleUrl}`,
        title: article.title,
        url: articleUrl,
      });
      if (userId) onPointsChange('share');
    } catch (e) {}
  };

  const paragraphs = article.fullText.split('\n\n').slice(0, 2);

  return (
    <SafeAreaView style={styles.safe} {...panResponder.panHandlers}>
      {/* Back — in alto */}
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backArrow}>←</Text>
        <Text style={styles.backText}>{t.common.back}</Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          {/* Tags */}
          <Text style={styles.tags}>{article.country} · {article.categoryLabel}</Text>

          {/* Titolo */}
          <Text style={styles.title}>{article.title}</Text>

          {/* Fonte */}
          <View style={styles.sourceRow}>
            <View style={styles.sourceLeft}>
              <View style={styles.sourceDot} />
              <Text style={styles.sourceName}>{article.source}</Text>
              <Text style={styles.timeDot}>·</Text>
              <Text style={styles.time}>{article.publishedAt}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Verificata</Text>
            </View>
          </View>

          {/* Testo */}
          {paragraphs.map((para, i) => (
            <Text key={i} style={styles.articleText}>{para}</Text>
          ))}

          {/* Reazioni — solo visualizzazione, non interattive */}
          {article.reactions && article.reactions.some(r => r.count > 0) && (
            <View style={styles.reactionsWrap}>
              <Text style={styles.reactionsLabel}>Come l'hanno presa gli altri</Text>
              <View style={styles.reactionsRow}>
                {article.reactions.map((r) => (
                  <View key={r.emoji} style={styles.reactionItem}>
                    <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                    {r.count > 0 && (
                      <Text style={styles.reactionCount}>{formatCount(r.count)}</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Back — in fondo */}
          <TouchableOpacity style={styles.backBtnBottom} onPress={onBack}>
            <Text style={styles.backArrow}>←</Text>
            <Text style={styles.backBtnBottomText}>{t.common.back}</Text>
          </TouchableOpacity>

          <View style={{ height: 12 }} />
        </View>
      </ScrollView>

      {/* Condividi — fisso in fondo */}
      <View style={styles.shareBar}>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.75}>
          <Ionicons name="share-outline" size={20} color="#fff" />
          <Text style={styles.shareBtnText}>{t.article.share}</Text>
        </TouchableOpacity>
        <Text style={styles.shareHint}>Condividi e incuriosisci i tuoi amici 👀</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backArrow: { fontSize: 18, color: Colors.textSecondary },
  backText: { fontSize: FontSize.base, fontWeight: '500', color: Colors.textSecondary },
  body: { padding: Spacing.lg },
  tags: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 32,
    marginBottom: Spacing.md,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  sourceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  sourceDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.green },
  sourceName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  timeDot: { fontSize: FontSize.xs, color: Colors.textTertiary },
  time: { fontSize: FontSize.sm, color: Colors.textTertiary },
  verifiedBadge: {
    backgroundColor: Colors.greenBg,
    borderWidth: 1,
    borderColor: Colors.greenBorder,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  verifiedText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.green },
  articleText: {
    fontSize: FontSize.lg,
    color: Colors.text,
    lineHeight: 28,
    marginBottom: Spacing.md,
  },

  // Reazioni read-only
  reactionsWrap: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  reactionsLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textTertiary,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  reactionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reactionItem: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg2,
    minWidth: 52,
  },
  reactionEmoji: { fontSize: 22 },
  reactionCount: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textTertiary,
    marginTop: 3,
  },

  // Back button in fondo
  backBtnBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
  },
  backBtnBottomText: {
    fontSize: FontSize.base,
    fontWeight: '500',
    color: Colors.textSecondary,
  },

  // Share
  shareBar: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 36,
    gap: 10,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: Radius.md,
    backgroundColor: Colors.violet,
    shadowColor: Colors.violet,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  shareBtnText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
  shareHint: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
});

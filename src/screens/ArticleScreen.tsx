import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Share,
} from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../theme/colors';
import { MOCK_NEWS } from '../data/mockData';
import { ReactionType } from '../types';
import { useTranslation } from '../context/LanguageContext';

interface ArticleScreenProps {
  newsId: string;
  onBack: () => void;
}

const ALL_REACTIONS: { emoji: ReactionType; label: string }[] = [
  { emoji: '🤯', label: 'Sconvolto' },
  { emoji: '😮', label: 'Sorpreso' },
  { emoji: '😂', label: 'Divertente' },
  { emoji: '🤔', label: 'Interessante' },
  { emoji: '❤️', label: 'Adoro' },
];

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function ArticleScreen({ newsId, onBack }: ArticleScreenProps) {
  const { t } = useTranslation();
  const article = MOCK_NEWS.find((n) => n.id === newsId) ?? MOCK_NEWS[0];
  const [userReaction, setUserReaction] = useState<ReactionType | null>(article.userReaction);
  const [reactions, setReactions] = useState(article.reactions);

  // Link placeholder articolo (in Fase 2 sarà Universal Link reale)
  const articleUrl = `https://oddfeed.app/articolo/${article.id}`;

  const handleReact = (emoji: ReactionType) => {
    const alreadyReacted = userReaction === emoji;
    setUserReaction(alreadyReacted ? null : emoji);
    setReactions((prev) =>
      prev.map((r) => ({
        ...r,
        count: r.emoji === emoji
          ? alreadyReacted ? r.count - 1 : r.count + 1
          : r.count,
      }))
    );
  };

  const shareText = `${article.title}\n\n${articleUrl}`;

  const handleShare = async () => {
    try {
      await Share.share({
        message: shareText,
        title: article.title,
        url: articleUrl,
      });
    } catch (e) {}
  };

  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);
  const topReactions = [...reactions].sort((a, b) => b.count - a.count).slice(0, 3);

  const currentReactionLabel = ALL_REACTIONS.find(r => r.emoji === userReaction)?.label;

  const paragraphs = article.fullText.split('\n\n');

  return (
    <SafeAreaView style={styles.safe}>
      {/* Back */}
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


          {/* Reazioni */}
          <Text style={styles.reactionsLabel}>{t.article.reactionLabel}</Text>

          <View style={styles.reactionsRow}>
            {ALL_REACTIONS.map((r) => {
              const data = reactions.find((rx) => rx.emoji === r.emoji);
              const isActive = userReaction === r.emoji;
              return (
                <TouchableOpacity
                  key={r.emoji}
                  style={[styles.reactionItem, isActive && styles.reactionItemActive]}
                  onPress={() => handleReact(r.emoji)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                  <Text style={[styles.reactionCount, isActive && styles.reactionCountActive]}>
                    {formatCount(data?.count ?? 0)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ height: 24 }} />
        </View>
      </ScrollView>

      {/* Condividi — fisso in fondo */}
      <View style={styles.shareBar}>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.7}>
          <Text style={styles.shareBtnText}>{t.article.share}</Text>
        </TouchableOpacity>
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
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.lg },
  articleText: {
    fontSize: FontSize.base,
    color: Colors.text,
    lineHeight: 26,
    marginBottom: Spacing.md,
  },

  // Reazioni
  reactionsLabel: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  // 5 reazioni su tutta la riga
  reactionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  reactionItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 3,
  },
  reactionItemActive: {
    backgroundColor: Colors.text,
    borderColor: Colors.text,
  },
  reactionEmoji: { fontSize: 22 },
  reactionCount: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 3,
  },
  reactionCountActive: { color: 'rgba(255,255,255,0.8)' },

  shareBar: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg2,
  },
  shareBtnEmoji: { fontSize: 16, color: Colors.textSecondary },
  shareBtnText: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});

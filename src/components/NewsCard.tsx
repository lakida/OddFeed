import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../theme/colors';
import { NewsItem } from '../types';

interface Props {
  item: NewsItem;
  onPress: () => void;
  onReact: (newsId: string, emoji: string) => void;
  featured?: boolean;
}

export default function NewsCard({ item, onPress, featured = false }: Props) {

  return (
    <TouchableOpacity
      style={[styles.card, featured && styles.cardFeatured]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Titolo */}
      <Text style={[styles.title, featured && styles.titleFeatured]}>
        {item.title}
      </Text>

      {/* Descrizione (solo featured) */}
      {featured && (
        <Text style={styles.description} numberOfLines={3}>
          {item.description}
        </Text>
      )}

      {/* Meta: fonte */}
      <View style={styles.meta}>
        <View style={styles.sourceDot} />
        <Text style={styles.sourceName}>{item.source}</Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.time}>{item.publishedAt}</Text>
      </View>

    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cardFeatured: {},
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 24,
    marginBottom: Spacing.sm,
  },
  titleFeatured: {
    fontSize: FontSize.xl,
    lineHeight: 28,
  },
  description: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: Spacing.sm,
  },
  sourceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.green,
  },
  sourceName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  dot: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  time: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },

});

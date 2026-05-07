import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { getColors, Spacing, Radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

function SkeletonLine({ width, height = 14, style, color }: { width: string | number; height?: number; style?: object; color: string }) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.75, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 750, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: Radius.sm, backgroundColor: color },
        { opacity },
        style,
      ]}
    />
  );
}

/** Skeleton classico a card — usato in ArchiveScreen */
export function SkeletonNewsCard() {
  const { isDark } = useTheme();
  const C = getColors(isDark);
  return (
    <View style={[styles.card, { borderBottomColor: C.border }]}>
      <SkeletonLine width="35%" height={10} color={C.border} style={{ marginBottom: 10 }} />
      <SkeletonLine width="100%" height={16} color={C.border} style={{ marginBottom: 8 }} />
      <SkeletonLine width="80%" height={16} color={C.border} style={{ marginBottom: 14 }} />
      <SkeletonLine width="45%" height={11} color={C.border} />
    </View>
  );
}

/** Skeleton unRow — thumbnail + testo, usato in HomeScreen */
export function SkeletonUnRow() {
  const { isDark } = useTheme();
  const C = getColors(isDark);
  return (
    <View style={[styles.unRow, { borderBottomColor: C.border }]}>
      {/* Thumbnail */}
      <View style={[styles.unThumb, { backgroundColor: C.border, opacity: 0.5 }]} />
      {/* Testo */}
      <View style={styles.unBody}>
        <SkeletonLine width="100%" height={14} color={C.border} style={{ marginBottom: 8 }} />
        <SkeletonLine width="75%" height={14} color={C.border} style={{ marginBottom: 10 }} />
        <SkeletonLine width="40%" height={10} color={C.border} />
      </View>
    </View>
  );
}

export function SkeletonNewsList({ count = 3, variant = 'card' }: { count?: number; variant?: 'card' | 'row' }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) =>
        variant === 'row' ? <SkeletonUnRow key={i} /> : <SkeletonNewsCard key={i} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    borderBottomWidth: 1,
  },
  unRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  unThumb: {
    width: 76,
    height: 64,
    borderRadius: 10,
    flexShrink: 0,
    overflow: 'hidden',
  },
  unBody: {
    flex: 1,
    minWidth: 0,
  },
});

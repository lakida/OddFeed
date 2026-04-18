import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius } from '../theme/colors';

function SkeletonLine({ width, height = 14, style }: { width: string | number; height?: number; style?: object }) {
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
        { width, height, borderRadius: Radius.sm, backgroundColor: Colors.border },
        { opacity },
        style,
      ]}
    />
  );
}

export function SkeletonNewsCard() {
  return (
    <View style={styles.card}>
      {/* Tag / categoria */}
      <SkeletonLine width="35%" height={10} style={{ marginBottom: 10 }} />
      {/* Titolo */}
      <SkeletonLine width="100%" height={16} style={{ marginBottom: 8 }} />
      <SkeletonLine width="80%" height={16} style={{ marginBottom: 14 }} />
      {/* Fonte + data */}
      <SkeletonLine width="45%" height={11} />
    </View>
  );
}

export function SkeletonNewsList({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonNewsCard key={i} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
});

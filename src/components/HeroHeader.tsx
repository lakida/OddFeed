import React from 'react';
import { View, Text, ImageBackground, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const HERO_BG = require('../../assets/hero_background.png');

const NAVY   = '#080A35';
const VIOLET = '#5540FF';

interface HeroHeaderProps {
  kicker?: string;
  titleDark: string;
  titleViolet?: string;
  subtitle: string;
  titleSize?: number;
}

export default function HeroHeader({ kicker, titleDark, titleViolet, subtitle, titleSize = 38 }: HeroHeaderProps) {
  const { isDark } = useTheme();

  const kickerColor   = isDark ? 'rgba(255,255,255,0.45)' : '#A097C8';
  const titleColor    = isDark ? '#FFFFFF' : NAVY;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.80)' : NAVY;
  const borderColor   = isDark ? 'rgba(120,100,240,0.14)' : 'rgba(180,165,245,0.22)';

  return (
    <ImageBackground
      source={HERO_BG}
      style={[styles.wrap, { borderBottomColor: borderColor }]}
      resizeMode="cover"
    >
      {isDark && <View style={styles.darkOverlay} />}
      <View style={styles.textBlock}>
        {kicker ? <Text style={[styles.kicker, { color: kickerColor }]}>{kicker}</Text> : null}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: titleColor, fontSize: titleSize, lineHeight: titleSize * 1.2 }]}>{titleDark}</Text>
          {titleViolet
            ? <Text style={[styles.title, { color: VIOLET, fontSize: titleSize, lineHeight: titleSize * 1.2 }]}>{titleViolet}</Text>
            : null}
        </View>
        <Text style={[styles.subtitle, { color: subtitleColor }]} numberOfLines={1} adjustsFontSizeToFit>{subtitle}</Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 17,
    paddingBottom: 20,
    borderBottomWidth: 1,
    overflow: 'hidden',
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 6, 40, 0.75)',
  },
  textBlock: {
    maxWidth: '58%',
    zIndex: 2,
  },
  titleRow: {
    flexDirection: 'row',
  },
  kicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 46,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 3,
    lineHeight: 22,
  },
});

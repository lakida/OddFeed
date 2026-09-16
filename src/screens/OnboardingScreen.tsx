import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Image, ImageBackground,
} from 'react-native';
import { Colors, getColors, FontSize, Spacing, Radius } from '../theme/colors';

const HERO_BG   = require('../../assets/hero_background.png');
const LOGO_IMG  = require('../../assets/newspaper_illustration.png');
const NAVY      = '#080A35';
const VIOLET    = '#5540FF';
import { useTranslation } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { CATEGORY_CONFIG } from '../data/categoryConfig';
import { Category } from '../types';

interface OnboardingScreenProps {
  onComplete: (interests: Category[]) => void;
}

const STEPS = ['benvenuto', 'interessi', 'pronto'] as const;
type Step = typeof STEPS[number];

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { t, language } = useTranslation();
  const { isDark } = useTheme();
  const C = getColors(isDark);
  const ob = t.onboarding;

  const [step, setStep] = useState<Step>('benvenuto');
  const [interests, setInterests] = useState<Category[]>([]);

  const stepIndex = STEPS.indexOf(step);
  const progress = (stepIndex + 1) / STEPS.length;

  const canContinue = interests.length >= 3;

  const toggleInterest = (categoryId: Category) => {
    setInterests(prev =>
      prev.includes(categoryId)
        ? prev.filter(i => i !== categoryId)
        : [...prev, categoryId]
    );
  };

  const getCatLabel = (config: typeof CATEGORY_CONFIG[0]) =>
    language === 'it' ? config.labelIt : config.labelEn;

  // Welcome step: match lavender bg so SafeAreaView doesn't flash white
  // while hero_background.png finishes decoding on iOS
  const safeBg = step === 'benvenuto' ? '#EEF2FF' : C.bg;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: safeBg }]}>
      {/* Barra progresso — nascosta nel welcome */}
      {step !== 'benvenuto' && (
        <View style={[styles.progressBarBg, { backgroundColor: C.border }]}>
          <View style={[styles.progressBarFill, { flex: progress }]} />
          <View style={{ flex: 1 - progress }} />
        </View>
      )}

      {/* Step: Benvenuto */}
      {step === 'benvenuto' && (
        <ImageBackground
          source={HERO_BG}
          style={[styles.welcomeBg, { backgroundColor: '#EEF2FF' }]}
          resizeMode="cover"
        >
          {isDark && <View style={styles.welcomeDarkOverlay} />}
          <View style={styles.welcomeContent}>
            {/* Logo (includes OddFeed wordmark in the image) */}
            <Image source={LOGO_IMG} style={styles.welcomeLogo} />
            {/* Tagline */}
            <Text style={[styles.welcomeTagline, { color: isDark ? 'rgba(255,255,255,0.65)' : '#6B6899' }]}>
              {language === 'it' ? (
                <>
                  {'Ogni giorno le '}
                  <Text style={styles.welcomeTaglineBold}>notizie</Text>
                  {' più '}
                  <Text style={styles.welcomeTaglineBold}>strane</Text>
                  {' e '}
                  <Text style={styles.welcomeTaglineBold}>curiose</Text>
                  {' dal mondo, '}
                  <Text style={styles.welcomeTaglineBold}>selezionate</Text>
                  {' e '}
                  <Text style={styles.welcomeTaglineBold}>verificate</Text>
                  {' per te.'}
                </>
              ) : (
                <>
                  {'Every day the most '}
                  <Text style={styles.welcomeTaglineBold}>strange</Text>
                  {' and '}
                  <Text style={styles.welcomeTaglineBold}>curious</Text>
                  {' news from around the world, '}
                  <Text style={styles.welcomeTaglineBold}>curated</Text>
                  {' and '}
                  <Text style={styles.welcomeTaglineBold}>verified</Text>
                  {' for you.'}
                </>
              )}
            </Text>
          </View>
          {/* Bottone in basso */}
          <View style={styles.welcomeFooter}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('interessi')}>
              <Text style={styles.primaryBtnText}>{ob.welcomeBtn}</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      )}

      {/* Step: Interessi */}
      {step === 'interessi' && (
        <View style={styles.stepContainer}>
          <Text style={[styles.stepTitle, { color: C.text }]}>{ob.interestsTitle}</Text>
          <Text style={[styles.stepSubtitle, { color: C.textSecondary }]}>{ob.interestsSub}</Text>

          {!canContinue && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>{ob.warningMin(interests.length)}</Text>
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            contentContainerStyle={styles.tagsScrollContent}
          >
            <View style={styles.tagsWrap}>
              {CATEGORY_CONFIG.map((config) => {
                const active = interests.includes(config.id as Category);
                return (
                  <TouchableOpacity
                    key={config.id}
                    style={[
                      styles.tag,
                      { borderColor: C.border, backgroundColor: C.bg2 },
                      active && styles.tagActive,
                    ]}
                    onPress={() => toggleInterest(config.id as Category)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.tagText, { color: C.textSecondary }, active && styles.tagTextActive]}>
                      {getCatLabel(config)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.primaryBtn, !canContinue && styles.primaryBtnDisabled]}
            onPress={() => canContinue && setStep('pronto')}
            activeOpacity={canContinue ? 0.85 : 1}
          >
            <Text style={styles.primaryBtnText}>{ob.interestsBtn}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step: Pronto */}
      {step === 'pronto' && (
        <View style={styles.stepContainer}>
          <Text style={[styles.stepTitle, { color: C.text }]}>🎉 {ob.readyTitle}</Text>
          <Text style={[styles.stepSubtitle, { color: C.textSecondary }]}>
            {language === 'it'
              ? 'Ogni giorno riceverai le notizie più strane e curiose dal mondo, personalizzate per te.'
              : 'Every day you\'ll receive the strangest and most curious news from around the world, personalised for you.'}
          </Text>

          <View style={[styles.recapCard, { backgroundColor: C.bg2, borderColor: C.border }]}>
            <Text style={[styles.recapTitle, { color: C.textTertiary }]}>{ob.recapTitle}</Text>
            <Text style={[styles.recapRow, { color: C.textSecondary }]}>
              {ob.recapInterests(
                interests
                  .map(id => {
                    const config = CATEGORY_CONFIG.find(c => c.id === id);
                    return config ? (language === 'it' ? config.labelIt : config.labelEn) : id;
                  })
                  .join(', ')
              )}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => onComplete(interests)}
          >
            <Text style={styles.primaryBtnText}>{ob.readyBtn}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  // ── Welcome screen ──────────────────────────────────────────────────────────
  welcomeBg: {
    flex: 1,
    overflow: 'hidden',
  },
  welcomeDarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,6,40,0.72)',
  },
  welcomeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 32,
  },
  welcomeLogo: {
    width: 220,
    height: 220,
    marginBottom: 20,
    resizeMode: 'contain',
  },
  welcomeTagline: {
    fontSize: 19,
    lineHeight: 28,
    textAlign: 'center',
    maxWidth: 300,
  },
  welcomeTaglineBold: {
    fontWeight: '800',
  },
  welcomeFooter: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // ── Progress bar ─────────────────────────────────────────────────────────────
  progressBarBg: {
    height: 3,
    backgroundColor: Colors.border,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressBarFill: { height: 3, backgroundColor: Colors.violet },

  stepContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: 48,
    paddingBottom: 32,
  },
  stepTitle: {
    fontSize: FontSize.xxxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
    lineHeight: 36,
  },
  stepSubtitle: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  stepNote: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },

  warningBanner: {
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#F0D98A',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  warningText: { fontSize: FontSize.sm, color: '#7A6010', fontWeight: '500' },

  tagsScrollContent: { paddingBottom: 16 },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.md },

  tag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagActive: { backgroundColor: Colors.text, borderColor: Colors.text },
  tagText: { fontSize: FontSize.base, color: Colors.textSecondary, fontWeight: '500' },
  tagTextActive: { color: '#fff' },

  recapCard: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  recapTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  recapRow: { fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: 22 },

  primaryBtn: {
    backgroundColor: Colors.violet,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  primaryBtnDisabled: { opacity: 0.35 },
  primaryBtnText: { fontSize: FontSize.base, fontWeight: '700', color: '#fff' },
});

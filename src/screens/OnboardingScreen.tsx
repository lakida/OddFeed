import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, getColors, FontSize, Spacing, Radius } from '../theme/colors';
import { useTranslation } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { CATEGORY_CONFIG } from '../data/categoryConfig';
import { Category } from '../types';

interface OnboardingScreenProps {
  userName: string;
  isPremium?: boolean;
  onComplete: (interests: Category[], slot: string) => void;
}

const STEPS = ['benvenuto', 'interessi', 'notifiche', 'pronto', 'sblocco'] as const;
type Step = typeof STEPS[number];

export default function OnboardingScreen({
  userName,
  isPremium = false,
  onComplete,
}: OnboardingScreenProps) {
  const { t, language } = useTranslation();
  const { isDark } = useTheme();
  const C = getColors(isDark);
  const ob = t.onboarding;

  const [step, setStep] = useState<Step>('benvenuto');
  const [interests, setInterests] = useState<Category[]>([]);
  const [slot, setSlot] = useState(ob.slots[0]);

  const name = userName.charAt(0).toUpperCase() + userName.slice(1);
  const stepIndex = STEPS.indexOf(step);
  const progress = (stepIndex + 1) / STEPS.length;

  // Quante categorie non-premium ha selezionato (per il requisito minimo)
  const freeSelected = interests.filter(id => {
    const config = CATEGORY_CONFIG.find(c => c.id === id);
    return config && !config.premiumOnly;
  }).length;
  const canContinue = freeSelected >= 3;

  const toggleInterest = (categoryId: Category, isPremiumCategory: boolean) => {
    const isAlreadySelected = interests.includes(categoryId);
    // Mostra alert solo quando si tenta di SELEZIONARE una locked, non di deselezionare
    if (isPremiumCategory && !isPremium && !isAlreadySelected) {
      Alert.alert(
        '⭐ Categoria Premium',
        'Questa categoria è disponibile con OddFeed Premium. Puoi selezionarla ora — riceverai queste notizie dopo l\'attivazione dell\'abbonamento.',
        [
          { text: 'Annulla', style: 'cancel' },
          {
            text: 'Seleziona comunque',
            onPress: () => {
              setInterests(prev =>
                prev.includes(categoryId)
                  ? prev.filter(i => i !== categoryId)
                  : [...prev, categoryId]
              );
            },
          },
        ]
      );
      return;
    }

    setInterests(prev =>
      prev.includes(categoryId)
        ? prev.filter(i => i !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Label categoria nella lingua corrente
  const getCatLabel = (config: typeof CATEGORY_CONFIG[0]) =>
    language === 'it' ? config.labelIt : config.labelEn;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* Barra progresso */}
      <View style={[styles.progressBarBg, { backgroundColor: C.border }]}>
        <View style={[styles.progressBarFill, { flex: progress }]} />
        <View style={{ flex: 1 - progress }} />
      </View>

      {/* Step: Benvenuto */}
      {step === 'benvenuto' && (
        <View style={styles.stepContainer}>
          <Text style={[styles.stepTitle, { color: C.text }]}>{ob.welcome(name)}</Text>
          <Text style={[styles.stepSubtitle, { color: C.textSecondary }]}>{ob.welcomeSub}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('interessi')}>
            <Text style={styles.primaryBtnText}>{ob.welcomeBtn}</Text>
          </TouchableOpacity>
          <Text style={[styles.stepNote, { color: C.textTertiary }]}>{ob.welcomeNote}</Text>
        </View>
      )}

      {/* Step: Interessi */}
      {step === 'interessi' && (
        <View style={styles.stepContainer}>
          <Text style={[styles.stepTitle, { color: C.text }]}>{ob.interestsTitle}</Text>
          <Text style={[styles.stepSubtitle, { color: C.textSecondary }]}>{ob.interestsSub}</Text>

          {!canContinue && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>{ob.warningMin(freeSelected)}</Text>
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            contentContainerStyle={styles.tagsScrollContent}
          >
            {/* Categorie free */}
            <Text style={[styles.categoryGroupLabel, { color: C.textTertiary }]}>
              {language === 'it' ? 'Categorie gratuite' : 'Free categories'}
            </Text>
            <View style={styles.tagsWrap}>
              {CATEGORY_CONFIG.filter(c => !c.premiumOnly).map((config) => {
                const active = interests.includes(config.id);
                return (
                  <TouchableOpacity
                    key={config.id}
                    style={[styles.tag, { borderColor: C.border, backgroundColor: C.bg2 }, active && styles.tagActive]}
                    onPress={() => toggleInterest(config.id, false)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.tagText, { color: C.textSecondary }, active && styles.tagTextActive]}>
                      {getCatLabel(config)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Categorie premium */}
            <View style={styles.premiumGroupHeader}>
              <Text style={[styles.categoryGroupLabel, { color: C.textTertiary }]}>
                {language === 'it' ? 'Categorie Premium' : 'Premium categories'}
              </Text>
              <View style={styles.premiumBadgeSmall}>
                <Text style={styles.premiumBadgeSmallText}>⭐ Premium</Text>
              </View>
            </View>
            {!isPremium && (
              <Text style={[styles.premiumGroupHint, { color: C.textTertiary }]}>
                {language === 'it'
                  ? 'Selezionale ora — le riceverai dopo aver attivato Premium'
                  : 'Select now — you\'ll receive them after activating Premium'}
              </Text>
            )}
            <View style={styles.tagsWrap}>
              {CATEGORY_CONFIG.filter(c => c.premiumOnly).map((config) => {
                const active = interests.includes(config.id);
                const locked = !isPremium;
                return (
                  <TouchableOpacity
                    key={config.id}
                    style={[
                      styles.tag,
                      styles.tagPremium,
                      active && styles.tagPremiumActive,
                      locked && styles.tagLocked,
                    ]}
                    onPress={() => toggleInterest(config.id, true)}
                    activeOpacity={0.75}
                  >
                    <Text style={[
                      styles.tagText,
                      styles.tagTextPremium,
                      active ? styles.tagTextActive : (locked && styles.tagTextLocked),
                    ]}>
                      {getCatLabel(config)}
                    </Text>

                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.primaryBtn, !canContinue && styles.primaryBtnDisabled]}
            onPress={() => canContinue && setStep('notifiche')}
            activeOpacity={canContinue ? 0.85 : 1}
          >
            <Text style={styles.primaryBtnText}>{ob.interestsBtn}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step: Notifiche */}
      {step === 'notifiche' && (
        <View style={styles.stepContainer}>
          <Text style={[styles.stepTitle, { color: C.text }]}>{ob.notifTitle}</Text>
          <Text style={[styles.stepSubtitle, { color: C.textSecondary }]}>{ob.notifSub}</Text>
          <View style={styles.optionsList}>
            {ob.slots.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.option, { borderColor: C.border, backgroundColor: C.bg2 }, slot === s && styles.optionActive]}
                onPress={() => setSlot(s)}
              >
                <Text style={[styles.optionText, { color: C.text }, slot === s && styles.optionTextActive]}>{s}</Text>
                {slot === s && <Text style={[styles.optionCheck, { color: C.text }]}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('pronto')}>
            <Text style={styles.primaryBtnText}>{ob.notifBtn}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step: Pronto */}
      {step === 'pronto' && (
        <View style={styles.stepContainer}>
          <Text style={[styles.stepTitle, { color: C.text }]}>🎉 {ob.readyTitle}</Text>
          <Text style={[styles.stepSubtitle, { color: C.textSecondary }]}>{ob.readySub(slot)}</Text>
          <View style={[styles.recapCard, { backgroundColor: C.bg2, borderColor: C.border }]}>
            <Text style={[styles.recapTitle, { color: C.textTertiary }]}>{ob.recapTitle}</Text>
            <Text style={[styles.recapRow, { color: C.textSecondary }]}>{ob.recapSlot(slot)}</Text>
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
            onPress={async () => {
              // Salva le preferenze su Firestore
              const user = auth.currentUser;
              if (user) {
                await setDoc(doc(db, 'users', user.uid), {
                  interests,
                  notificationSlot: slot,
                  onboardingDone: true,
                }, { merge: true });
              }
              // Mostra la schermata di sblocco regalo prima di entrare nell'app
              setStep('sblocco');
            }}
          >
            <Text style={styles.primaryBtnText}>{ob.readyBtn}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step: Sblocco regalo — "Te ne sblocco una. Ma solo questa volta." */}
      {step === 'sblocco' && (
        <View style={styles.stepContainer}>
          <Text style={[styles.sbloccoBadge]}>
            {language === 'it' ? '🎁 Regalo di benvenuto' : '🎁 Welcome gift'}
          </Text>
          <Text style={[styles.sbloccoTitle, { color: C.text }]}>
            {language === 'it'
              ? 'Te ne sblocco una.\nMa solo questa volta.'
              : 'I\'ll unlock one for you.\nJust this once.'}
          </Text>
          <Text style={[styles.sbloccoSub, { color: C.textSecondary }]}>
            {language === 'it'
              ? 'Tra le notizie di oggi c\'è un articolo che normalmente è riservato agli abbonati Premium. È tuo, gratis, una volta sola.'
              : 'Among today\'s stories there\'s one normally reserved for Premium subscribers. It\'s yours, free, one time only.'}
          </Text>

          {/* Preview card bloccata */}
          <View style={styles.sbloccoCard}>
            <View style={styles.sbloccoCardTop}>
              <Text style={styles.sbloccoCardEmoji}>🚫</Text>
              <View style={styles.sbloccoCardBadge}>
                <Text style={styles.sbloccoCardBadgeText}>
                  {language === 'it' ? 'Non dovresti leggerla' : 'You shouldn\'t read this'}
                </Text>
              </View>
            </View>
            <Text style={styles.sbloccoCardTitle}>
              {language === 'it'
                ? 'Una storia che nessuno ha il coraggio di pubblicare.'
                : 'A story no one has the courage to publish.'}
            </Text>
            <View style={styles.sbloccoUnlockRow}>
              <Text style={styles.sbloccoUnlockIcon}>🔓</Text>
              <Text style={styles.sbloccoUnlockText}>
                {language === 'it' ? 'Sbloccata per te' : 'Unlocked for you'}
              </Text>
            </View>
          </View>

          {/* CTA principale */}
          <TouchableOpacity
            style={styles.sbloccoCta}
            onPress={async () => {
              // Setta il flag: l'utente ha diritto a 1 articolo forbidden gratuito
              await AsyncStorage.setItem('oddFeedFreeUnlock', 'true');
              onComplete(interests, slot);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.sbloccoCtaText}>
              {language === 'it' ? '✦ Mostrami l\'articolo →' : '✦ Show me the article →'}
            </Text>
          </TouchableOpacity>

          {/* Skip */}
          <TouchableOpacity
            style={styles.sbloccoSkip}
            onPress={() => onComplete(interests, slot)}
          >
            <Text style={styles.sbloccoSkipText}>
              {language === 'it' ? 'Inizia a leggere senza regalo' : 'Start reading without the gift'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

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

  // Gruppi categorie
  tagsScrollContent: { paddingBottom: 16 },
  categoryGroupLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  premiumGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.lg,
    marginBottom: 4,
  },
  premiumGroupHint: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  premiumBadgeSmall: {
    backgroundColor: '#FFF8E1',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#F0C040',
  },
  premiumBadgeSmallText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A07000',
  },

  // Tags
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

  // Premium tag
  tagPremium: { borderColor: '#F0C040', backgroundColor: '#FFFBF0' },
  tagPremiumActive: { backgroundColor: '#C8860A', borderColor: '#C8860A' },
  tagLocked: { opacity: 0.6 },
  tagTextPremium: { color: '#A07000' },
  tagTextLocked: { color: Colors.textTertiary },
  lockIcon: { fontSize: 11 },

  // Opzioni slot
  optionsList: { gap: Spacing.sm, marginBottom: Spacing.xl },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg2,
  },
  optionActive: { borderColor: Colors.text, backgroundColor: Colors.bg, borderWidth: 2 },
  optionText: { fontSize: FontSize.base, color: Colors.text, fontWeight: '500' },
  optionTextActive: { fontWeight: '700' },
  optionCheck: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text },

  // Recap
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

  // CTA
  primaryBtn: {
    backgroundColor: Colors.violet,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  primaryBtnDisabled: { opacity: 0.35 },
  primaryBtnText: { fontSize: FontSize.base, fontWeight: '700', color: '#fff' },

  // ─── Sblocco regalo ───
  sbloccoBadge: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#4F46E5',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  sbloccoTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    lineHeight: 34,
    marginBottom: Spacing.md,
    letterSpacing: -0.3,
  },
  sbloccoSub: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  sbloccoCard: {
    backgroundColor: '#f5f3ff',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: '#c4b5fd',
    padding: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  sbloccoCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sbloccoCardEmoji: { fontSize: 24 },
  sbloccoCardBadge: {
    backgroundColor: '#1e1b4b',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  sbloccoCardBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#a5b4fc',
    letterSpacing: 0.2,
  },
  sbloccoCardTitle: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: '#1e1b4b',
    lineHeight: 22,
  },
  sbloccoUnlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  sbloccoUnlockIcon: { fontSize: 14 },
  sbloccoUnlockText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#4F46E5',
  },
  sbloccoCta: {
    backgroundColor: '#4f46e5',
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  sbloccoCtaText: {
    fontSize: FontSize.base,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },
  sbloccoSkip: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  sbloccoSkipText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textDecorationLine: 'underline',
  },
});

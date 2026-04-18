import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert,
} from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../theme/colors';
import { useTranslation } from '../context/LanguageContext';
import { auth, db } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { CATEGORY_CONFIG } from '../data/categoryConfig';
import { Category } from '../types';

interface OnboardingScreenProps {
  userName: string;
  isPremium?: boolean;
  onComplete: (interests: Category[], slot: string) => void;
}

const STEPS = ['benvenuto', 'interessi', 'notifiche', 'pronto'] as const;
type Step = typeof STEPS[number];

export default function OnboardingScreen({
  userName,
  isPremium = false,
  onComplete,
}: OnboardingScreenProps) {
  const { t, language } = useTranslation();
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
    <SafeAreaView style={styles.safe}>
      {/* Barra progresso */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { flex: progress }]} />
        <View style={{ flex: 1 - progress }} />
      </View>

      {/* Step: Benvenuto */}
      {step === 'benvenuto' && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>{ob.welcome(name)}</Text>
          <Text style={styles.stepSubtitle}>{ob.welcomeSub}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('interessi')}>
            <Text style={styles.primaryBtnText}>{ob.welcomeBtn}</Text>
          </TouchableOpacity>
          <Text style={styles.stepNote}>{ob.welcomeNote}</Text>
        </View>
      )}

      {/* Step: Interessi */}
      {step === 'interessi' && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>{ob.interestsTitle}</Text>
          <Text style={styles.stepSubtitle}>{ob.interestsSub}</Text>

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
            <Text style={styles.categoryGroupLabel}>
              {language === 'it' ? 'Categorie gratuite' : 'Free categories'}
            </Text>
            <View style={styles.tagsWrap}>
              {CATEGORY_CONFIG.filter(c => !c.premiumOnly).map((config) => {
                const active = interests.includes(config.id);
                return (
                  <TouchableOpacity
                    key={config.id}
                    style={[styles.tag, active && styles.tagActive]}
                    onPress={() => toggleInterest(config.id, false)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.tagText, active && styles.tagTextActive]}>
                      {getCatLabel(config)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Categorie premium */}
            <View style={styles.premiumGroupHeader}>
              <Text style={styles.categoryGroupLabel}>
                {language === 'it' ? 'Categorie Premium' : 'Premium categories'}
              </Text>
              <View style={styles.premiumBadgeSmall}>
                <Text style={styles.premiumBadgeSmallText}>⭐ Premium</Text>
              </View>
            </View>
            {!isPremium && (
              <Text style={styles.premiumGroupHint}>
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
          <Text style={styles.stepTitle}>{ob.notifTitle}</Text>
          <Text style={styles.stepSubtitle}>{ob.notifSub}</Text>
          <View style={styles.optionsList}>
            {ob.slots.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.option, slot === s && styles.optionActive]}
                onPress={() => setSlot(s)}
              >
                <Text style={[styles.optionText, slot === s && styles.optionTextActive]}>{s}</Text>
                {slot === s && <Text style={styles.optionCheck}>✓</Text>}
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
          <Text style={styles.stepTitle}>🎉 {ob.readyTitle}</Text>
          <Text style={styles.stepSubtitle}>{ob.readySub(slot)}</Text>
          <View style={styles.recapCard}>
            <Text style={styles.recapTitle}>{ob.recapTitle}</Text>
            <Text style={styles.recapRow}>{ob.recapSlot(slot)}</Text>
            <Text style={styles.recapRow}>
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
              const user = auth.currentUser;
              if (user) {
                await setDoc(doc(db, 'users', user.uid), {
                  interests,           // Array di Category IDs
                  notificationSlot: slot,
                  onboardingDone: true,
                }, { merge: true });
              }
              onComplete(interests, slot);
            }}
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

  progressBarBg: {
    height: 3,
    backgroundColor: Colors.border,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressBarFill: { height: 3, backgroundColor: Colors.text },

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
    backgroundColor: Colors.text,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  primaryBtnDisabled: { opacity: 0.35 },
  primaryBtnText: { fontSize: FontSize.base, fontWeight: '700', color: '#fff' },
});

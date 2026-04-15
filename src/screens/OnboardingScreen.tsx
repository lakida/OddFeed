import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../theme/colors';
import { useTranslation } from '../context/LanguageContext';
import { auth, db } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface OnboardingScreenProps {
  userName: string;
  onComplete: (interests: string[], slot: string) => void;
}

const ALL_INTERESTS = [
  'Animali', 'Scienza', 'Tecnologia', 'Record',
  'Leggi Strane', 'Natura', 'Spazio', 'Storia',
  'Mistero', 'Cibo', 'Persone', 'Luoghi',
];

const STEPS = ['benvenuto', 'interessi', 'notifiche', 'pronto'] as const;
type Step = typeof STEPS[number];

export default function OnboardingScreen({ userName, onComplete }: OnboardingScreenProps) {
  const { t } = useTranslation();
  const ob = t.onboarding;

  const [step, setStep] = useState<Step>('benvenuto');
  const [interests, setInterests] = useState<string[]>([]);
  const [slot, setSlot] = useState(ob.slots[0]);

  const toggleInterest = (item: string) => {
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const stepIndex = STEPS.indexOf(step);
  const progress = (stepIndex + 1) / STEPS.length;
  const name = userName.charAt(0).toUpperCase() + userName.slice(1);

  return (
    <SafeAreaView style={styles.safe}>
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
          {interests.length < 3 && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>{ob.warningMin(interests.length)}</Text>
            </View>
          )}
          <View style={styles.tagsWrap}>
            {ALL_INTERESTS.map((item) => {
              const active = interests.includes(item);
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.tag, active && styles.tagActive]}
                  onPress={() => toggleInterest(item)}
                >
                  <Text style={[styles.tagText, active && styles.tagTextActive]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, interests.length < 3 && styles.primaryBtnDisabled]}
            onPress={() => interests.length >= 3 && setStep('notifiche')}
            activeOpacity={interests.length >= 3 ? 0.85 : 1}
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
            <Text style={styles.recapRow}>{ob.recapInterests(interests.join(', '))}</Text>
          </View>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={async () => {
              const user = auth.currentUser;
              if (user) {
                await setDoc(doc(db, 'users', user.uid), {
                  interests,
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
  progressBarBg: { height: 3, backgroundColor: Colors.border, flexDirection: 'row', overflow: 'hidden' },
  progressBarFill: { height: 3, backgroundColor: Colors.text },
  stepContainer: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: 48, paddingBottom: 32 },
  stepTitle: { fontSize: FontSize.xxxl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md, lineHeight: 36 },
  stepSubtitle: { fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: 24, marginBottom: Spacing.xl },
  stepNote: { fontSize: FontSize.sm, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.md },
  warningBanner: { backgroundColor: '#FFF3CD', borderWidth: 1, borderColor: '#F0D98A', borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginBottom: Spacing.md },
  warningText: { fontSize: FontSize.sm, color: '#7A6010', fontWeight: '500' },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.xl },
  tag: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg2 },
  tagActive: { backgroundColor: Colors.text, borderColor: Colors.text },
  tagText: { fontSize: FontSize.base, color: Colors.textSecondary, fontWeight: '500' },
  tagTextActive: { color: '#fff' },
  optionsList: { gap: Spacing.sm, marginBottom: Spacing.xl },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg2 },
  optionActive: { borderColor: Colors.text, backgroundColor: Colors.bg, borderWidth: 2 },
  optionText: { fontSize: FontSize.base, color: Colors.text, fontWeight: '500' },
  optionTextActive: { fontWeight: '700' },
  optionCheck: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text },
  recapCard: { backgroundColor: Colors.bg2, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.xl },
  recapTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  recapRow: { fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: 22 },
  primaryBtn: { backgroundColor: Colors.text, borderRadius: Radius.md, paddingVertical: Spacing.lg, alignItems: 'center' },
  primaryBtnDisabled: { opacity: 0.35 },
  primaryBtnText: { fontSize: FontSize.base, fontWeight: '700', color: '#fff' },
});

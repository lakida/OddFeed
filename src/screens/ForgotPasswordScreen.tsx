import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors, getColors, FontSize, Spacing, Radius } from '../theme/colors';
import { useTranslation } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { resetPassword } from '../services/authService';

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

type Step = 'form' | 'sent';

export default function ForgotPasswordScreen({ onBack }: ForgotPasswordScreenProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const C = getColors(isDark);
  const fp = t.forgotPassword;
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const validate = (): boolean => {
    setError('');
    if (!email.trim()) { setError(fp.errEmailRequired); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError(fp.errEmailInvalid); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      await resetPassword(email.trim());
      setStep('sent');
    } catch (err: any) {
      const code = err?.code ?? '';
      if (code === 'auth/user-not-found') {
        setError(fp.errNotFound);
      } else if (code === 'auth/network-request-failed') {
        setError('Errore di rete. Controlla la connessione.');
      } else {
        setError(fp.errEmailInvalid);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>

        {/* Violet hero */}
        <View style={[styles.heroArea, { backgroundColor: C.hero }]}>
          <Text style={styles.heroKicker}>ODDFEED · RECUPERA ACCESSO</Text>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>{step === 'sent' ? 'Email inviata.' : 'Password dimenticata?'}</Text>
              <Text style={[styles.heroSubtitle, { color: C.heroSubtext }]}>
                {step === 'sent'
                  ? 'Controlla la tua casella di posta.'
                  : 'Ti mandiamo un link\nper reimpostarla.'}
              </Text>
            </View>
            <Text style={styles.heroEmoji}>{step === 'sent' ? '✉️' : '🔑'}</Text>
          </View>
          <TouchableOpacity style={styles.heroBackBtn} onPress={onBack}>
            <Text style={styles.heroBackArrow}>←</Text>
            <Text style={styles.heroBackText}>{t.common.back}</Text>
          </TouchableOpacity>
        </View>

        {step === 'form' ? (
          <View style={[styles.container, { backgroundColor: C.bg }]}>
            <View style={styles.fieldWrap}>
              <Text style={[styles.label, { color: C.textSecondary }]}>{fp.emailLabel}</Text>
              <TextInput
                style={[styles.input, { borderColor: C.border, backgroundColor: C.bg2, color: C.text }, error && styles.inputError]}
                placeholder={fp.emailPlaceholder}
                placeholderTextColor={C.textTertiary}
                value={email}
                onChangeText={(v) => { setEmail(v); setError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
              />
              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity
              style={[styles.submitBtn, !email.trim() && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              activeOpacity={email.trim() ? 0.85 : 1}
            >
              <Text style={styles.submitBtnText}>{fp.submitBtn}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.container, { backgroundColor: C.bg }]}>
            <Text style={[styles.sentBody, { color: C.textSecondary }]}>
              {fp.sentBody(email).split('\n').map((line, i) =>
                i === 1
                  ? <Text key={i} style={[styles.bold, { color: C.text }]}>{line}</Text>
                  : line
              )}
            </Text>
            <Text style={[styles.note, { color: C.textTertiary }]}>{fp.sentNote}</Text>
            <TouchableOpacity style={styles.submitBtn} onPress={onBack}>
              <Text style={styles.submitBtnText}>{fp.backToLogin}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resendBtn} onPress={() => setStep('form')}>
              <Text style={[styles.resendText, { color: C.textSecondary }]}>{fp.resend}</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },

  // Violet hero
  heroArea: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  heroKicker: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: 10,
  },
  heroTop: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: 8, marginBottom: Spacing.md,
  },
  heroTitle: { fontSize: 33, fontWeight: '800', color: '#fff', letterSpacing: -0.5, lineHeight: 40 },
  heroSubtitle: { fontSize: 13, marginTop: 4, lineHeight: 19 },
  heroEmoji: { fontSize: 64, lineHeight: 72, marginTop: 2 },
  heroBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  heroBackArrow: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  heroBackText: { fontSize: FontSize.sm, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },

  container: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
  bold: { fontWeight: '700' },
  label: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: Spacing.xs },
  fieldWrap: { marginBottom: Spacing.xl },
  input: {
    borderWidth: 1, borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    fontSize: FontSize.base,
  },
  inputError: { borderColor: Colors.red },
  errorBox: {
    marginTop: Spacing.sm, backgroundColor: '#FFF0F0',
    borderWidth: 1, borderColor: '#FFCDD2', borderRadius: Radius.sm, padding: Spacing.sm,
  },
  errorText: { fontSize: FontSize.sm, color: Colors.red, lineHeight: 18 },
  submitBtn: {
    backgroundColor: Colors.violet, borderRadius: Radius.md,
    paddingVertical: Spacing.lg, alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.35 },
  submitBtnText: { fontSize: FontSize.base, fontWeight: '700', color: '#fff' },
  sentBody: { fontSize: FontSize.base, lineHeight: 24, marginBottom: Spacing.sm },
  note: { fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.xl },
  resendBtn: { marginTop: Spacing.md, alignItems: 'center' },
  resendText: { fontSize: FontSize.sm, fontWeight: '600', textDecorationLine: 'underline' },
});

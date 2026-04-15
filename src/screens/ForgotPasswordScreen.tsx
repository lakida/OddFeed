import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../theme/colors';
import { useTranslation } from '../context/LanguageContext';
import { resetPassword } from '../services/authService';

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

type Step = 'form' | 'sent';

export default function ForgotPasswordScreen({ onBack }: ForgotPasswordScreenProps) {
  const { t } = useTranslation();
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
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backArrow}>←</Text>
            <Text style={styles.backText}>{t.common.back}</Text>
          </TouchableOpacity>
        </View>

        {step === 'form' ? (
          <View style={styles.container}>
            <Text style={styles.title}>{fp.title}</Text>
            <Text style={styles.subtitle}>{fp.subtitle}</Text>
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>{fp.emailLabel}</Text>
              <TextInput
                style={[styles.input, error && styles.inputError]}
                placeholder={fp.emailPlaceholder}
                placeholderTextColor={Colors.textTertiary}
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
          <View style={styles.container}>
            <View style={styles.successIcon}>
              <Text style={styles.successEmoji}>✉️</Text>
            </View>
            <Text style={styles.title}>{fp.sentTitle}</Text>
            <Text style={styles.subtitle}>
              {fp.sentBody(email).split('\n').map((line, i) =>
                i === 1 ? <Text key={i} style={styles.bold}>{line}</Text> : line
              )}
            </Text>
            <Text style={styles.note}>{fp.sentNote}</Text>
            <TouchableOpacity style={styles.submitBtn} onPress={onBack}>
              <Text style={styles.submitBtnText}>{fp.backToLogin}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resendBtn} onPress={() => setStep('form')}>
              <Text style={styles.resendText}>{fp.resend}</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  header: { borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: Spacing.sm },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  backArrow: { fontSize: 18, color: Colors.textSecondary },
  backText: { fontSize: FontSize.base, fontWeight: '500', color: Colors.textSecondary },
  container: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: 40 },
  title: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  subtitle: { fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: 24, marginBottom: Spacing.xl },
  bold: { fontWeight: '700', color: Colors.text },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.xs },
  fieldWrap: { marginBottom: Spacing.xl },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    fontSize: FontSize.base, color: Colors.text, backgroundColor: Colors.bg2,
  },
  inputError: { borderColor: Colors.red },
  errorBox: { marginTop: Spacing.sm, backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#FFCDD2', borderRadius: Radius.sm, padding: Spacing.sm },
  errorText: { fontSize: FontSize.sm, color: Colors.red, lineHeight: 18 },
  submitBtn: { backgroundColor: Colors.text, borderRadius: Radius.md, paddingVertical: Spacing.lg, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.35 },
  submitBtnText: { fontSize: FontSize.base, fontWeight: '700', color: '#fff' },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.greenBg, borderWidth: 1, borderColor: Colors.greenBorder, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  successEmoji: { fontSize: 32 },
  note: { fontSize: FontSize.sm, color: Colors.textTertiary, lineHeight: 20, marginTop: Spacing.md, marginBottom: Spacing.xl },
  resendBtn: { marginTop: Spacing.md, alignItems: 'center' },
  resendText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600', textDecorationLine: 'underline' },
});

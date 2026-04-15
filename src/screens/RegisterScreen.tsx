import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, KeyboardAvoidingView,
  Platform, ScrollView, Alert,
} from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../theme/colors';
import { useTranslation } from '../context/LanguageContext';
import { registerUser, logoutUser } from '../services/authService';

interface RegisterScreenProps {
  onBack: () => void;
  onSuccess: (name: string) => void;
}

const PASSWORD_RULES = [
  { label: 'Almeno 8 caratteri',           test: (p: string) => p.length >= 8 },
  { label: 'Una lettera maiuscola',         test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Un numero',                     test: (p: string) => /[0-9]/.test(p) },
  { label: 'Un carattere speciale (!@#$…)', test: (p: string) => /[!@#$%^&*()_+\-=\[\]{}|;':",.<>?]/.test(p) },
];

function passwordStrength(p: string): number {
  return PASSWORD_RULES.filter(r => r.test(p)).length;
}

const STRENGTH_LABELS = ['', 'Debole', 'Discreta', 'Buona', 'Ottima'];
const STRENGTH_COLORS = ['', Colors.red, '#F97316', '#F0D98A', Colors.green];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function PasswordToggle({ show, onPress }: { show: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.eyeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <View style={styles.eyeIconWrap}>
        <View style={[styles.eyeOuter, { borderColor: Colors.textTertiary }]}>
          {show ? (
            <View style={[styles.pupil, { backgroundColor: Colors.textTertiary }]} />
          ) : null}
        </View>
        {!show && <View style={[styles.slash, { backgroundColor: Colors.textTertiary }]} />}
      </View>
    </TouchableOpacity>
  );
}

export default function RegisterScreen({ onBack, onSuccess }: RegisterScreenProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const strength = passwordStrength(password);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Il nome è obbligatorio.';
    if (!email.trim()) e.email = "L'email è obbligatoria.";
    else if (!EMAIL_REGEX.test(email.trim())) e.email = 'Formato email non valido (es. nome@esempio.it).';
    const failedRules = PASSWORD_RULES.filter(r => !r.test(password));
    if (failedRules.length > 0) e.password = `La password deve avere: ${failedRules.map(r => r.label.toLowerCase()).join(', ')}.`;
    if (!confirmPassword) e.confirmPassword = 'Conferma la password.';
    else if (password !== confirmPassword) e.confirmPassword = 'Le password non coincidono.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await registerUser(name.trim(), email.trim(), password);
      await logoutUser();
      onSuccess(name.trim());
    } catch (err: any) {
      const code = err?.code ?? '';
      if (code === 'auth/email-already-in-use') {
        setErrors(e => ({ ...e, email: 'Email già registrata. Prova ad accedere.' }));
      } else if (code === 'auth/network-request-failed') {
        Alert.alert('Errore di rete', 'Controlla la connessione e riprova.');
      } else {
        Alert.alert('Errore', err?.message ?? 'Errore sconosciuto.');
      }
    } finally {
      setLoading(false);
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

        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{t.login.titleRegister}</Text>

          <View style={styles.form}>
            {/* Nome */}
            <View style={styles.field}>
              <Text style={styles.label}>{t.login.nameLabel}</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder={t.login.namePlaceholder}
                placeholderTextColor={Colors.textTertiary}
                value={name}
                onChangeText={(v) => { setName(v); setErrors(p => ({ ...p, name: '' })); }}
                autoCapitalize="words"
              />
              {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
            </View>

            {/* Email */}
            <View style={styles.field}>
              <Text style={styles.label}>{t.login.emailLabel}</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder={t.login.emailPlaceholder}
                placeholderTextColor={Colors.textTertiary}
                value={email}
                onChangeText={(v) => { setEmail(v); setErrors(p => ({ ...p, email: '' })); }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            {/* Password */}
            <View style={styles.field}>
              <Text style={styles.label}>{t.login.passwordLabel}</Text>
              <View style={[styles.inputRow, errors.password && styles.inputError]}>
                <TextInput
                  style={styles.inputFlex}
                  placeholder={t.login.passwordPlaceholderNew}
                  placeholderTextColor={Colors.textTertiary}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setErrors(p => ({ ...p, password: '' })); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <PasswordToggle show={showPassword} onPress={() => setShowPassword(!showPassword)} />
              </View>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
              {password.length > 0 && (
                <View style={styles.strengthRow}>
                  <View style={styles.strengthBars}>
                    {[1,2,3,4].map(i => (
                      <View key={i} style={[styles.strengthBar, { backgroundColor: i <= strength ? STRENGTH_COLORS[strength] : Colors.border }]} />
                    ))}
                  </View>
                  <Text style={[styles.strengthLabel, { color: STRENGTH_COLORS[strength] }]}>{STRENGTH_LABELS[strength]}</Text>
                </View>
              )}
              <View style={styles.rules}>
                {PASSWORD_RULES.map((rule, i) => {
                  const ok = rule.test(password);
                  return (
                    <Text key={i} style={[styles.ruleText, ok && styles.ruleOk]}>
                      {ok ? '✓' : '·'} {rule.label}
                    </Text>
                  );
                })}
              </View>
            </View>

            {/* Conferma password */}
            <View style={styles.field}>
              <Text style={styles.label}>{t.login.confirmPasswordLabel}</Text>
              <View style={[styles.inputRow, errors.confirmPassword && styles.inputError]}>
                <TextInput
                  style={styles.inputFlex}
                  placeholder={t.login.confirmPasswordPlaceholder}
                  placeholderTextColor={Colors.textTertiary}
                  value={confirmPassword}
                  onChangeText={(v) => { setConfirmPassword(v); setErrors(p => ({ ...p, confirmPassword: '' })); }}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <PasswordToggle show={showConfirmPassword} onPress={() => setShowConfirmPassword(!showConfirmPassword)} />
              </View>
              {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={loading}
            >
              <Text style={styles.submitBtnText}>{loading ? 'Registrazione in corso…' : t.login.registerBtn}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.legal}>
            Registrandoti accetti i nostri Termini di utilizzo e la nostra Privacy Policy.{'\n'}App +18.
          </Text>
        </ScrollView>
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
  container: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: 40 },
  title: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xl },
  form: { gap: Spacing.md, marginBottom: Spacing.xl },
  field: { gap: Spacing.xs },
  label: { fontSize: FontSize.base, fontWeight: '600', color: Colors.textSecondary },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    fontSize: FontSize.lg, color: Colors.text, backgroundColor: Colors.bg2,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    backgroundColor: Colors.bg2,
  },
  inputFlex: { flex: 1, paddingHorizontal: Spacing.lg, paddingVertical: 14, fontSize: FontSize.lg, color: Colors.text },
  inputError: { borderColor: Colors.red },
  errorText: { fontSize: FontSize.sm, color: Colors.red, fontWeight: '500' },
  eyeBtn: { paddingHorizontal: Spacing.md, justifyContent: 'center', alignItems: 'center' },
  eyeIconWrap: { position: 'relative', width: 22, height: 14, justifyContent: 'center', alignItems: 'center' },
  eyeOuter: { width: 22, height: 14, borderRadius: 11, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  pupil: { width: 6, height: 6, borderRadius: 3 },
  slash: { position: 'absolute', width: 26, height: 1.5, borderRadius: 1, transform: [{ rotate: '-35deg' }] },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  strengthBars: { flexDirection: 'row', gap: 4, flex: 1 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: FontSize.sm, fontWeight: '600', minWidth: 52 },
  rules: { marginTop: Spacing.sm, gap: 3 },
  ruleText: { fontSize: FontSize.sm, color: Colors.textTertiary },
  ruleOk: { color: Colors.green, fontWeight: '600' },
  submitBtn: { backgroundColor: Colors.text, borderRadius: Radius.md, paddingVertical: Spacing.lg, alignItems: 'center', marginTop: Spacing.sm },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: FontSize.base, fontWeight: '700', color: '#fff' },
  legal: { textAlign: 'center', fontSize: FontSize.xs, color: Colors.textTertiary, lineHeight: 18 },
});

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, KeyboardAvoidingView,
  Platform, ScrollView, Alert,
} from 'react-native';
import { Colors, getColors, FontSize, Spacing, Radius } from '../theme/colors';
import { useTranslation } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { registerUser } from '../services/authService';

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

function PasswordToggle({ show, onPress, color }: { show: boolean; onPress: () => void; color: string }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.eyeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <View style={styles.eyeIconWrap}>
        <View style={[styles.eyeOuter, { borderColor: color }]}>
          {show ? (
            <View style={[styles.pupil, { backgroundColor: color }]} />
          ) : null}
        </View>
        {!show && <View style={[styles.slash, { backgroundColor: color }]} />}
      </View>
    </TouchableOpacity>
  );
}

export default function RegisterScreen({ onBack, onSuccess }: RegisterScreenProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const C = getColors(isDark);
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
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>

        {/* Violet hero header */}
        <View style={[styles.heroArea, { backgroundColor: C.hero }]}>
          <Text style={styles.heroKicker}>ODDFEED · REGISTRATI</Text>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Crea account.</Text>
              <Text style={[styles.heroSubtitle, { color: C.heroSubtext }]}>
                Inizia a leggere le notizie{'\n'}più assurde del mondo.
              </Text>
            </View>
            <Text style={styles.heroEmoji}>✨</Text>
          </View>

          {/* Back button in hero */}
          <TouchableOpacity style={styles.heroBackBtn} onPress={onBack}>
            <Text style={styles.heroBackArrow}>←</Text>
            <Text style={styles.heroBackText}>{t.common.back}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={[styles.container, { backgroundColor: C.bg }]} keyboardShouldPersistTaps="handled">

          <View style={styles.form}>
            {/* Nome */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: C.textSecondary }]}>{t.login.nameLabel}</Text>
              <TextInput
                style={[styles.input, { borderColor: C.border, backgroundColor: C.bg2, color: C.text }, errors.name && styles.inputError]}
                placeholder={t.login.namePlaceholder}
                placeholderTextColor={C.textTertiary}
                value={name}
                onChangeText={(v) => { setName(v); setErrors(p => ({ ...p, name: '' })); }}
                autoCapitalize="words"
              />
              {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
            </View>

            {/* Email */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: C.textSecondary }]}>{t.login.emailLabel}</Text>
              <TextInput
                style={[styles.input, { borderColor: C.border, backgroundColor: C.bg2, color: C.text }, errors.email && styles.inputError]}
                placeholder={t.login.emailPlaceholder}
                placeholderTextColor={C.textTertiary}
                value={email}
                onChangeText={(v) => { setEmail(v); setErrors(p => ({ ...p, email: '' })); }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            {/* Password */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: C.textSecondary }]}>{t.login.passwordLabel}</Text>
              <View style={[styles.inputRow, { borderColor: C.border, backgroundColor: C.bg2 }, errors.password && styles.inputError]}>
                <TextInput
                  style={[styles.inputFlex, { color: C.text }]}
                  placeholder={t.login.passwordPlaceholderNew}
                  placeholderTextColor={C.textTertiary}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setErrors(p => ({ ...p, password: '' })); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <PasswordToggle show={showPassword} onPress={() => setShowPassword(!showPassword)} color={C.textTertiary} />
              </View>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
              {password.length > 0 && (
                <View style={styles.strengthRow}>
                  <View style={styles.strengthBars}>
                    {[1,2,3,4].map(i => (
                      <View key={i} style={[styles.strengthBar, { backgroundColor: i <= strength ? STRENGTH_COLORS[strength] : C.border }]} />
                    ))}
                  </View>
                  <Text style={[styles.strengthLabel, { color: STRENGTH_COLORS[strength] }]}>{STRENGTH_LABELS[strength]}</Text>
                </View>
              )}
              <View style={styles.rules}>
                {PASSWORD_RULES.map((rule, i) => {
                  const ok = rule.test(password);
                  return (
                    <Text key={i} style={[styles.ruleText, { color: C.textTertiary }, ok && styles.ruleOk]}>
                      {ok ? '✓' : '·'} {rule.label}
                    </Text>
                  );
                })}
              </View>
            </View>

            {/* Conferma password */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: C.textSecondary }]}>{t.login.confirmPasswordLabel}</Text>
              <View style={[styles.inputRow, { borderColor: C.border, backgroundColor: C.bg2 }, errors.confirmPassword && styles.inputError]}>
                <TextInput
                  style={[styles.inputFlex, { color: C.text }]}
                  placeholder={t.login.confirmPasswordPlaceholder}
                  placeholderTextColor={C.textTertiary}
                  value={confirmPassword}
                  onChangeText={(v) => { setConfirmPassword(v); setErrors(p => ({ ...p, confirmPassword: '' })); }}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <PasswordToggle show={showConfirmPassword} onPress={() => setShowConfirmPassword(!showConfirmPassword)} color={C.textTertiary} />
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

          <Text style={[styles.legal, { color: C.textTertiary }]}>
            Registrandoti accetti i nostri Termini di utilizzo e la nostra Privacy Policy.{'\n'}App +18.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },

  // Violet hero header
  heroArea: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: 0,
  },
  heroKicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: Spacing.md,
  },
  heroTitle: {
    fontSize: 33,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  heroSubtitle: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 19,
  },
  heroEmoji: {
    fontSize: 64,
    lineHeight: 72,
    marginTop: 2,
  },
  heroBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  heroBackArrow: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  heroBackText: { fontSize: FontSize.sm, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },

  container: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: 40 },
  form: { gap: Spacing.md, marginBottom: Spacing.xl },
  field: { gap: Spacing.xs },
  label: { fontSize: FontSize.base, fontWeight: '600' },
  input: {
    borderWidth: 1, borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    fontSize: FontSize.lg,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: Radius.md,
  },
  inputFlex: { flex: 1, paddingHorizontal: Spacing.lg, paddingVertical: 14, fontSize: FontSize.lg },
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
  ruleText: { fontSize: FontSize.sm },
  ruleOk: { color: Colors.green, fontWeight: '600' },
  submitBtn: { backgroundColor: Colors.violet, borderRadius: Radius.md, paddingVertical: Spacing.lg, alignItems: 'center', marginTop: Spacing.sm },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: FontSize.base, fontWeight: '700', color: '#fff' },
  legal: { textAlign: 'center', fontSize: FontSize.xs, lineHeight: 18 },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Colors, getColors, FontSize, Spacing, Radius } from '../theme/colors';
import { registerUser, loginUser, logoutUser, signInWithGoogle, signInWithFacebook } from '../services/authService';
import { fetchSignInMethodsForEmail } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useTranslation } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from '../config/socialAuth';

// Configura Google Sign-In
GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  iosClientId: GOOGLE_IOS_CLIENT_ID,
});

interface LoginScreenProps {
  onLogin: (name: string, isNew?: boolean) => void;
  onForgotPassword: () => void;
  onGoToRegister: () => void;
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


const PRIVACY_TEXT = `OddFeed non raccoglie né trasmette dati personali ai nostri server. Le tue preferenze sono salvate esclusivamente sul tuo dispositivo.\n\nLe notifiche push usano token anonimi non collegati alla tua identità.\n\nPuoi eliminare tutti i dati disinstallando l'app.\n\nPer informazioni sulla privacy contattaci tramite l'app nella sezione Profilo → Privacy e Termini.\n\nApp +18.`;

const TERMS_TEXT = `Usando OddFeed accetti i seguenti termini:\n\n• I contenuti sono a scopo informativo e di intrattenimento\n• È vietato diffondere i contenuti in modo fuorviante\n• OddFeed si riserva il diritto di modificare il servizio\n• Gli abbonamenti Premium si rinnovano automaticamente salvo disdetta\n\nPer assistenza contattaci tramite l'app nella sezione Profilo.`;

// Google G — logo ufficiale PNG dai server Google
function GoogleLogo() {
  return (
    <Image
      source={{ uri: 'https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png' }}
      style={{ width: 22, height: 22 }}
      resizeMode="contain"
    />
  );
}

// Logo Facebook — "f" bianco bold
function FacebookLogo() {
  return (
    <Text style={fbStyle.f}>f</Text>
  );
}

const fbStyle = StyleSheet.create({
  f: {
    fontSize: 22, fontWeight: '900',
    color: '#fff',
    lineHeight: 26,
    width: 14,
    textAlign: 'center',
    includeFontPadding: false,
  },
});

// Icona occhio custom flat — senza librerie esterne
function EyeOutlineIcon({ color }: { color: string }) {
  return (
    <View style={[eyeStyles.eyeOuter, { borderColor: color }]}>
      <View style={[eyeStyles.pupil, { backgroundColor: color }]} />
    </View>
  );
}

function EyeOffIcon({ color }: { color: string }) {
  return (
    <View style={eyeStyles.eyeWrap}>
      <View style={[eyeStyles.eyeOuter, { borderColor: color }]}>
        <View style={[eyeStyles.pupil, { backgroundColor: color }]} />
      </View>
      {/* Barra diagonale */}
      <View style={[eyeStyles.slash, { backgroundColor: color }]} />
    </View>
  );
}

function PasswordToggle({ show, onPress }: { show: boolean; onPress: () => void }) {
  const color = Colors.textTertiary;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={eyeStyles.btn}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      {show ? <EyeOutlineIcon color={color} /> : <EyeOffIcon color={color} />}
    </TouchableOpacity>
  );
}

const eyeStyles = StyleSheet.create({
  btn: { paddingHorizontal: Spacing.md, justifyContent: 'center', alignItems: 'center' },
  eyeWrap: { position: 'relative', width: 22, height: 14, justifyContent: 'center', alignItems: 'center' },
  eyeOuter: {
    width: 22,
    height: 14,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pupil: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  slash: {
    position: 'absolute',
    width: 26,
    height: 1.5,
    borderRadius: 1,
    transform: [{ rotate: '-35deg' }],
  },
});

export default function LoginScreen({ onLogin, onForgotPassword, onGoToRegister }: LoginScreenProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const C = getColors(isDark);
  const isRegister = false;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setSocialLoading('google');
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      const user = await signInWithGoogle(tokens.idToken, tokens.accessToken);
      onLogin(user.displayName ?? user.email ?? 'Utente', false);
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // utente ha annullato, nessun messaggio
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // già in corso
      } else {
        Alert.alert('Errore', 'Accesso con Google non riuscito. Riprova.');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleFacebookSignIn = async () => {
    try {
      setSocialLoading('facebook');
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
      if (result.isCancelled) return;
      const data = await AccessToken.getCurrentAccessToken();
      if (!data) throw new Error('Nessun token Facebook');
      const user = await signInWithFacebook(data.accessToken);
      onLogin(user.displayName ?? user.email ?? 'Utente', false);
    } catch (error: any) {
      Alert.alert('Errore', 'Accesso con Facebook non riuscito. Riprova.');
    } finally {
      setSocialLoading(null);
    }
  };

  const strength = isRegister ? passwordStrength(password) : 0;

  const validate = (): boolean => {
    const e: Record<string, string> = {};

    if (isRegister && !name.trim()) {
      e.name = 'Il nome è obbligatorio.';
    }

    if (!email.trim()) {
      e.email = 'L\'email è obbligatoria.';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      e.email = 'Il formato dell\'email non è valido (es. nome@esempio.it).';
    }

    if (isRegister) {
      const failedRules = PASSWORD_RULES.filter(r => !r.test(password));
      if (failedRules.length > 0) {
        e.password = `La password deve avere: ${failedRules.map(r => r.label.toLowerCase()).join(', ')}.`;
      }
      if (!confirmPassword) {
        e.confirmPassword = 'Conferma la password.';
      } else if (password !== confirmPassword) {
        e.confirmPassword = 'Le password non coincidono. Riprova.';
      }
    } else {
      if (!password) {
        e.password = 'La password è obbligatoria.';
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      if (isRegister) {
        await registerUser(name, email, password);
        await logoutUser(); // disconnette subito dopo la registrazione
        onLogin(name || email.split('@')[0], true);
      } else {
        await loginUser(email, password);
        onLogin(name || email.split('@')[0], false);
      }
    } catch (err: any) {
      const code = err?.code ?? '';
      if (code === 'auth/email-already-in-use') {
        setErrors(e => ({ ...e, email: 'Email già registrata. Prova ad accedere.' }));
      } else if (code === 'auth/user-not-found') {
        setErrors(e => ({ ...e, email: t.login.errAccountNotFound }));
      } else if (code === 'auth/wrong-password') {
        setErrors(e => ({ ...e, password: t.login.errPasswordWrong }));
      } else if (code === 'auth/invalid-credential') {
        // Firebase v11+ restituisce lo stesso codice sia per email inesistente che password sbagliata.
        // Usiamo fetchSignInMethodsForEmail per distinguere i due casi.
        try {
          const methods = await fetchSignInMethodsForEmail(auth, email.trim());
          if (methods.length === 0) {
            // Email non registrata
            setErrors(e => ({ ...e, email: t.login.errAccountNotFound }));
          } else {
            // Email esiste ma password sbagliata
            setErrors(e => ({ ...e, password: t.login.errPasswordWrong }));
          }
        } catch {
          // Fallback generico se anche fetchSignInMethods fallisce
          setErrors(e => ({ ...e, password: 'Email o password non corretti. Controlla e riprova.' }));
        }
      } else if (code === 'auth/network-request-failed') {
        setErrors(e => ({ ...e, password: 'Errore di rete. Controlla la connessione.' }));
      } else {
        setErrors(e => ({ ...e, password: err?.message ?? 'Errore sconosciuto.' }));
      }
    }
  };


  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>

        {/* Violet hero — fuori dallo scroll */}
        <View style={[styles.heroArea, { backgroundColor: C.hero }]}>
          <Text style={styles.heroKicker}>ODDFEED · {isRegister ? 'REGISTRATI' : 'ACCEDI'}</Text>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>{isRegister ? 'Crea account.' : 'Bentornato.'}</Text>
              <Text style={[styles.heroSubtitle, { color: C.heroSubtext }]}>
                {isRegister
                  ? 'Inizia a leggere le notizie più assurde del mondo.'
                  : 'Le storie più strane del mondo,\nsolo per te.'}
              </Text>
            </View>
            <Text style={styles.heroEmoji}>🌍</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={[styles.container, { backgroundColor: C.bg }]} keyboardShouldPersistTaps="handled">

          {/* Social login */}
          <View style={styles.socialWrap}>
            {/* Google */}
            <TouchableOpacity
              style={styles.googleBtn}
              activeOpacity={0.85}
              onPress={handleGoogleSignIn}
              disabled={socialLoading !== null}
            >
              <View style={{ width: 22, height: 22, justifyContent: 'center', alignItems: 'center' }}>
                {socialLoading === 'google' ? (
                  <ActivityIndicator size="small" color="#3C4043" />
                ) : (
                  <GoogleLogo />
                )}
              </View>
              <Text style={styles.googleBtnText}>Continua con Google</Text>
            </TouchableOpacity>

            {/* Facebook */}
            <TouchableOpacity
              style={styles.facebookBtn}
              activeOpacity={0.85}
              onPress={handleFacebookSignIn}
              disabled={socialLoading !== null}
            >
              <View style={{ width: 22, height: 26, justifyContent: 'center', alignItems: 'center' }}>
                {socialLoading === 'facebook' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <FacebookLogo />
                )}
              </View>
              <Text style={styles.facebookBtnText}>Continua con Facebook</Text>
            </TouchableOpacity>
          </View>

          {/* Separatore */}
          <View style={styles.separatorRow}>
            <View style={[styles.separatorLine, { backgroundColor: C.border }]} />
            <Text style={[styles.separatorText, { color: C.textTertiary }]}>oppure</Text>
            <View style={[styles.separatorLine, { backgroundColor: C.border }]} />
          </View>

          <View style={styles.form}>

            {/* Nome */}
            {isRegister && (
              <View style={styles.field}>
                <Text style={[styles.label, { color: C.textSecondary }]}>Nome</Text>
                <TextInput
                  style={[styles.input, { borderColor: C.border, backgroundColor: C.bg2, color: C.text }, errors.name && styles.inputError]}
                  placeholder="Come ti chiami?"
                  placeholderTextColor={C.textTertiary}
                  value={name}
                  onChangeText={(v) => { setName(v); setErrors(p => ({ ...p, name: '' })); }}
                  autoCapitalize="words"
                />
                {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
              </View>
            )}

            {/* Email */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: C.textSecondary }]}>Email</Text>
              <TextInput
                style={[styles.input, { borderColor: C.border, backgroundColor: C.bg2, color: C.text }, errors.email && styles.inputError]}
                placeholder="nome@esempio.it"
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
              <Text style={[styles.label, { color: C.textSecondary }]}>Password</Text>
              <View style={[styles.inputRow, { borderColor: C.border, backgroundColor: C.bg2 }, errors.password && styles.inputError]}>
                <TextInput
                  style={[styles.inputFlex, { color: C.text }]}
                  placeholder={isRegister ? 'Crea una password sicura' : 'La tua password'}
                  placeholderTextColor={C.textTertiary}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setErrors(p => ({ ...p, password: '' })); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <PasswordToggle show={showPassword} onPress={() => setShowPassword(!showPassword)} />
              </View>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

              {/* Forza password */}
              {isRegister && password.length > 0 && (
                <View style={styles.strengthRow}>
                  <View style={styles.strengthBars}>
                    {[1,2,3,4].map(i => (
                      <View key={i} style={[styles.strengthBar, { backgroundColor: i <= strength ? STRENGTH_COLORS[strength] : Colors.border }]} />
                    ))}
                  </View>
                  <Text style={[styles.strengthLabel, { color: STRENGTH_COLORS[strength] }]}>
                    {STRENGTH_LABELS[strength]}
                  </Text>
                </View>
              )}

              {/* Requisiti */}
              {isRegister && (
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
              )}
            </View>

            {/* Conferma password */}
            {isRegister && (
              <View style={styles.field}>
                <Text style={[styles.label, { color: C.textSecondary }]}>Conferma password</Text>
                <View style={[styles.inputRow, { borderColor: C.border, backgroundColor: C.bg2 }, errors.confirmPassword && styles.inputError]}>
                  <TextInput
                    style={[styles.inputFlex, { color: C.text }]}
                    placeholder="Ripeti la password"
                    placeholderTextColor={C.textTertiary}
                    value={confirmPassword}
                    onChangeText={(v) => { setConfirmPassword(v); setErrors(p => ({ ...p, confirmPassword: '' })); }}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <PasswordToggle show={showConfirmPassword} onPress={() => setShowConfirmPassword(!showConfirmPassword)} />
                </View>
                {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
              </View>
            )}

            {/* Recupera password */}
            {!isRegister && (
              <TouchableOpacity onPress={onForgotPassword} style={styles.forgotWrap}>
                <Text style={[styles.forgotText, { color: C.textSecondary }]}>Password dimenticata?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
              <Text style={styles.submitBtnText}>{isRegister ? 'Registrati' : 'Accedi'}</Text>
            </TouchableOpacity>
          </View>

          {/* Vai alla registrazione */}
          <TouchableOpacity onPress={onGoToRegister}>
            <Text style={[styles.switchText, { color: C.textSecondary }]}>
              {t.login.switchToRegister}
              <Text style={[styles.switchLink, { color: C.text }]}>{t.login.switchRegisterLink}</Text>
            </Text>
          </TouchableOpacity>

          {/* Legale */}
          <Text style={[styles.legal, { color: C.textTertiary }]}>
            Continuando accetti i nostri{' '}
            <Text style={[styles.legalLink, { color: C.textSecondary }]} onPress={() => setShowTerms(true)}>Termini di utilizzo</Text>
            {' '}e la nostra{' '}
            <Text style={[styles.legalLink, { color: C.textSecondary }]} onPress={() => setShowPrivacy(true)}>Privacy Policy</Text>.
            {'\n'}App +18.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal Privacy */}
      <Modal visible={showPrivacy} transparent animationType="slide" onRequestClose={() => setShowPrivacy(false)}>
        <Pressable style={legalModal.overlay} onPress={() => setShowPrivacy(false)} />
        <View style={legalModal.container}>
          <View style={legalModal.handle} />
          <Text style={legalModal.title}>Privacy Policy</Text>
          <ScrollView style={{ maxHeight: 320 }}>
            <Text style={legalModal.body}>{PRIVACY_TEXT}</Text>
          </ScrollView>
          <TouchableOpacity style={legalModal.closeBtn} onPress={() => setShowPrivacy(false)}>
            <Text style={legalModal.closeBtnText}>Chiudi</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Modal Termini */}
      <Modal visible={showTerms} transparent animationType="slide" onRequestClose={() => setShowTerms(false)}>
        <Pressable style={legalModal.overlay} onPress={() => setShowTerms(false)} />
        <View style={legalModal.container}>
          <View style={legalModal.handle} />
          <Text style={legalModal.title}>Termini di utilizzo</Text>
          <ScrollView style={{ maxHeight: 320 }}>
            <Text style={legalModal.body}>{TERMS_TEXT}</Text>
          </ScrollView>
          <TouchableOpacity style={legalModal.closeBtn} onPress={() => setShowTerms(false)}>
            <Text style={legalModal.closeBtnText}>Chiudi</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const legalModal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  container: {
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.lg,
    paddingBottom: 40,
    gap: Spacing.md,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.sm,
  },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  body: { fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: 24 },
  closeBtn: {
    backgroundColor: Colors.bg2, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm,
  },
  closeBtnText: { fontSize: FontSize.base, fontWeight: '600', color: Colors.textSecondary },
});

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },

  // Violet hero header
  heroArea: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
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

  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: 40,
  },
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
  inputFlex: {
    flex: 1, paddingHorizontal: Spacing.lg, paddingVertical: 14,
    fontSize: FontSize.lg, color: Colors.text,
  },
  inputError: { borderColor: Colors.red },
  errorText: {
    fontSize: FontSize.sm, color: Colors.red,
    fontWeight: '500', lineHeight: 18,
  },

  // Forza password
  strengthRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, marginTop: Spacing.sm,
  },
  strengthBars: { flexDirection: 'row', gap: 4, flex: 1 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: FontSize.sm, fontWeight: '600', minWidth: 52 },

  // Requisiti
  rules: { marginTop: Spacing.sm, gap: 3 },
  ruleText: { fontSize: FontSize.sm, color: Colors.textTertiary },
  ruleOk: { color: Colors.green, fontWeight: '600' },

  forgotWrap: { alignItems: 'flex-end' },
  forgotText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  submitBtn: {
    backgroundColor: Colors.violet, borderRadius: Radius.md,
    paddingVertical: Spacing.lg, alignItems: 'center', marginTop: Spacing.sm,
  },
  submitBtnText: { fontSize: FontSize.base, fontWeight: '700', color: '#fff' },
  switchText: {
    textAlign: 'center', fontSize: FontSize.base,
    color: Colors.textSecondary, marginBottom: Spacing.xl,
  },
  switchLink: { fontWeight: '700', color: Colors.text },
  legal: {
    textAlign: 'center', fontSize: FontSize.xs,
    color: Colors.textTertiary, lineHeight: 18,
    paddingHorizontal: Spacing.lg,
  },
  legalLink: { textDecorationLine: 'underline', color: Colors.textSecondary },

  // Social login
  socialWrap: { gap: Spacing.sm, marginBottom: Spacing.lg },

  // Google — bianco con bordo grigio (stile ufficiale)
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DADCE0',
  },
  googleBtnText: {
    flex: 1, textAlign: 'center',
    fontSize: FontSize.base, fontWeight: '700',
    color: '#3C4043',
  },

  // Facebook — blu ufficiale
  facebookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    backgroundColor: '#3B5998',
  },
  facebookBtnText: {
    flex: 1, textAlign: 'center',
    fontSize: FontSize.base, fontWeight: '700',
    color: '#fff',
  },

  separatorRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.md, marginBottom: Spacing.lg,
  },
  separatorLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  separatorText: { fontSize: FontSize.sm, color: Colors.textTertiary, fontWeight: '500' },
});

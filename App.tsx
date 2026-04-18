import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { LanguageProvider, useTranslation } from './src/context/LanguageContext';
import { onAuthChange, logoutUser, getUserProfile, resendVerificationEmail } from './src/services/authService';
import { registerForPushNotifications } from './src/services/notificationService';
import { initializePurchases, checkPremiumStatus } from './src/services/purchaseService';
import {
  updateDailyActivity,
  awardReadPoints,
  awardReactPoints,
  awardSharePoints,
  getLevelForPoints,
} from './src/services/pointsService';
import { User } from 'firebase/auth';
import { NewsItem } from './src/types';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import ArticleScreen from './src/screens/ArticleScreen';
import ArchiveScreen from './src/screens/ArchiveScreen';
import PointsScreen from './src/screens/PointsScreen';
import PremiumScreen from './src/screens/PremiumScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AccountDeletedScreen from './src/screens/AccountDeletedScreen';
import { Colors } from './src/theme/colors';

type Tab = 'Notizie' | 'Archivio' | 'Punti' | 'Premium' | 'Profilo';
type AppScreen = 'Loading' | 'Login' | 'Register' | 'ForgotPassword' | 'RegisterSuccess' | 'EmailVerification' | 'Onboarding' | 'Tabs' | 'Article' | 'AccountDeleted';

export type UserStats = {
  points: number;
  streak: number;
  level: number;           // indice numerico (0–5)
  readArticleIds: string[]; // per deduplicare i punti lettura
};

const EMPTY_STATS: UserStats = { points: 0, streak: 0, level: 0, readArticleIds: [] };

const TAB_EMOJIS: Record<Tab, string> = {
  Notizie: '📰', Archivio: '🗂️', Punti: '⭐', Premium: '👑', Profilo: '👤',
};

function RegisterSuccessScreen({ onGoToLogin, userName }: { onGoToLogin: () => void; userName: string }) {
  return (
    <View style={successStyles.safe}>
      <View style={successStyles.container}>
        <Text style={successStyles.emoji}>🎉</Text>
        <Text style={successStyles.title}>Registrazione completata!</Text>
        <Text style={successStyles.subtitle}>
          Benvenuto su OddFeed, <Text style={successStyles.bold}>{userName}</Text>.{'\n'}
          Accedi ora per iniziare a leggere le notizie più strane dal mondo.
        </Text>
        <TouchableOpacity style={successStyles.btn} onPress={onGoToLogin}>
          <Text style={successStyles.btnText}>Accedi</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EmailVerificationScreen({
  email,
  onResend,
  onLogout,
}: {
  email: string;
  onResend: () => void;
  onLogout: () => void;
}) {
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      await resendVerificationEmail();
      Alert.alert('Email inviata ✓', `Abbiamo reinviato il link di conferma a ${email}.`);
    } catch {
      Alert.alert('Errore', 'Impossibile reinviare la mail. Riprova tra qualche minuto.');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={verifyStyles.safe}>
      <View style={verifyStyles.container}>

        <View style={verifyStyles.iconWrap}>
          <Text style={verifyStyles.icon}>✉️</Text>
        </View>

        <Text style={verifyStyles.title}>Controlla la tua email</Text>
        <Text style={verifyStyles.subtitle}>
          Abbiamo inviato un link di attivazione a{'\n'}
          <Text style={verifyStyles.email}>{email}</Text>
        </Text>

        <View style={verifyStyles.stepsCard}>
          <Text style={verifyStyles.stepsTitle}>Come attivare l'account</Text>
          <Text style={verifyStyles.step}>1. Apri la tua casella di posta</Text>
          <Text style={verifyStyles.step}>2. Clicca sul link nell'email di OddFeed</Text>
          <Text style={verifyStyles.step}>3. Verrai reindirizzato alla pagina di accesso</Text>
          <Text style={verifyStyles.spamHint}>Non trovi la mail? Controlla lo spam.</Text>
        </View>

        <TouchableOpacity
          style={[verifyStyles.resendBtn, resending && verifyStyles.btnDisabled]}
          onPress={handleResend}
          disabled={resending}
          activeOpacity={0.75}
        >
          <Text style={verifyStyles.resendBtnText}>
            {resending ? 'Invio in corso…' : 'Reinvia email di attivazione'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onLogout} style={verifyStyles.logoutLink} activeOpacity={0.7}>
          <Text style={verifyStyles.logoutText}>← Torna al login</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const verifyStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center' },
  container: { paddingHorizontal: 28, alignItems: 'center', gap: 16 },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  icon: { fontSize: 36 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text, textAlign: 'center', letterSpacing: -0.3 },
  subtitle: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  email: { fontWeight: '700', color: Colors.text },
  stepsCard: {
    width: '100%', backgroundColor: Colors.bg2,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    padding: 16, gap: 8, marginTop: 4,
  },
  stepsTitle: { fontSize: 13, fontWeight: '700', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  step: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  spamHint: { fontSize: 12, color: Colors.textTertiary, marginTop: 4, fontStyle: 'italic' },
  resendBtn: {
    width: '100%', borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#6366F1', backgroundColor: '#EEF2FF', marginTop: 4,
  },
  resendBtnText: { fontSize: 15, fontWeight: '600', color: '#6366F1' },
  btnDisabled: { opacity: 0.5 },
  logoutLink: { marginTop: 4, paddingVertical: 10 },
  logoutText: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary },
});

const successStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center' },
  container: { paddingHorizontal: 32, alignItems: 'center', gap: 16 },
  emoji: { fontSize: 56 },
  title: { fontSize: 26, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  subtitle: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  bold: { fontWeight: '700', color: Colors.text },
  btn: {
    marginTop: 8,
    backgroundColor: Colors.text,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
  },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

function AppContent() {
  const { t } = useTranslation();

  const [appScreen, setAppScreen] = useState<AppScreen>('Loading');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userName, setUserName] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('Notizie');
  const [articleId, setArticleId] = useState<string>('1');
  const [currentArticle, setCurrentArticle] = useState<NewsItem | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isPremium, setIsPremium] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>(EMPTY_STATS);

  // Flag per intercettare onAuthStateChanged dopo eliminazione account
  const accountJustDeleted = React.useRef(false);

  // ─── Carica statistiche utente da Firebase ──────────────────────────────
  const loadUserStats = useCallback(async (uid: string) => {
    try {
      const profile = await getUserProfile(uid);
      if (profile) {
        const base: UserStats = {
          points: profile.points ?? 0,
          streak: profile.streak ?? 0,
          level: profile.level ?? 0,
          readArticleIds: profile.readArticleIds ?? [],
        };
        setUserStats(base);
        // Precarica readIds dal profilo
        setReadIds(new Set(base.readArticleIds));
      }
      // Aggiorna attività giornaliera (streak + +5 pt apertura app)
      const { newStreak, pointsEarned } = await updateDailyActivity(uid);
      if (pointsEarned > 0) {
        setUserStats(prev => {
          const newPoints = prev.points + pointsEarned;
          return { ...prev, points: newPoints, streak: newStreak, level: getLevelForPoints(newPoints) };
        });
      }
    } catch {
      // Firestore non raggiungibile — rimane su EMPTY_STATS
    }
  }, []);

  // ─── Gestione punti da ArticleScreen ────────────────────────────────────
  const handlePointsChange = useCallback(async (
    action: 'read' | 'react' | 'share',
    articleId?: string,
  ) => {
    const uid = currentUser?.uid;
    if (!uid) return;

    try {
      let delta = 0;
      if (action === 'read' && articleId) {
        delta = await awardReadPoints(uid, articleId, userStats.points, userStats.readArticleIds);
        if (delta > 0) {
          setUserStats(prev => {
            const newPoints = prev.points + delta;
            return {
              ...prev,
              points: newPoints,
              level: getLevelForPoints(newPoints),
              readArticleIds: [...prev.readArticleIds, articleId],
            };
          });
        }
      } else if (action === 'react') {
        delta = await awardReactPoints(uid, userStats.points);
        setUserStats(prev => {
          const newPoints = prev.points + delta;
          return { ...prev, points: newPoints, level: getLevelForPoints(newPoints) };
        });
      } else if (action === 'share') {
        delta = await awardSharePoints(uid, userStats.points);
        setUserStats(prev => {
          const newPoints = prev.points + delta;
          return { ...prev, points: newPoints, level: getLevelForPoints(newPoints) };
        });
      }
    } catch {
      // Silently fail — i punti verranno sincronizzati alla prossima apertura
    }
  }, [currentUser, userStats.points, userStats.readArticleIds]);

  // ─── Auth listener ───────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      setCurrentUser(user);
      if (user) {
        setUserName(user.displayName ?? user.email?.split('@')[0] ?? '');

        try {
          const profile = await getUserProfile(user.uid);

          if (!__DEV__ && !user.emailVerified && !profile?.onboardingDone) {
            setAppScreen('EmailVerification');
            return;
          }

          if (profile?.onboardingDone) {
            setIsPremium(profile.isPremium ?? false);
            setAppScreen('Tabs');
            // Carica le stats in background dopo aver mostrato i Tabs
            loadUserStats(user.uid);
          } else {
            setAppScreen('Onboarding');
          }
          initializePurchases(user.uid).catch(() => {});
          registerForPushNotifications(user.uid).catch(() => {});
          checkPremiumStatus().then(premium => {
            if (premium) setIsPremium(true);
          }).catch(() => {});
        } catch (e) {
          setAppScreen('Onboarding');
        }
      } else {
        if (accountJustDeleted.current) {
          accountJustDeleted.current = false;
          setAppScreen('AccountDeleted');
        } else {
          setAppScreen('Login');
        }
        setUserStats(EMPTY_STATS);
      }
    });
    return unsubscribe;
  }, [loadUserStats]);

  const openArticle = (id: string, article?: NewsItem) => {
    setReadIds((prev) => new Set(prev).add(id));
    setArticleId(id);
    setCurrentArticle(article ?? null);
    setAppScreen('Article');
  };

  const handleLogin = (name: string, isNew: boolean) => {
    setUserName(name);
    if (isNew) setAppScreen('EmailVerification');
  };

  const handleOnboardingComplete = (_interests: string[], _slot: string) => {
    setAppScreen('Tabs');
    if (currentUser) loadUserStats(currentUser.uid);
  };

  const handleLogout = async () => {
    await logoutUser();
    setIsPremium(false);
    setReadIds(new Set());
    setActiveTab('Notizie');
    setUserStats(EMPTY_STATS);
  };

  const handleAccountDeleted = useCallback(() => {
    accountJustDeleted.current = true;
    setIsPremium(false);
    setReadIds(new Set());
    setActiveTab('Notizie');
    setUserStats(EMPTY_STATS);
  }, []);

  // ─── Schermate ───────────────────────────────────────────────────────────
  if (appScreen === 'Loading') {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingLogo}>Odd<Text style={styles.loadingLogoLight}>Feed</Text></Text>
        <ActivityIndicator color={Colors.textTertiary} style={{ marginTop: 20 }} />
      </View>
    );
  }

  if (appScreen === 'Login') {
    return <LoginScreen
      onLogin={(name, isNew) => handleLogin(name, isNew ?? false)}
      onForgotPassword={() => setAppScreen('ForgotPassword')}
      onGoToRegister={() => setAppScreen('Register')}
    />;
  }
  if (appScreen === 'Register') {
    return <RegisterScreen
      onBack={() => setAppScreen('Login')}
      onSuccess={(name) => { setUserName(name); setAppScreen(__DEV__ ? 'Onboarding' : 'EmailVerification'); }}
    />;
  }
  if (appScreen === 'RegisterSuccess') {
    return <RegisterSuccessScreen onGoToLogin={() => setAppScreen('Login')} userName={userName} />;
  }
  if (appScreen === 'EmailVerification') {
    return (
      <EmailVerificationScreen
        email={currentUser?.email ?? ''}
        onResend={() => {}}
        onLogout={async () => { await logoutUser(); }}
      />
    );
  }
  if (appScreen === 'ForgotPassword') {
    return <ForgotPasswordScreen onBack={() => setAppScreen('Login')} />;
  }
  if (appScreen === 'Onboarding') {
    return <OnboardingScreen userName={userName} onComplete={handleOnboardingComplete} />;
  }
  if (appScreen === 'Article') {
    return (
      <ArticleScreen
        newsId={articleId}
        article={currentArticle}
        onBack={() => setAppScreen('Tabs')}
        userId={currentUser?.uid ?? ''}
        userStats={userStats}
        onPointsChange={handlePointsChange}
      />
    );
  }
  if (appScreen === 'AccountDeleted') {
    return <AccountDeletedScreen onRestart={() => setAppScreen('Login')} />;
  }

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        {activeTab === 'Notizie' && (
          <HomeScreen
            onOpenArticle={openArticle}
            onGoToArchive={() => setActiveTab('Archivio')}
            readIds={readIds}
            isPremium={isPremium}
            userName={userName}
            userStats={userStats}
          />
        )}
        {activeTab === 'Archivio' && <ArchiveScreen onOpenArticle={openArticle} isPremium={isPremium} />}
        {activeTab === 'Punti' && (
          <PointsScreen userStats={userStats} userName={userName} />
        )}
        {activeTab === 'Premium' && (
          <PremiumScreen
            isPremium={isPremium}
            onUpgrade={() => setIsPremium(true)}
            onDowngrade={() => setIsPremium(false)}
          />
        )}
        {activeTab === 'Profilo' && (
          <ProfileScreen
            isPremium={isPremium}
            onGoToPremium={() => setActiveTab('Premium')}
            onLogout={handleLogout}
            onAccountDeleted={handleAccountDeleted}
            userName={userName}
            userStats={userStats}
          />
        )}
      </View>

      <View style={styles.tabBar}>
        {(Object.keys(TAB_EMOJIS) as Tab[]).map((name) => {
          const focused = activeTab === name;
          const TAB_KEYS: Record<Tab, keyof typeof t.tabs> = {
            Notizie: 'news', Archivio: 'archive', Punti: 'points', Premium: 'premium', Profilo: 'profile',
          };
          const label = t.tabs[TAB_KEYS[name]];
          return (
            <TouchableOpacity
              key={name}
              style={styles.tabItem}
              onPress={() => setActiveTab(name)}
              activeOpacity={0.7}
            >
              <Text style={styles.tabEmoji}>{TAB_EMOJIS[name]}</Text>
              <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { flex: 1 },
  loading: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLogo: {
    fontSize: 36,
    fontWeight: '800',
    color: '#3730A3',
    letterSpacing: -1,
  },
  loadingLogoLight: {
    fontWeight: '300',
    color: '#6366F1',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.bg2,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
    paddingBottom: 28,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabEmoji: { fontSize: 22 },
  tabLabel: { fontSize: 13, color: Colors.textTertiary },
  tabLabelActive: { color: Colors.text, fontWeight: '600' },
});

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

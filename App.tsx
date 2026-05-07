import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput, Animated, Easing, Dimensions, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_WIDTH = Dimensions.get('window').width;
import { LanguageProvider, useTranslation } from './src/context/LanguageContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { getColors } from './src/theme/colors';
import { onAuthChange, logoutUser, getUserProfile, resendVerificationEmail, ensureSocialUserProfile, updateUserPreferences } from './src/services/authService';
import { verifyOTP } from './src/services/emailService';
import { registerForPushNotifications, registerNotificationResponseHandler } from './src/services/notificationService';
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
  userId,
  onVerified,
  onLogout,
}: {
  email: string;
  userId: string;
  onVerified: () => void;
  onLogout: () => void;
}) {
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert('Codice non valido', 'Inserisci il codice a 6 cifre.');
      return;
    }
    setVerifying(true);
    try {
      const ok = await verifyOTP(userId, code.trim());
      if (ok) {
        await updateUserPreferences(userId, { emailVerified: true });
        onVerified();
      } else {
        Alert.alert('Codice errato', 'Il codice è errato o scaduto. Richiedi un nuovo codice.');
        setCode('');
      }
    } catch {
      Alert.alert('Errore', 'Verifica fallita. Riprova.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await resendVerificationEmail();
      Alert.alert('Codice inviato ✓', `Abbiamo inviato un nuovo codice a ${email}.`);
      setCode('');
    } catch {
      Alert.alert('Errore', 'Impossibile reinviare il codice. Riprova tra qualche minuto.');
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

        <Text style={verifyStyles.title}>Verifica la tua email</Text>
        <Text style={verifyStyles.subtitle}>
          Abbiamo inviato un codice a 6 cifre a{'\n'}
          <Text style={verifyStyles.email}>{email}</Text>
          {'\n\n'}
          <Text style={verifyStyles.spamNote}>📂 Non vedi l'email? Controlla la cartella spam.</Text>
        </Text>

        <TextInput
          style={verifyStyles.otpInput}
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="000000"
          placeholderTextColor={Colors.textTertiary}
          textAlign="center"
          autoFocus
        />

        <TouchableOpacity
          style={[verifyStyles.verifyBtn, (verifying || code.length !== 6) && verifyStyles.btnDisabled]}
          onPress={handleVerify}
          disabled={verifying || code.length !== 6}
          activeOpacity={0.85}
        >
          {verifying
            ? <ActivityIndicator color="#fff" />
            : <Text style={verifyStyles.verifyBtnText}>Verifica codice</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={[verifyStyles.resendBtn, resending && verifyStyles.btnDisabled]}
          onPress={handleResend}
          disabled={resending}
          activeOpacity={0.75}
        >
          <Text style={verifyStyles.resendBtnText}>
            {resending ? 'Invio in corso…' : 'Invia nuovo codice'}
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
  spamNote: { fontSize: 13, color: Colors.textTertiary, fontStyle: 'italic' },
  otpInput: {
    width: '100%', borderWidth: 2, borderColor: '#6366F1', borderRadius: 14,
    paddingVertical: 16, fontSize: 32, fontWeight: '800', letterSpacing: 12,
    color: Colors.text, backgroundColor: Colors.bg2, marginTop: 8,
  },
  verifyBtn: {
    width: '100%', borderRadius: 12, paddingVertical: 16, alignItems: 'center',
    backgroundColor: '#6366F1',
  },
  verifyBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  resendBtn: {
    width: '100%', borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#6366F1', backgroundColor: '#EEF2FF',
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
    backgroundColor: Colors.violet,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
  },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

// Numero massimo di notizie al giorno per livello (indice = livello)
export const DAILY_NEWS_LIMITS = [1, 1, 2, 3, 4, 5];
export const PREMIUM_NEWS_LIMIT = 10;

function AppContent() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const C = getColors(isDark);

  const [appScreen, setAppScreen] = useState<AppScreen>('Loading');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userName, setUserName] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('Notizie');
  const [articleId, setArticleId] = useState<string>('1');
  const [currentArticle, setCurrentArticle] = useState<NewsItem | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isPremium, setIsPremium] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>(EMPTY_STATS);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  // Sblocco gratuito "Te ne sblocco una" — attivo dopo onboarding se l'utente ha scelto il regalo
  const [freeUnlockActive, setFreeUnlockActive] = useState(false);
  // Articoli salvati
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savedArticles, setSavedArticles] = useState<NewsItem[]>([]);

  // Flag per intercettare onAuthStateChanged dopo eliminazione account
  const accountJustDeleted = React.useRef(false);

  // ─── Carica articoli salvati da AsyncStorage ────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem('oddFeedSavedArticles').then(data => {
      if (data) {
        const articles: NewsItem[] = JSON.parse(data);
        setSavedArticles(articles);
        setSavedIds(new Set(articles.map(a => a.id)));
      }
    }).catch(() => {});
  }, []);

  const handleToggleSave = useCallback(async (articleId: string, article: NewsItem) => {
    setSavedIds(prev => {
      const next = new Set(prev);
      let nextArticles: NewsItem[];
      if (next.has(articleId)) {
        next.delete(articleId);
        nextArticles = savedArticles.filter(a => a.id !== articleId);
      } else {
        next.add(articleId);
        nextArticles = [article, ...savedArticles.filter(a => a.id !== articleId)];
      }
      setSavedArticles(nextArticles);
      AsyncStorage.setItem('oddFeedSavedArticles', JSON.stringify(nextArticles)).catch(() => {});
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedArticles]);

  // ─── Animazione fade tra tab ─────────────────────────────────────────────
  const tabFadeAnim = useRef(new Animated.Value(1)).current;

  // ─── Animazione slide per ArticleScreen (overlay da destra) ─────────────
  const articleSlideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  // Animazione scala per icone tab
  const tabScales = useRef<Record<Tab, Animated.Value>>({
    Notizie: new Animated.Value(1),
    Archivio: new Animated.Value(1),
    Punti: new Animated.Value(1),
    Premium: new Animated.Value(1),
    Profilo: new Animated.Value(1),
  }).current;

  const switchTab = useCallback((tab: Tab) => {
    if (tab === activeTab) return;
    // Rimbalzo sull'icona del nuovo tab
    Animated.sequence([
      Animated.timing(tabScales[tab], { toValue: 1.25, duration: 80, useNativeDriver: true }),
      Animated.timing(tabScales[tab], { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    // Fade del contenuto
    Animated.timing(tabFadeAnim, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      setActiveTab(tab);
      Animated.timing(tabFadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    });
  }, [activeTab, tabFadeAnim, tabScales]);

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
        setUserName(user.displayName ?? '');

        // Google e Facebook non richiedono verifica email
        const isSocialLogin = user.providerData[0]?.providerId !== 'password';

        try {
          // Per i nuovi utenti social, crea il profilo Firestore automaticamente
          if (isSocialLogin) {
            await ensureSocialUserProfile(user);
          }

          const profile = await getUserProfile(user.uid);

          // Il nome vero è salvato come 'name' su Firestore durante la registrazione
          if (profile?.name) {
            setUserName(profile.name);
          } else if (user.displayName) {
            setUserName(user.displayName);
          }

          // Carica interessi utente per filtrare le notizie
          if (profile?.interests && profile.interests.length > 0) {
            setUserInterests(profile.interests as string[]);
          }

          // Verifica email solo per login email/password
          if (!isSocialLogin && !__DEV__ && !user.emailVerified && !profile?.onboardingDone) {
            setAppScreen('EmailVerification');
            return;
          }

          if (profile?.onboardingDone) {
            setIsPremium(profile.isPremium ?? false);
            setAppScreen('Tabs');
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

  // Ref all'ultima versione di openArticle — usato da handler esterni (notifiche, deep link)
  const openArticleRef = useRef<(id: string, article?: NewsItem) => void>(() => {});

  // ─── RevenueCat — aggiornamento real-time stato premium ─────────────────
  useEffect(() => {
    if (!currentUser) return;
    let cleanup: (() => void) | undefined;
    try {
      const Purchases = require('react-native-purchases').default;
      const listener = Purchases.addCustomerInfoUpdateListener((customerInfo: any) => {
        const premium = customerInfo.entitlements.active['premium'] !== undefined;
        setIsPremium(premium);
        // Sincronizza su Firestore in background
        if (currentUser?.uid) {
          updateUserPreferences(currentUser.uid, { isPremium: premium }).catch(() => {});
        }
      });
      cleanup = () => listener.remove?.();
    } catch {
      // react-native-purchases non disponibile nel simulatore
    }
    return () => cleanup?.();
  }, [currentUser]);

  const openArticle = (id: string, article?: NewsItem) => {
    setReadIds((prev) => new Set(prev).add(id));
    setArticleId(id);
    setCurrentArticle(article ?? null);
    articleSlideAnim.setValue(SCREEN_WIDTH);
    setAppScreen('Article');
    // requestAnimationFrame garantisce che il componente sia montato prima che l'animazione parta
    requestAnimationFrame(() => {
      Animated.timing(articleSlideAnim, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.poly(4)),
        useNativeDriver: true,
      }).start();
    });
  };

  // Tieni il ref sempre aggiornato all'ultima versione di openArticle
  openArticleRef.current = openArticle;

  // ─── Deep link + notifica tap → apri articolo ───────────────────────────
  useEffect(() => {
    // Handler tap su notifica push
    const unsubscribeNotif = registerNotificationResponseHandler((newsId: string) => {
      openArticleRef.current(newsId);
    });

    // Handler URL scheme: oddfeed://articolo/[id]
    const handleUrl = ({ url }: { url: string }) => {
      const match = url.match(/oddfeed:\/\/articolo\/([^/?#]+)/);
      if (match?.[1]) openArticleRef.current(match[1]);
    };
    const urlSubscription = Linking.addEventListener('url', handleUrl);

    // Controlla se l'app è stata aperta da un URL (cold start)
    Linking.getInitialURL().then(url => {
      if (url) handleUrl({ url });
    }).catch(() => {});

    return () => {
      unsubscribeNotif();
      urlSubscription.remove();
    };
  }, []);

  const handleBack = useCallback(() => {
    Animated.timing(articleSlideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 280,
      easing: Easing.in(Easing.poly(4)),
      useNativeDriver: true,
    }).start(() => setAppScreen('Tabs'));
  }, [articleSlideAnim]);

  const handleLogin = (name: string, isNew: boolean) => {
    setUserName(name);
    if (isNew) setAppScreen('EmailVerification');
  };

  const handleOnboardingComplete = async (_interests: string[], _slot: string) => {
    setAppScreen('Tabs');
    if (currentUser) loadUserStats(currentUser.uid);
    // Controlla se l'utente ha scelto il regalo di sblocco durante l'onboarding
    const freeUnlock = await AsyncStorage.getItem('oddFeedFreeUnlock');
    if (freeUnlock === 'true') {
      setFreeUnlockActive(true);
    }
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
        <View style={styles.loadingLogoWrap}>
          <Text style={styles.loadingLogoMain}>OddFeed</Text>
          <Text style={styles.loadingTagline}>Le notizie più strane del mondo</Text>
        </View>
        <ActivityIndicator color="rgba(255,255,255,0.6)" style={{ marginTop: 40 }} />
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
        userId={currentUser?.uid ?? ''}
        onVerified={() => setAppScreen('Onboarding')}
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
  // ArticleScreen viene renderizzato come overlay animato nel blocco principale (sotto)
  if (appScreen === 'AccountDeleted') {
    return <AccountDeletedScreen onRestart={() => setAppScreen('Register')} />;
  }

  // Parallasse: i tab si spostano leggermente a sx mentre l'articolo entra (stile iOS nativo)
  const tabParallax = articleSlideAnim.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: [-SCREEN_WIDTH * 0.08, 0],
    extrapolate: 'clamp',
  });

  // Tutti i tab rimangono montati — display:none nasconde senza rimontare
  // Questo elimina lo scatto al cambio tab e mantiene lo stato di scroll
  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <Animated.View style={[styles.content, { opacity: tabFadeAnim, transform: [{ translateX: tabParallax }] }]}>
        <View style={{ flex: 1, display: activeTab === 'Notizie' ? 'flex' : 'none' }}>
          <HomeScreen
            onOpenArticle={openArticle}
            onGoToArchive={() => switchTab('Archivio')}
            onGoToPremium={() => switchTab('Premium')}
            onGoToPoints={() => switchTab('Punti')}
            readIds={readIds}
            isPremium={isPremium}
            userName={userName}
            userStats={userStats}
            interests={userInterests}
            freeUnlockActive={freeUnlockActive}
          />
        </View>
        <View style={{ flex: 1, display: activeTab === 'Archivio' ? 'flex' : 'none' }}>
          <ArchiveScreen
            onOpenArticle={openArticle}
            isPremium={isPremium}
            interests={userInterests}
            userStats={userStats}
            savedIds={savedIds}
            savedArticles={savedArticles}
          />
        </View>
        <View style={{ flex: 1, display: activeTab === 'Punti' ? 'flex' : 'none' }}>
          <PointsScreen userStats={userStats} userName={userName} isPremium={isPremium} />
        </View>
        <View style={{ flex: 1, display: activeTab === 'Premium' ? 'flex' : 'none' }}>
          <PremiumScreen
            isPremium={isPremium}
            onUpgrade={() => {
              setIsPremium(true);
              if (currentUser?.uid) {
                updateUserPreferences(currentUser.uid, { isPremium: true }).catch(() => {});
              }
            }}
            onDowngrade={() => {
              setIsPremium(false);
              if (currentUser?.uid) {
                updateUserPreferences(currentUser.uid, { isPremium: false }).catch(() => {});
              }
            }}
          />
        </View>
        <View style={{ flex: 1, display: activeTab === 'Profilo' ? 'flex' : 'none' }}>
          <ProfileScreen
            isPremium={isPremium}
            onGoToPremium={() => switchTab('Premium')}
            onLogout={handleLogout}
            onAccountDeleted={handleAccountDeleted}
            userName={userName}
            userStats={userStats}
          />
        </View>
      </Animated.View>

      <View style={[styles.tabBar, { backgroundColor: C.bg2, borderTopColor: C.border }]}>
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
              onPress={() => switchTab(name)}
              activeOpacity={0.7}
            >
              {/* Pill indicator per il tab attivo */}
              <View style={[styles.tabPill, focused && { backgroundColor: C.violetBg }]}>
                <Animated.Text style={[styles.tabEmoji, { transform: [{ scale: tabScales[name] }] }]}>
                  {TAB_EMOJIS[name]}
                </Animated.Text>
              </View>
              <Text style={[styles.tabLabel, { color: focused ? Colors.violet : C.textTertiary }, focused && styles.tabLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ArticleScreen: overlay che scorre da destra, copre tab e tab bar */}
      {appScreen === 'Article' && (
        <Animated.View style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateX: articleSlideAnim }] },
        ]}>
          <ArticleScreen
            newsId={articleId}
            article={currentArticle}
            onBack={handleBack}
            userId={currentUser?.uid ?? ''}
            userStats={userStats}
            isPremium={isPremium}
            oneTimeFreeAccess={freeUnlockActive && (currentArticle?.isPremium ?? false)}
            onUseFreeAccess={async () => {
              setFreeUnlockActive(false);
              await AsyncStorage.removeItem('oddFeedFreeUnlock');
            }}
            onPointsChange={handlePointsChange}
            onUpgradePremium={() => { handleBack(); switchTab('Premium'); }}
            savedIds={savedIds}
            onToggleSave={handleToggleSave}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { flex: 1 },
  loading: {
    flex: 1,
    backgroundColor: Colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLogoWrap: {
    alignItems: 'center',
    gap: 8,
  },
  loadingLogoMain: {
    fontSize: 40,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1.5,
  },
  loadingTagline: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.bg2,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
    paddingBottom: 28,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingTop: 2 },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 1,
  },
  tabEmoji: { fontSize: 20 },
  tabLabel: { fontSize: 11, color: Colors.textTertiary, letterSpacing: 0.1 },
  tabLabelActive: { color: Colors.violet, fontWeight: '700' },
});

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}

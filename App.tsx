import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LanguageProvider, useTranslation } from './src/context/LanguageContext';
import { onAuthChange, logoutUser, getUserProfile } from './src/services/authService';
import { registerForPushNotifications } from './src/services/notificationService';
import { User } from 'firebase/auth';
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
type AppScreen = 'Loading' | 'Login' | 'Register' | 'ForgotPassword' | 'RegisterSuccess' | 'Onboarding' | 'Tabs' | 'Article' | 'AccountDeleted';

const TAB_EMOJIS: Record<Tab, string> = {
  Notizie: '📰', Archivio: '🗂️', Punti: '⭐', Premium: '👑', Profilo: '👤',
};

function RegisterSuccessScreen({ onGoToLogin, userName }: { onGoToLogin: () => void; userName: string }) {
  const { t } = useTranslation();
  return (
    <View style={successStyles.safe}>
      <View style={successStyles.container}>
        <Text style={successStyles.emoji}>🎉</Text>
        <Text style={successStyles.title}>Registrazione completata!</Text>
        <Text style={successStyles.subtitle}>
          Benvenuto su OddFeed, <Text style={successStyles.bold}>{userName}</Text>.{'\n'}
          Accedi ora per iniziare a leggere le notizie più strane del mondo.
        </Text>
        <TouchableOpacity style={successStyles.btn} onPress={onGoToLogin}>
          <Text style={successStyles.btnText}>Accedi</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

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
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isPremium, setIsPremium] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);

  // Ascolta lo stato di autenticazione Firebase
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      setCurrentUser(user);
      if (user) {
        setUserName(user.displayName ?? user.email?.split('@')[0] ?? '');
        try {
          const profile = await getUserProfile(user.uid);
          if (profile?.onboardingDone) {
            setIsPremium(profile.isPremium ?? false);
            setAppScreen('Tabs');
          } else {
            setAppScreen('Onboarding');
          }
          // Registra notifiche push in background
          registerForPushNotifications(user.uid).catch(() => {});
        } catch (e) {
          // Firestore non raggiungibile — vai all'onboarding comunque
          setAppScreen('Onboarding');
        }
      } else {
        setAppScreen('Login');
      }
    });
    return unsubscribe;
  }, []);

  const openArticle = (id: string) => {
    setReadIds((prev) => new Set(prev).add(id));
    setArticleId(id);
    setAppScreen('Article');
  };

  const handleLogin = (name: string, isNew: boolean) => {
    setUserName(name);
    if (isNew) {
      setAppScreen('RegisterSuccess');
    } else {
      // Login esistente → vai direttamente all'app
      setAppScreen('Tabs');
    }
  };

  const handleOnboardingComplete = (interests: string[], slot: string) => {
    setAppScreen('Tabs');
  };

  const handleLogout = async () => {
    await logoutUser();
    setIsPremium(false);
    setReadIds(new Set());
    setActiveTab('Notizie');
    // onAuthChange porterà automaticamente a Login
  };

  // Schermata di caricamento
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
      onSuccess={(name) => { setUserName(name); setAppScreen('RegisterSuccess'); }}
    />;
  }
  if (appScreen === 'RegisterSuccess') {
    return <RegisterSuccessScreen onGoToLogin={() => setAppScreen('Login')} userName={userName} />;
  }
  if (appScreen === 'ForgotPassword') {
    return <ForgotPasswordScreen onBack={() => setAppScreen('Login')} />;
  }
  if (appScreen === 'Onboarding') {
    return <OnboardingScreen userName={userName} onComplete={handleOnboardingComplete} />;
  }
  if (appScreen === 'Article') {
    return <ArticleScreen newsId={articleId} onBack={() => setAppScreen('Tabs')} />;
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
          />
        )}
        {activeTab === 'Archivio' && <ArchiveScreen onOpenArticle={openArticle} isPremium={isPremium} />}
        {activeTab === 'Punti' && <PointsScreen />}
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

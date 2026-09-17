import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';

import { LanguageProvider, useTranslation } from './src/context/LanguageContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { getColors } from './src/theme/colors';
import { Colors } from './src/theme/colors';
import { NewsItem } from './src/types';
import { Category } from './src/types';

import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import ArticleScreen from './src/screens/ArticleScreen';
import ArchiveScreen from './src/screens/ArchiveScreen';
import SavedScreen from './src/screens/SavedScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import WhatsNewModal from './src/components/WhatsNewModal';

const SCREEN_WIDTH = Dimensions.get('window').width;

type Tab = 'Notizie' | 'Archivio' | 'Salvati' | 'Impostazioni';
type AppScreen = 'Loading' | 'Onboarding' | 'Tabs' | 'Article';

const TAB_ICONS: Record<Tab, { inactive: string; active: string }> = {
  Notizie:      { inactive: 'home-outline',     active: 'home'     },
  Archivio:     { inactive: 'archive-outline',  active: 'archive'  },
  Salvati:      { inactive: 'bookmark-outline', active: 'bookmark' },
  Impostazioni: { inactive: 'settings-outline', active: 'settings' },
};

// Chiavi AsyncStorage
export const STORAGE_KEYS = {
  ONBOARDING_DONE: 'oddFeedOnboardingDone',
  INTERESTS:       'oddFeedInterests',
  SAVED_ARTICLES:  'oddFeedSavedArticles',
};

function AppContent() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const C = getColors(isDark);

  const [appScreen, setAppScreen] = useState<AppScreen>('Loading');
  const [activeTab, setActiveTab]   = useState<Tab>('Notizie');
  const [articleId, setArticleId]   = useState<string>('1');
  const [currentArticle, setCurrentArticle] = useState<NewsItem | null>(null);
  const [readIds, setReadIds]       = useState<Set<string>>(new Set());
  const [userInterests, setUserInterests] = useState<string[]>([]);

  // Articoli salvati
  const [savedIds, setSavedIds]         = useState<Set<string>>(new Set());
  const [savedArticles, setSavedArticles] = useState<NewsItem[]>([]);

  // WhatsNew modal
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  // ─── Carica articoli salvati ─────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.SAVED_ARTICLES).then(data => {
      if (data) {
        const articles: NewsItem[] = JSON.parse(data);
        setSavedArticles(articles);
        setSavedIds(new Set(articles.map(a => a.id)));
      }
    }).catch(() => {});
  }, []);

  const handleToggleSave = useCallback(async (id: string, article: NewsItem) => {
    setSavedIds(prev => {
      const next = new Set(prev);
      let nextArticles: NewsItem[];
      if (next.has(id)) {
        next.delete(id);
        nextArticles = savedArticles.filter(a => a.id !== id);
      } else {
        next.add(id);
        nextArticles = [article, ...savedArticles.filter(a => a.id !== id)];
      }
      setSavedArticles(nextArticles);
      AsyncStorage.setItem(STORAGE_KEYS.SAVED_ARTICLES, JSON.stringify(nextArticles)).catch(() => {});
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedArticles]);

  // ─── Inizializzazione: controlla se onboarding è già fatto ──────────────
  useEffect(() => {
    const init = async () => {
      try {
        // Precarica immagini in background — non blocca la transizione
        Asset.loadAsync([
          require('./assets/hero_background.png'),
          require('./assets/newspaper_illustration.png'),
        ]).catch(() => {});

        const [done, interestsRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE),
          AsyncStorage.getItem(STORAGE_KEYS.INTERESTS),
        ]);
        if (interestsRaw) {
          setUserInterests(JSON.parse(interestsRaw));
        }
        setAppScreen(done === 'true' ? 'Tabs' : 'Onboarding');
      } catch {
        setAppScreen('Onboarding');
      }
    };
    init();
  }, []);

  // ─── Review prompt (dopo la 3ª apertura) ────────────────────────────────
  const checkAndPromptReview = useCallback(async () => {
    try {
      const REVIEW_KEY = '@oddFeed_reviewRequested';
      const COUNT_KEY  = '@oddFeed_appOpenCount';
      const [alreadyAsked, countRaw] = await Promise.all([
        AsyncStorage.getItem(REVIEW_KEY),
        AsyncStorage.getItem(COUNT_KEY),
      ]);
      if (alreadyAsked) return;
      const count = parseInt(countRaw ?? '0', 10) + 1;
      await AsyncStorage.setItem(COUNT_KEY, String(count));
      if (count >= 3) {
        await AsyncStorage.setItem(REVIEW_KEY, '1');
        setTimeout(() => {
          Alert.alert(
            '⭐ Ti piace OddFeed?',
            'Lasciaci una recensione — ci aiuta moltissimo a crescere!',
            [
              { text: 'Adesso no', style: 'cancel' },
              {
                text: 'Valuta ora',
                onPress: () => {
                  Linking.openURL('https://apps.apple.com/app/id6504889599?action=write-review').catch(() => {});
                },
              },
            ],
          );
        }, 2000);
      }
    } catch {
      // silently fail
    }
  }, []);

  // ─── Animazioni ─────────────────────────────────────────────────────────
  const tabFadeAnim    = useRef(new Animated.Value(1)).current;
  const articleSlideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const tabScales = useRef<Record<Tab, Animated.Value>>({
    Notizie:      new Animated.Value(1),
    Archivio:     new Animated.Value(1),
    Salvati:      new Animated.Value(1),
    Impostazioni: new Animated.Value(1),
  }).current;

  const switchTab = useCallback((tab: Tab) => {
    if (tab === activeTab) return;
    Animated.sequence([
      Animated.timing(tabScales[tab], { toValue: 1.25, duration: 80, useNativeDriver: true }),
      Animated.timing(tabScales[tab], { toValue: 1,    duration: 100, useNativeDriver: true }),
    ]).start();
    Animated.timing(tabFadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
      setActiveTab(tab);
      Animated.timing(tabFadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
  }, [activeTab, tabFadeAnim, tabScales]);

  // ─── Apri articolo ───────────────────────────────────────────────────────
  const openArticleRef = useRef<(id: string, article?: NewsItem) => void>(() => {});

  const openArticle = (id: string, article?: NewsItem) => {
    setReadIds(prev => new Set(prev).add(id));
    setArticleId(id);
    setCurrentArticle(article ?? null);
    articleSlideAnim.setValue(SCREEN_WIDTH);
    setAppScreen('Article');
    requestAnimationFrame(() => {
      Animated.timing(articleSlideAnim, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.poly(4)),
        useNativeDriver: true,
      }).start();
    });
  };
  openArticleRef.current = openArticle;

  // ─── Deep link: oddfeed://articolo/[id] ─────────────────────────────────
  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      const match = url.match(/oddfeed:\/\/articolo\/([^/?#]+)/);
      if (match?.[1]) openArticleRef.current(match[1]);
    };
    const sub = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then(url => { if (url) handleUrl({ url }); }).catch(() => {});
    return () => sub.remove();
  }, []);

  const handleBack = useCallback(() => {
    Animated.timing(articleSlideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 280,
      easing: Easing.in(Easing.poly(4)),
      useNativeDriver: true,
    }).start(() => setAppScreen('Tabs'));
  }, [articleSlideAnim]);

  // ─── Onboarding completato ───────────────────────────────────────────────
  const handleOnboardingComplete = async (interests: Category[]) => {
    setUserInterests(interests as string[]);
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, 'true');
    await AsyncStorage.setItem(STORAGE_KEYS.INTERESTS, JSON.stringify(interests));
    setAppScreen('Tabs');
    checkAndPromptReview();
  };

  // ─── Aggiorna interessi da Impostazioni ─────────────────────────────────
  const handleInterestsChange = useCallback((interests: string[]) => {
    setUserInterests(interests);
    AsyncStorage.setItem(STORAGE_KEYS.INTERESTS, JSON.stringify(interests)).catch(() => {});
  }, []);

  // ─── Schermate ───────────────────────────────────────────────────────────
  if (appScreen === 'Loading') {
    return (
      <View style={styles.loading}>
        <View style={styles.loadingLogoWrap}>
          <Text style={styles.loadingLogoMain}>
            <Text style={{ color: '#080A35' }}>Odd</Text>
            <Text style={{ color: '#5540FF' }}>Feed</Text>
          </Text>
          <Text style={styles.loadingTagline}>Notizie curiose. Ogni giorno.</Text>
        </View>
        <ActivityIndicator color="#C4BFFA" style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (appScreen === 'Onboarding') {
    // Wrap in lavender container so no white flash at the React render boundary
    // while hero_background.png decodes on iOS
    return (
      <View style={{ flex: 1, backgroundColor: '#EEF2FF' }}>
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </View>
    );
  }

  const tabParallax = articleSlideAnim.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: [-SCREEN_WIDTH * 0.08, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <Animated.View style={[styles.content, { opacity: tabFadeAnim, transform: [{ translateX: tabParallax }] }]}>

        <View style={{ flex: 1, display: activeTab === 'Notizie' ? 'flex' : 'none' }}>
          <HomeScreen
            onOpenArticle={openArticle}
            onGoToArchive={() => switchTab('Archivio')}
            readIds={readIds}
            interests={userInterests}
          />
        </View>

        <View style={{ flex: 1, display: activeTab === 'Archivio' ? 'flex' : 'none' }}>
          <ArchiveScreen
            onOpenArticle={openArticle}
            interests={userInterests}
            savedIds={savedIds}
            onToggleSave={handleToggleSave}
          />
        </View>

        <View style={{ flex: 1, display: activeTab === 'Salvati' ? 'flex' : 'none' }}>
          <SavedScreen
            onOpenArticle={openArticle}
            savedIds={savedIds}
            savedArticles={savedArticles}
            onToggleSave={handleToggleSave}
          />
        </View>

        <View style={{ flex: 1, display: activeTab === 'Impostazioni' ? 'flex' : 'none' }}>
          <SettingsScreen
            interests={userInterests}
            onInterestsChange={handleInterestsChange}
            onShowWhatsNew={() => setShowWhatsNew(true)}
          />
        </View>

      </Animated.View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: C.bg, borderTopColor: C.border }]}>
        {(Object.keys(TAB_ICONS) as Tab[]).map((name) => {
          const focused = activeTab === name;
          const TAB_LABELS: Record<Tab, string> = {
            Notizie:      t.tabs.news,
            Archivio:     t.tabs.archive,
            Salvati:      t.tabs.saved ?? 'Salvati',
            Impostazioni: t.tabs.settings ?? 'Impostazioni',
          };
          const label    = TAB_LABELS[name];
          const iconName = focused ? TAB_ICONS[name].active : TAB_ICONS[name].inactive;
          return (
            <TouchableOpacity
              key={name}
              style={styles.tabItem}
              onPress={() => switchTab(name)}
              activeOpacity={0.7}
            >
              <Animated.View style={{ transform: [{ scale: tabScales[name] }] }}>
                <Ionicons name={iconName} size={22} color={focused ? Colors.violet : C.textTertiary} />
              </Animated.View>
              <Text style={[styles.tabLabel, { color: focused ? Colors.violet : C.textTertiary }, focused && styles.tabLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ArticleScreen: overlay da destra */}
      {appScreen === 'Article' && (
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: articleSlideAnim }] }]}>
          <ArticleScreen
            newsId={articleId}
            article={currentArticle}
            onBack={handleBack}
            savedIds={savedIds}
            onToggleSave={handleToggleSave}
          />
        </Animated.View>
      )}

      <WhatsNewModal forceVisible={showWhatsNew} onClose={() => setShowWhatsNew(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg },
  content: { flex: 1 },
  loading: { flex: 1, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  loadingLogoWrap: { alignItems: 'center', gap: 8 },
  loadingLogoMain: { fontSize: 40, fontWeight: '800', color: '#fff', letterSpacing: -1.5 },
  loadingTagline:  { fontSize: 14, fontWeight: '500', color: '#8882AA', letterSpacing: 0.1, marginTop: 6 },
  tabBar:  {
    flexDirection: 'row',
    backgroundColor: Colors.bg2,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
    paddingBottom: 28,
  },
  tabItem:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 4 },
  tabLabel:     { fontSize: 10, color: Colors.textTertiary, letterSpacing: 0.1, fontWeight: '500' },
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

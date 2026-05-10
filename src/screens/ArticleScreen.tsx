import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Share,
  Platform,
  PanResponder,
  Animated,
  Easing,
  Dimensions,
  Image,
} from 'react-native';
import * as Haptics from 'expo-haptics';

const SCREEN_W = Dimensions.get('window').width;

const cleanTitle = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/[\uD800-\uDFFF]/g, '')
    .replace(/[☀-➿]/g, '')
    .replace(/[⬀-⯿]/g, '')
    .replace(/️/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};
// @ts-ignore — @expo/vector-icons types not declared in this project
import { Ionicons } from '@expo/vector-icons';
import { Colors, getColors, FontSize, Spacing, Radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { MOCK_NEWS } from '../data/mockData';
import { useTranslation } from '../context/LanguageContext';
import { UserStats } from '../../App';
import { NewsItem } from '../types';

interface ArticleScreenProps {
  newsId: string;
  article?: NewsItem | null;
  onBack: () => void;
  userId: string;
  userStats: UserStats;
  isPremium: boolean;
  /** Sblocco gratuito one-time per regalo onboarding */
  oneTimeFreeAccess?: boolean;
  onUseFreeAccess?: () => void;
  onPointsChange: (action: 'read' | 'react' | 'share', articleId?: string) => void;
  onUpgradePremium?: () => void;
  savedIds?: Set<string>;
  onToggleSave?: (id: string, article: NewsItem) => void;
}


export default function ArticleScreen({ newsId, article: articleProp, onBack, userId, onPointsChange, isPremium, oneTimeFreeAccess, onUseFreeAccess, onUpgradePremium, savedIds, onToggleSave }: ArticleScreenProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const C = getColors(isDark);
  const article = articleProp ?? MOCK_NEWS.find((n) => n.id === newsId) ?? MOCK_NEWS[0];
  const isSaved = savedIds?.has(article.id) ?? false;

  // Animazione scale sul bottone salva
  const saveScale = useRef(new Animated.Value(1)).current;
  const animateSave = () => {
    Animated.sequence([
      Animated.timing(saveScale, { toValue: 1.4, duration: 100, useNativeDriver: true }),
      Animated.spring(saveScale, { toValue: 1, useNativeDriver: true, bounciness: 8 }),
    ]).start();
  };
  // URL di condivisione: web URL + fallback scheme per deep link
  // Il web URL richiede Associated Domains (da configurare in produzione);
  // il deep link funziona subito da qualsiasi app installata.
  const articleUrl = `https://oddfeed.app/articolo/${article.id}`;
  const articleDeepLink = `oddfeed://articolo/${article.id}`;

  // Paywall: articolo premium e utente non abbonato
  // Bypass: oneTimeFreeAccess = regalo onboarding (una volta sola)
  const showPaywall = (article.isPremium ?? false) && !isPremium && !oneTimeFreeAccess;

  // Contatore social proof: viewSeed + incremento basato sull'ora del giorno
  const viewCount = useMemo(() => {
    if (!article.viewSeed) return null;
    const hour = new Date().getHours();
    // Cresce dal mattino (ore 7) alla sera (ore 22): ~10-30 letture per ora
    const hoursActive = Math.max(0, Math.min(hour - 7, 15));
    const increment = Math.floor(article.viewSeed * 0.03 * hoursActive);
    return article.viewSeed + increment;
  }, [article.viewSeed]);

  // Animazione per il tracciamento del dito durante lo swipe
  const swipePan = useRef(new Animated.Value(0)).current;

  // Swipe da sinistra per tornare indietro — il contenuto segue il dito in tempo reale
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const startX = evt.nativeEvent.pageX - gestureState.dx;
        return (
          startX < 40 &&
          gestureState.dx > 15 &&
          Math.abs(gestureState.dy) < Math.abs(gestureState.dx)
        );
      },
      onPanResponderMove: (_, gestureState) => {
        // Muovi il contenuto insieme al dito (solo verso destra)
        if (gestureState.dx > 0) swipePan.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 80 || gestureState.vx > 0.5) {
          // Swipe sufficiente: completa l'uscita poi chiama onBack
          Animated.timing(swipePan, {
            toValue: SCREEN_W,
            duration: 200,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }).start(() => {
            swipePan.setValue(0); // reset per la prossima apertura
            onBack();
          });
        } else {
          // Swipe troppo corto: torna alla posizione originale
          Animated.spring(swipePan, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (userId) onPointsChange('read', article.id);
    // Consuma il free unlock one-time se attivo
    if (oneTimeFreeAccess && onUseFreeAccess) onUseFreeAccess();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id, userId]);

  const handleShare = async () => {
    try {
      // Su iOS, `url` viene aggiunto automaticamente dopo `message`,
      // quindi non va incluso nel testo per evitare il doppio link.
      // Usiamo il web URL come URL primario; il deep link è nel testo per Android
      // così chi ha OddFeed installato può aprirlo direttamente.
      await Share.share(
        Platform.OS === 'ios'
          ? { message: article.title, url: articleUrl }
          : { message: `${article.title}\n\n${articleUrl}\n\n(Apri in OddFeed: ${articleDeepLink})` }
      );
      if (userId) onPointsChange('share');
    } catch (e) {}
  };

  const paragraphs = article.fullText?.split('\n\n') ?? [];
  // Free: mostra solo le prime 2 righe del primo paragrafo (teaser)
  const teaserText = (paragraphs[0]?.split('. ').slice(0, 2).join('. ') ?? '') + '…';

  return (
    <Animated.View style={[styles.swipeContainer, { transform: [{ translateX: swipePan }] }]}>
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]} {...panResponder.panHandlers}>
      {/* Violet header with back button */}
      <View style={[styles.articleHeader, { backgroundColor: C.hero }]}>
        <TouchableOpacity style={styles.articleBackBtn} onPress={onBack}>
          <Text style={styles.articleBackArrow}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.articleHeaderKicker} numberOfLines={1}>
            {article.categoryLabel ?? article.category} · {article.readTime ?? '3 min di lettura'}
          </Text>
          <Text style={styles.articleHeaderSrc} numberOfLines={1}>
            {article.source}
          </Text>
        </View>
        <TouchableOpacity onPress={handleShare} style={{ flexShrink: 0, paddingLeft: 8 }}>
          <Ionicons name="share-outline" size={20} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero image con category pill */}
        <View style={styles.heroImgWrap}>
          <Image
            source={{ uri: article.imageUrl || `https://picsum.photos/seed/${article.id}/800/380` }}
            style={styles.heroImg}
          />
          <View style={styles.heroImgPill}>
            <Text style={styles.heroImgPillText}>{article.categoryLabel ?? article.category}</Text>
          </View>
        </View>

        <View style={[styles.body, { backgroundColor: C.bg }]}>
          {/* Tags */}
          <Text style={[styles.tags, { color: C.textTertiary }]}>{article.country} · {article.categoryLabel}</Text>

          {/* Titolo */}
          <Text style={[styles.title, { color: C.text }]}>{cleanTitle(article.title)}</Text>

          {/* Fonte */}
          <View style={styles.sourceRow}>
            <View style={styles.sourceLeft}>
              <View style={styles.sourceDot} />
              <Text style={[styles.sourceName, { color: C.textSecondary }]}>{article.source}</Text>
              <Text style={[styles.timeDot, { color: C.textTertiary }]}>·</Text>
              <Text style={[styles.time, { color: C.textTertiary }]}>{article.publishedAt}</Text>
            </View>
            <View style={[styles.verifiedBadge, { backgroundColor: C.greenBg, borderColor: C.greenBorder }]}>
              <Text style={styles.verifiedText}>✓ Verificata</Text>
            </View>
          </View>

          {/* Testo — completo se premium/free con accesso, teaser + paywall altrimenti */}
          {!showPaywall ? (
            paragraphs.map((para, i) => (
              <Text key={i} style={[styles.articleText, { color: C.text }]}>{para}</Text>
            ))
          ) : (
            <>
              {/* Teaser: prime 2 frasi visibili */}
              <Text style={styles.articleText}>{teaserText}</Text>

              {/* Paywall block */}
              <View style={styles.paywallBlock}>
                {viewCount !== null && (
                  <View style={styles.paywallCounter}>
                    <Text style={styles.paywallCounterText}>
                      👁 Oggi <Text style={styles.paywallCounterNum}>{viewCount} persone</Text> hanno letto questa storia
                    </Text>
                  </View>
                )}
                <Text style={styles.paywallIcon}>🔒</Text>
                <Text style={styles.paywallTitle}>
                  {article.isForbidden
                    ? 'Non dovresti leggerla.'
                    : article.isTopOdd
                    ? 'È bloccata. Ed è probabilmente quella giusta.'
                    : 'Questa non è per tutti.'}
                </Text>
                <Text style={styles.paywallSub}>7 giorni gratis. Nessuna sorpresa.</Text>
                <TouchableOpacity
                  style={styles.paywallBtn}
                  onPress={onUpgradePremium}
                  activeOpacity={0.8}
                >
                  <Text style={styles.paywallBtnText}>✦ Accesso completo</Text>
                </TouchableOpacity>
                <Text style={styles.paywallPriceHint}>Meno di un caffè al mese. Le storie più assurde del mondo, ogni giorno.</Text>
              </View>
            </>
          )}

          <View style={{ height: 12 }} />
        </View>
      </ScrollView>

      {/* Condividi — fisso in fondo (solo se non c'è paywall) */}
      {!showPaywall && (
        <View style={[styles.shareBar, { borderTopColor: C.border, backgroundColor: C.bg }]}>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.75}>
            <Ionicons name="share-outline" size={20} color="#fff" />
            <Text style={styles.shareBtnText}>{t.article.share}</Text>
          </TouchableOpacity>
          <Text style={styles.shareHint}>Condividi e incuriosisci i tuoi amici 👀</Text>
          <View style={styles.shareActions}>
            <TouchableOpacity style={styles.shareActionBtn} onPress={onBack}>
              <Text style={[styles.shareActionText, { color: C.textSecondary }]}>← {t.common.back}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shareActionBtn}
              onPress={() => {
                animateSave();
                Haptics.impactAsync(
                  isSaved ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
                );
                onToggleSave?.(article.id, article);
              }}
              activeOpacity={0.7}
            >
              <Animated.Text
                style={[
                  styles.shareActionText,
                  { color: isSaved ? Colors.violet : C.textSecondary },
                  { transform: [{ scale: saveScale }] },
                ]}
              >
                {isSaved ? '🔖 Salvato' : '🔖 Salva'}
              </Animated.Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: { flex: 1, backgroundColor: Colors.bg },
  safe: { flex: 1, backgroundColor: Colors.bg },
  heroImgWrap: { height: 190, position: 'relative' },
  heroImg: { width: '100%', height: 190 },
  heroImgPill: {
    position: 'absolute',
    bottom: 10,
    left: 14,
    backgroundColor: '#4F46E5',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  heroImgPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  // Violet article header
  articleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
  },
  articleBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  articleBackArrow: { fontSize: 18, color: '#fff' },
  articleHeaderKicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  articleHeaderSrc: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  body: { paddingTop: 14, paddingHorizontal: 16, paddingBottom: 10 },
  tags: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    lineHeight: 23,
    letterSpacing: -0.3,
    marginBottom: 7,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  sourceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  sourceDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.green },
  sourceName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  timeDot: { fontSize: FontSize.xs, color: Colors.textTertiary },
  time: { fontSize: FontSize.sm, color: Colors.textTertiary },
  verifiedBadge: {
    backgroundColor: Colors.greenBg,
    borderWidth: 1,
    borderColor: Colors.greenBorder,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  verifiedText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.green },
  articleText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },

  // Share
  shareBar: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 36,
    gap: 10,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.violet,
  },
  shareBtnText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
  shareHint: {
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  shareActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  shareActionBtn: {
    paddingVertical: Spacing.sm,
  },
  shareActionText: {
    fontSize: FontSize.base,
    fontWeight: '500',
    color: Colors.textSecondary,
  },

  // Paywall
  paywallBlock: {
    marginTop: Spacing.lg,
    backgroundColor: '#f5f3ff',
    borderWidth: 1.5,
    borderColor: '#ddd6fe',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 8,
  },
  paywallCounter: {
    backgroundColor: '#1e1b4b',
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 4,
  },
  paywallCounterText: {
    fontSize: FontSize.xs,
    color: '#a5b4fc',
    fontWeight: '600',
    textAlign: 'center',
  },
  paywallCounterNum: {
    color: '#fff',
    fontWeight: '800',
  },
  paywallIcon: {
    fontSize: 28,
  },
  paywallTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: '#1e1b4b',
    textAlign: 'center',
    lineHeight: 24,
  },
  paywallSub: {
    fontSize: FontSize.sm,
    color: '#6b7280',
    textAlign: 'center',
  },
  paywallBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
  paywallBtnText: {
    fontSize: FontSize.base,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  paywallPriceHint: {
    fontSize: FontSize.xs,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 2,
  },
});

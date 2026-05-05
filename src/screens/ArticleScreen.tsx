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
} from 'react-native';

const SCREEN_W = Dimensions.get('window').width;
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, Radius } from '../theme/colors';
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
  onPointsChange: (action: 'read' | 'react' | 'share', articleId?: string) => void;
  onUpgradePremium?: () => void;
}


export default function ArticleScreen({ newsId, article: articleProp, onBack, userId, onPointsChange, isPremium, onUpgradePremium }: ArticleScreenProps) {
  const { t } = useTranslation();
  const article = articleProp ?? MOCK_NEWS.find((n) => n.id === newsId) ?? MOCK_NEWS[0];
  const articleUrl = `https://oddfeed.app/articolo/${article.id}`;

  // Paywall: articolo premium e utente non abbonato
  const showPaywall = (article.isPremium ?? false) && !isPremium;

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id, userId]);

  const handleShare = async () => {
    try {
      // Su iOS, `url` viene aggiunto automaticamente dopo `message`,
      // quindi non va incluso nel testo per evitare il doppio link.
      await Share.share(
        Platform.OS === 'ios'
          ? { message: article.title, url: articleUrl }
          : { message: `${article.title}\n\n${articleUrl}` }
      );
      if (userId) onPointsChange('share');
    } catch (e) {}
  };

  const paragraphs = article.fullText?.split('\n\n') ?? [];
  // Free: mostra solo le prime 2 righe del primo paragrafo (teaser)
  const teaserText = paragraphs[0]?.split('. ').slice(0, 2).join('. ') + '…' ?? '';

  return (
    <Animated.View style={[styles.swipeContainer, { transform: [{ translateX: swipePan }] }]}>
    <SafeAreaView style={styles.safe} {...panResponder.panHandlers}>
      {/* Back — in alto */}
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backArrow}>←</Text>
        <Text style={styles.backText}>{t.common.back}</Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          {/* Tags */}
          <Text style={styles.tags}>{article.country} · {article.categoryLabel}</Text>

          {/* Titolo */}
          <Text style={styles.title}>{article.title}</Text>

          {/* Fonte */}
          <View style={styles.sourceRow}>
            <View style={styles.sourceLeft}>
              <View style={styles.sourceDot} />
              <Text style={styles.sourceName}>{article.source}</Text>
              <Text style={styles.timeDot}>·</Text>
              <Text style={styles.time}>{article.publishedAt}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Verificata</Text>
            </View>
          </View>

          {/* Testo — completo se premium/free con accesso, teaser + paywall altrimenti */}
          {!showPaywall ? (
            paragraphs.map((para, i) => (
              <Text key={i} style={styles.articleText}>{para}</Text>
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

          {/* Back — in fondo (solo se non c'è paywall) */}
          {!showPaywall && (
            <TouchableOpacity style={styles.backBtnBottom} onPress={onBack}>
              <Text style={styles.backArrow}>←</Text>
              <Text style={styles.backBtnBottomText}>{t.common.back}</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 12 }} />
        </View>
      </ScrollView>

      {/* Condividi — fisso in fondo (solo se non c'è paywall) */}
      {!showPaywall && (
        <View style={styles.shareBar}>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.75}>
            <Ionicons name="share-outline" size={20} color="#fff" />
            <Text style={styles.shareBtnText}>{t.article.share}</Text>
          </TouchableOpacity>
          <Text style={styles.shareHint}>Condividi e incuriosisci i tuoi amici 👀</Text>
        </View>
      )}
    </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: { flex: 1, backgroundColor: Colors.bg },
  safe: { flex: 1, backgroundColor: Colors.bg },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backArrow: { fontSize: 18, color: Colors.textSecondary },
  backText: { fontSize: FontSize.base, fontWeight: '500', color: Colors.textSecondary },
  body: { padding: Spacing.lg },
  tags: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 32,
    marginBottom: Spacing.md,
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
    fontSize: FontSize.lg,
    color: Colors.text,
    lineHeight: 28,
    marginBottom: Spacing.md,
  },

  // Back button in fondo
  backBtnBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
  },
  backBtnBottomText: {
    fontSize: FontSize.base,
    fontWeight: '500',
    color: Colors.textSecondary,
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
    paddingVertical: 15,
    borderRadius: Radius.md,
    backgroundColor: Colors.violet,
    shadowColor: Colors.violet,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  shareBtnText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
  shareHint: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'center',
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

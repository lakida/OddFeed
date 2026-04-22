import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../theme/colors';
import { useTranslation } from '../context/LanguageContext';
import { purchasePackage, restorePurchases, openManageSubscriptions, PRODUCT_IDS } from '../services/purchaseService';
import { Alert } from 'react-native';

const FEATURES_FREE = [
  '1 notizia al giorno',
  'Archivio ultimi 7 giorni',
  'Reazioni alle notizie',
  'Punti e livelli',
];

const FEATURES_PREMIUM = [
  'Fino a 10 notizie al giorno',
  'Archivio illimitato',
  'Filtra le notizie per categoria, paese o fonte',
  'Notizie disponibili 2 ore prima degli utenti gratuiti',
  'Nessuna pubblicità futura',
  'Badge Premium nel profilo',
];

interface PremiumScreenProps {
  isPremium: boolean;
  onUpgrade: () => void;
  onDowngrade: () => void;
}

export default function PremiumScreen({ isPremium, onUpgrade, onDowngrade }: PremiumScreenProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<'monthly' | 'yearly'>('yearly');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.premium.title}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          {isPremium && <Text style={styles.heroEmoji}>👑</Text>}
          <Text style={styles.heroTitle}>
            {isPremium ? t.premium.heroTitleActive : t.premium.heroTitle}
          </Text>
          <Text style={styles.heroSub}>
            {isPremium ? t.premium.heroSubActive : t.premium.heroSub}
          </Text>
          {isPremium && (
            <TouchableOpacity style={styles.activeTag}>
              <Text style={styles.activeTagText}>{t.premium.activeTag}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Piani */}
        <View style={styles.plansRow}>
          <TouchableOpacity
            style={[styles.planCard, selected === 'monthly' && styles.planCardActive]}
            onPress={() => setSelected('monthly')}
          >
            <Text style={[styles.planName, selected === 'monthly' && styles.planNameActive]}>
              {t.premium.monthly}
            </Text>
            <Text style={[styles.planPrice, selected === 'monthly' && styles.planPriceActive]}>
              1,99 €
            </Text>
            <Text style={[styles.planPeriod, selected === 'monthly' && styles.planPeriodActive]}>
              {t.premium.perMonth}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.planCard, selected === 'yearly' && styles.planCardActive]}
            onPress={() => setSelected('yearly')}
          >
            <View style={styles.bestValueBadge}>
              <Text style={styles.bestValueText}>{t.premium.bestOffer}</Text>
            </View>
            <Text style={[styles.planName, selected === 'yearly' && styles.planNameActive]}>
              {t.premium.yearly}
            </Text>
            <Text style={[styles.planPrice, selected === 'yearly' && styles.planPriceActive]}>
              14,99 €
            </Text>
            <Text style={[styles.planPeriod, selected === 'yearly' && styles.planPeriodActive]}>
              {t.premium.perYear}
            </Text>
          </TouchableOpacity>
        </View>

        {/* CTA */}
        {isPremium ? (
          <TouchableOpacity
            style={styles.ctaBtnCancel}
            onPress={async () => {
              await openManageSubscriptions();
              onDowngrade();
            }}
          >
            <Text style={styles.ctaBtnCancelText}>{t.premium.cancelSubscription}</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={async () => {
                const productId = selected === 'monthly'
                  ? PRODUCT_IDS.monthly
                  : PRODUCT_IDS.yearly;
                try {
                  const success = await purchasePackage(productId);
                  if (success) onUpgrade();
                } catch (e: any) {
                  Alert.alert('Errore acquisto', e?.message ?? 'Riprova più tardi.');
                }
              }}
            >
              <Text style={styles.ctaBtnText}>
                {selected === 'monthly' ? t.premium.ctaMonthly : t.premium.ctaYearly}
              </Text>
            </TouchableOpacity>
            <Text style={styles.ctaNote}>{t.premium.noCommitment}</Text>
          </>
        )}

        {/* Confronto */}
        <Text style={styles.sectionTitle}>{t.premium.whatsIncluded}</Text>

        <View style={styles.compareBlock}>
          <Text style={styles.compareHeader}>{t.premium.free}</Text>
          {t.premium.featuresFree.map((f, i) => (
            <View key={i} style={[styles.featureRow, i > 0 && styles.featureBorder]}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.compareBlock, styles.compareBlockPremium]}>
          <Text style={styles.compareHeaderPremium}>⭐ Premium</Text>
          {t.premium.featuresPremium.map((f, i) => (
            <View key={i} style={[styles.featureRow, i > 0 && styles.featureBorder]}>
              <Text style={styles.featureCheckPremium}>✓</Text>
              <Text style={styles.featureTextPremium}>{f}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.legalNote}>{t.premium.legalNote}</Text>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  heroEmoji: { fontSize: 40 },
  heroTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Piani
  plansRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  planCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.bg2,
    alignItems: 'center',
    gap: 4,
  },
  planCardActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  planName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  planNameActive: { color: '#6366F1' },
  planPrice: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  planPriceActive: { color: '#6366F1' },
  planPeriod: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  planPeriodActive: { color: '#6366F1' },
  bestValueBadge: {
    backgroundColor: Colors.text,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginBottom: 4,
  },
  bestValueText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: '#fff',
  },

  activeTag: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: Radius.full,
  },
  activeTagText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#6366F1',
  },
  // CTA
  ctaBtn: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: '#6366F1',
    alignItems: 'center',
  },
  ctaBtnText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#fff',
  },
  ctaNote: {
    textAlign: 'center',
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
  },

  // Confronto
  sectionTitle: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#6366F1',
  },
  compareBlock: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.bg2,
  },
  compareBlockPremium: {
    backgroundColor: '#FFFCF0',
    borderColor: '#F0D98A',
    borderWidth: 1,
  },
  compareHeader: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingVertical: Spacing.md,
  },
  compareHeaderPremium: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingVertical: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  featureBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  featureCheck: {
    fontSize: FontSize.base,
    color: Colors.textTertiary,
    fontWeight: '700',
    width: 20,
  },
  featureCheckPremium: {
    fontSize: FontSize.base,
    color: '#6366F1',
    fontWeight: '700',
    width: 20,
  },
  featureText: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    flex: 1,
  },
  featureTextPremium: {
    fontSize: FontSize.base,
    color: Colors.text,
    flex: 1,
  },

  // Note legali
  ctaBtnCancel: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg2,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  ctaBtnCancelText: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.red,
  },
  legalNote: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    lineHeight: 18,
    textAlign: 'center',
  },
});

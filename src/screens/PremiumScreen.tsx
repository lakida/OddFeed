import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Colors, getColors, FontSize, Spacing, Radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';
import { purchasePackage, restorePurchases, openManageSubscriptions, PRODUCT_IDS } from '../services/purchaseService';

// Teaser cards per la sezione FOMO — hardcoded, non vengono da Firestore
const FOMO_TOP_ODD = [
  { emoji: '🧠', title: 'Neurologo abbandona carriera per diventare spiaggia umana in Sardegna', country: '🇮🇹 Italia' },
  { emoji: '🐊', title: 'Coccodrillo di 4 metri arrestato dalla polizia thailandese per disturbo della quiete', country: '🇹🇭 Tailandia' },
  { emoji: '💸', title: 'Uomo trova 2 milioni in contanti in un divano comprato su Facebook Marketplace', country: '🇺🇸 USA' },
];
const FOMO_TOP_ODD_EN = [
  { emoji: '🧠', title: 'Neurologist quits career to become "human beach" in Sardinia', country: '🇮🇹 Italy' },
  { emoji: '🐊', title: '4-metre crocodile arrested by Thai police for disturbing the peace', country: '🇹🇭 Thailand' },
  { emoji: '💸', title: 'Man finds $2 million in cash inside a sofa bought on Facebook Marketplace', country: '🇺🇸 USA' },
];
const FOMO_FORBIDDEN_IT = { emoji: '🚫', title: 'Non dovresti leggerla. Ma tutti vogliono.' };
const FOMO_FORBIDDEN_EN = { emoji: '🚫', title: "You shouldn't read this. But everyone wants to." };

interface PremiumScreenProps {
  isPremium: boolean;
  onUpgrade: () => void;
  onDowngrade: () => void;
}

export default function PremiumScreen({ isPremium, onUpgrade, onDowngrade }: PremiumScreenProps) {
  const { t, language } = useTranslation();
  const { isDark } = useTheme();
  const C = getColors(isDark);
  const [selected, setSelected] = useState<'monthly' | 'yearly'>('yearly');

  const fomoCards = language === 'it' ? FOMO_TOP_ODD : FOMO_TOP_ODD_EN;
  const fomoForbidden = language === 'it' ? FOMO_FORBIDDEN_IT : FOMO_FORBIDDEN_EN;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <View style={[styles.heroArea, { backgroundColor: C.hero }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroKicker}>ABBONAMENTO</Text>
            <Text style={styles.heroTitle}>{t.premium.title}</Text>
            <Text style={[styles.heroSubtitle, { color: C.heroSubtext }]}>
              {isPremium ? 'Abbonamento attivo' : 'Scegli il piano per te'}
            </Text>
          </View>
          <Text style={styles.heroEmoji}>{'👑'}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Tabella comparativa */}
        <View style={[cmpStyles.wrap, { borderColor: C.border }]}>
          {/* Header riga */}
          <View style={[cmpStyles.headRow, { backgroundColor: C.bg2, borderBottomColor: C.border }]}>
            <Text style={[cmpStyles.headFeat, { color: C.textTertiary }]}>Funzione</Text>
            <Text style={[cmpStyles.headCol, { color: C.textSecondary }]}>FREE</Text>
            <Text style={[cmpStyles.headColGold]}>PREMIUM</Text>
          </View>
          {/* Righe */}
          {[
            { feat: 'Feed giornaliero',      free: '5 art.',    prem: 'Illimitati', premGold: true },
            { feat: 'Non dovresti leggerla', free: '—',         prem: '✓',          premGold: false },
            { feat: 'Archivio storico',      free: '7 giorni',  prem: 'Completo',   premGold: true },
            { feat: 'Pubblicità',            free: 'Sì',        prem: '✓',          premGold: false },
            { feat: 'Notifiche breaking',    free: '—',         prem: '✓',          premGold: false },
            { feat: 'Lettura offline',       free: '—',         prem: '✓',          premGold: false },
          ].map((row, i, arr) => (
            <View key={i} style={[cmpStyles.row, { borderBottomColor: C.border, borderBottomWidth: i < arr.length - 1 ? 0.5 : 0 }]}>
              <Text style={[cmpStyles.cellFeat, { color: C.text }]}>{row.feat}</Text>
              <Text style={[cmpStyles.cell, { color: C.textTertiary }]}>{row.free}</Text>
              <View style={cmpStyles.cellGoldBg}>
                {row.premGold
                  ? <Text style={cmpStyles.cellGoldText}>{row.prem}</Text>
                  : <View style={cmpStyles.checkCircle}><Text style={cmpStyles.checkMark}>✓</Text></View>
                }
              </View>
            </View>
          ))}
        </View>

        {/* ─── PIANI PRICING ─── */}
        {!isPremium && (
          <>
            <View style={styles.plansRow}>
              {/* Mensile */}
              <TouchableOpacity
                style={[styles.planCard, { backgroundColor: C.bg, borderColor: selected === 'monthly' ? Colors.violet : C.border }, selected === 'monthly' && { backgroundColor: '#EEF2FF' }]}
                onPress={() => setSelected('monthly')}
              >
                <View style={[styles.planDot, selected === 'monthly' && styles.planDotActive]}>
                  {selected === 'monthly' && <View style={styles.planDotInner} />}
                </View>
                <Text style={[styles.planName, { color: selected === 'monthly' ? Colors.violet : C.textSecondary }]}>MENSILE</Text>
                <Text style={[styles.planPrice, { color: C.text }]}>1,99 €<Text style={[styles.planPriceSuffix, { color: C.textSecondary }]}>/mese</Text></Text>
                <Text style={[styles.planSub, { color: C.textSecondary }]}>Rinnovo automatico</Text>
              </TouchableOpacity>

              {/* Annuale */}
              <TouchableOpacity
                style={[styles.planCard, { backgroundColor: C.bg, borderColor: selected === 'yearly' ? Colors.violet : C.border }, selected === 'yearly' && { backgroundColor: '#EEF2FF' }]}
                onPress={() => setSelected('yearly')}
              >
                <View style={styles.planBestBadge}><Text style={styles.planBestText}>Più conveniente</Text></View>
                <View style={[styles.planDot, selected === 'yearly' && styles.planDotActive]}>
                  {selected === 'yearly' && <View style={styles.planDotInner} />}
                </View>
                <Text style={[styles.planName, { color: selected === 'yearly' ? Colors.violet : C.textSecondary }]}>ANNUALE</Text>
                <Text style={[styles.planPrice, { color: C.text }]}>14,99 €<Text style={[styles.planPriceSuffix, { color: C.textSecondary }]}>/anno</Text></Text>
                <Text style={[styles.planSub, { color: C.textSecondary }]}>Solo €1,25/mese</Text>
                <Text style={styles.planSaving}>Risparmi il 37%</Text>
              </TouchableOpacity>
            </View>

            {/* CTA */}
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

        {/* Cancel per Premium */}
        {isPremium && (
          <TouchableOpacity
            style={styles.ctaBtnCancel}
            onPress={async () => {
              try {
                await openManageSubscriptions();
              } catch (e) {
                Alert.alert(
                  'Impossibile aprire',
                  'Impossibile caricare i piani. Riprova o gestisci l\'abbonamento direttamente da Impostazioni → App Store.',
                  [{ text: 'OK' }]
                );
              }
            }}
          >
            <Text style={styles.ctaBtnCancelText}>{t.premium.cancelSubscription}</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.legalNote}>{t.premium.legalNote}</Text>

        {/* Restore */}
        {!isPremium && (
          <TouchableOpacity
            style={styles.restoreBtn}
            onPress={async () => {
              try {
                const restored = await restorePurchases();
                if (restored) {
                  onUpgrade();
                  Alert.alert('✓', language === 'it' ? 'Abbonamento ripristinato!' : 'Subscription restored!');
                } else {
                  Alert.alert(
                    language === 'it' ? 'Nessun abbonamento trovato' : 'No subscription found',
                    language === 'it' ? 'Non abbiamo trovato abbonamenti attivi per questo account.' : 'We didn\'t find any active subscriptions for this account.',
                  );
                }
              } catch (e: any) {
                Alert.alert(language === 'it' ? 'Errore' : 'Error', e?.message ?? 'Riprova');
              }
            }}
          >
            <Text style={styles.restoreBtnText}>
              {language === 'it' ? 'Ripristina acquisti' : 'Restore purchases'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  heroArea: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroKicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    marginBottom: 4,
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
    marginTop: 3,
  },
  heroEmoji: {
    fontSize: 72,
    lineHeight: 80,
    marginTop: 4,
  },

  // Hero (sezione contenuto)
  hero: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  heroBigEmoji: { fontSize: 40 },
  heroContentTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  heroContentSub: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
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

  // ─── FOMO ───
  fomoSection: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  fomoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  fomoSectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 0.3,
  },
  fomoLockBadge: {
    backgroundColor: '#6366F1',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  fomoLockBadgeDark: {
    backgroundColor: '#1e1b4b',
  },
  fomoLockBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
  fomoSectionSub: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  fomoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
    overflow: 'hidden',
  },
  fomoForbiddenCard: {
    backgroundColor: '#f5f3ff',
    borderColor: '#ddd6fe',
  },
  fomoCardLeft: {
    width: 52,
    height: 52,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fomoForbiddenLeft: {
    backgroundColor: '#ede9fe',
  },
  fomoCardEmoji: { fontSize: 22 },
  fomoCardBody: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  fomoCardCountry: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  fomoCardTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 18,
  },
  fomoCardLock: {
    paddingRight: 12,
  },
  fomoCardLockIcon: { fontSize: 16 },
  fomoHint: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 16,
    fontStyle: 'italic',
  },

  // ─── PIANI ───
  plansRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  planCard: {
    flex: 1,
    padding: Spacing.md,
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
    lineHeight: 14,
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

  // ─── CTA ───
  ctaBtn: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    paddingVertical: 16,
    borderRadius: Radius.md,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  ctaBtnText: {
    fontSize: FontSize.base,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },
  ctaNote: {
    textAlign: 'center',
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: 8,
  },
  coffeeHint: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 4,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    lineHeight: 16,
  },

  // ─── GESTIONE / CANCEL ───
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

  // ─── SEZIONE CONFRONTO ───
  sectionTitle: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
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
    backgroundColor: '#f5f3ff',
    borderColor: '#ddd6fe',
    borderWidth: 1.5,
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
    color: '#4f46e5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingVertical: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  featureBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  featureBorderPremium: {
    borderTopWidth: 1,
    borderTopColor: '#ede9fe',
  },
  featureCheck: {
    fontSize: FontSize.base,
    color: Colors.textTertiary,
    fontWeight: '700',
    width: 20,
    marginTop: 1,
  },
  featureCheckPremium: {
    fontSize: FontSize.base,
    color: '#6366F1',
    fontWeight: '700',
    width: 20,
    marginTop: 1,
  },
  featureText: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 22,
  },
  featureTextPremium: {
    fontSize: FontSize.base,
    color: Colors.text,
    flex: 1,
    lineHeight: 22,
  },

  // Legal & Restore
  legalNote: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    lineHeight: 18,
    textAlign: 'center',
  },
  restoreBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: 4,
  },
  restoreBtnText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textDecorationLine: 'underline',
  },
  planDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.bg, position: 'absolute', top: 12, right: 12, alignItems: 'center', justifyContent: 'center' },
  planDotActive: { backgroundColor: Colors.violet, borderColor: Colors.violet },
  planDotInner: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
  planBestBadge: { position: 'absolute', top: -10, left: '25%', backgroundColor: Colors.violet, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  planBestText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.6, textTransform: 'uppercase' },
  planPriceSuffix: { fontSize: 13, fontWeight: '500' },
  planSub: { fontSize: 11 },
  planSaving: { fontSize: 11, fontWeight: '700', color: Colors.violet, marginTop: 4 },
});

// Table
const cmpStyles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginVertical: 14, borderWidth: 0.5, borderRadius: 14, overflow: 'hidden' },
  headRow: { flexDirection: 'row', borderBottomWidth: 0.5 },
  headFeat: { flex: 1.5, padding: 10, fontSize: 11, fontWeight: '700', textAlign: 'left' },
  headCol: { flex: 1, padding: 10, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  headColGold: { flex: 1, padding: 10, fontSize: 11, fontWeight: '700', textAlign: 'center', color: '#D97706', backgroundColor: '#FEF3C7' },
  row: { flexDirection: 'row' },
  cellFeat: { flex: 1.5, padding: 9, paddingHorizontal: 8, fontSize: 12, fontWeight: '500' },
  cell: { flex: 1, padding: 9, fontSize: 12, textAlign: 'center' },
  cellGoldBg: { flex: 1, padding: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(217,119,6,0.04)' },
  cellGoldText: { fontSize: 12, fontWeight: '700', color: '#D97706' },
  checkCircle: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  checkMark: { fontSize: 10, color: Colors.violet, fontWeight: '700' },
});

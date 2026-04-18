import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Switch,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../theme/colors';
import { USER_LEVELS } from '../data/mockData';
import { useTranslation, Language } from '../context/LanguageContext';
import { CATEGORY_CONFIG } from '../data/categoryConfig';
import { deleteAccount } from '../services/authService';
import { Category } from '../types';
import { UserStats } from '../../App';

const NOTIFICATION_SLOTS = ['Colazione', 'Pranzo', 'Pomeriggio', 'Cena'];

// Componente bottom sheet generico
function BottomSheet({ visible, onClose, title, children }: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sheet.overlay} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={sheet.container}>
          <View style={sheet.handle} />
          <Text style={sheet.title}>{title}</Text>
          {children}
          <TouchableOpacity style={[sheet.closeBtn, !onClose && sheet.closeBtnDisabled]} onPress={onClose}>
            <Text style={sheet.closeBtnText}>Chiudi</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const sheet = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  container: {
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.lg,
    paddingBottom: 36,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  closeBtn: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  closeBtnDisabled: {
    opacity: 0.4,
  },
  closeBtnText: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});

interface ProfileScreenProps {
  isPremium: boolean;
  onGoToPremium: () => void;
  onLogout: () => void;
  onAccountDeleted: () => void;
  userName?: string;
  userStats?: UserStats;
}

export default function ProfileScreen({ isPremium, onGoToPremium, onLogout, onAccountDeleted, userName = '', userStats }: ProfileScreenProps) {
  const { t, language, setLanguage } = useTranslation();

  // Livello dal profilo reale (fallback al livello 0 se non ancora caricato)
  const levelIndex = userStats?.level ?? 0;
  const userLevel = USER_LEVELS[levelIndex] ?? USER_LEVELS[0];

  // Stati impostazioni
  const [darkMode, setDarkMode] = useState(false);
  const [showDarkModeInfo, setShowDarkModeInfo] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [notifSlot, setNotifSlot] = useState('Colazione');
  const [interests, setInterests] = useState<Category[]>([]);

  // Modal aperti
  const [showSlot, setShowSlot]           = useState(false);
  const [showInterests, setShowInterests] = useState(false);
  const [showSources, setShowSources]     = useState(false);
  const [showPrivacy, setShowPrivacy]     = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteFinal, setShowDeleteFinal]     = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Helper: label categoria nella lingua corrente
  const getCatLabel = (config: typeof CATEGORY_CONFIG[0]) =>
    language === 'it' ? config.labelIt : config.labelEn;

  // Quante categorie non-premium selezionate (per il requisito minimo)
  const freeSelected = interests.filter(id => {
    const config = CATEGORY_CONFIG.find(c => c.id === id);
    return config && !config.premiumOnly;
  }).length;

  const toggleInterest = (categoryId: Category, isPremiumCategory: boolean) => {
    const isAlreadySelected = interests.includes(categoryId);
    // Mostra alert solo quando si tenta di SELEZIONARE una locked, non di deselezionare
    if (isPremiumCategory && !isPremium && !isAlreadySelected) {
      Alert.alert(
        '⭐ Categoria Premium',
        language === 'it'
          ? 'Questa categoria è disponibile con OddFeed Premium. Vuoi attivarla?'
          : 'This category is available with OddFeed Premium. Want to activate it?',
        [
          { text: language === 'it' ? 'Annulla' : 'Cancel', style: 'cancel' },
          { text: language === 'it' ? 'Vai a Premium' : 'Go Premium', onPress: onGoToPremium },
        ]
      );
      return;
    }

    // Non permettere di deselezionare se resterebbe sotto il minimo (3 free)
    const isSelected = interests.includes(categoryId);
    if (isSelected && !isPremiumCategory && freeSelected <= 3) {
      Alert.alert(
        language === 'it' ? 'Minimo 3 categorie' : 'Minimum 3 categories',
        language === 'it'
          ? 'Devi mantenere almeno 3 categorie gratuite selezionate.'
          : 'You must keep at least 3 free categories selected.'
      );
      return;
    }

    setInterests(prev =>
      prev.includes(categoryId)
        ? prev.filter(i => i !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profilo</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header profilo */}
        <View style={styles.profileHeader}>
          <Text style={styles.profileName}>{userName || '—'}</Text>
          <View style={styles.profileMeta}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeEmoji}>{userLevel.emoji}</Text>
              <Text style={styles.levelBadgeText}>{t.levels[userLevel.level] ?? userLevel.name}</Text>
            </View>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.profilePoints}><Text style={styles.bold}>{userStats?.points ?? 0}</Text> pt</Text>
            {isPremium && (
              <>
                <Text style={styles.metaDot}>·</Text>
                <View style={styles.premiumBadge}>
                  <Text style={styles.premiumBadgeText}>⭐ Premium</Text>
                </View>
              </>
            )}
          </View>
          <Text style={styles.profileStreak}>
            {t.profile.streak}
          </Text>
        </View>

        {/* Preferenze */}
        <Text style={styles.sectionTitle}>{t.profile.preferences}</Text>
        <View style={styles.settingsGroup}>

          <TouchableOpacity style={styles.settingsItem} onPress={() => setShowSlot(true)}>
            <Text style={styles.settingsLabel}>{t.profile.notificationSlot}</Text>
            <Text style={styles.settingsValue}>{notifSlot}</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingsItem, styles.itemBorder]} onPress={() => setShowLanguage(true)}>
            <Text style={styles.settingsLabel}>{t.profile.language}</Text>
            <Text style={styles.settingsValue}>{language === 'it' ? '🇮🇹 Italiano' : '🇬🇧 English'}</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingsItem, styles.itemBorder]} onPress={() => setShowInterests(true)}>
            <Text style={styles.settingsLabel}>{t.profile.interests}</Text>
            <Text style={styles.settingsValue} numberOfLines={1}>
              {interests.length > 0
                ? interests.map(id => {
                    const config = CATEGORY_CONFIG.find(c => c.id === id);
                    return config ? config.emoji : id;
                  }).join(' ')
                : (language === 'it' ? 'Nessuno' : 'None')}
            </Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingsItem, styles.itemBorder]} onPress={() => setShowDarkModeInfo(true)} activeOpacity={1}>
            <Text style={styles.settingsLabel}>{t.profile.darkMode}</Text>
            <Switch
              value={darkMode}
              onValueChange={(val) => { setDarkMode(val); setShowDarkModeInfo(true); }}
              trackColor={{ false: Colors.border, true: Colors.text }}
              thumbColor="#fff"
            />
          </TouchableOpacity>

        </View>

        <Text style={styles.sectionTitle}>{t.profile.account}</Text>
        <View style={styles.settingsGroup}>

          <TouchableOpacity style={[styles.settingsItem, styles.premiumItem]} onPress={onGoToPremium}>
            <Text style={[styles.settingsLabel, { fontWeight: '600' }]}>{t.profile.premium}</Text>
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>1,99 €/mese</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingsItem, styles.itemBorder]} onPress={() => setShowSources(true)}>
            <Text style={styles.settingsLabel}>{t.profile.sources}</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <View style={[styles.settingsItem, styles.itemBorder]}>
            <Text style={styles.settingsLabel}>{t.profile.notifications}</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: Colors.border, true: Colors.text }}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity style={[styles.settingsItem, styles.itemBorder]} onPress={() => setShowPrivacy(true)}>
            <Text style={styles.settingsLabel}>{t.profile.privacyTerms}</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingsItem, styles.itemBorder]} onPress={() => setShowLogoutConfirm(true)}>
            <Text style={styles.settingsLabel}>{t.profile.logout}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingsItem, styles.itemBorder]} onPress={() => setShowDeleteConfirm(true)}>
            <Text style={[styles.settingsLabel, { color: Colors.red }]}>{t.profile.deleteAccount}</Text>
          </TouchableOpacity>

        </View>

        <Text style={styles.footer}>{t.profile.version}</Text>
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Modal fascia notifiche */}
      <BottomSheet visible={showSlot} onClose={() => setShowSlot(false)} title={t.profile.notifSlotTitle}>
        {t.profile.slots.map((slot) => (
          <TouchableOpacity
            key={slot}
            style={[modalStyles.option, notifSlot === slot && modalStyles.optionActive]}
            onPress={() => { setNotifSlot(slot); setShowSlot(false); }}
          >
            <Text style={[modalStyles.optionText, notifSlot === slot && modalStyles.optionTextActive]}>
              {slot}
            </Text>
            {notifSlot === slot && <Text style={modalStyles.check}>✓</Text>}
          </TouchableOpacity>
        ))}
      </BottomSheet>

      {/* Modal interessi */}
      <BottomSheet
        visible={showInterests}
        onClose={() => setShowInterests(false)}
        title={t.profile.interestsTitle}
      >
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
          {freeSelected < 3 ? (
            <View style={modalStyles.warning}>
              <Text style={modalStyles.warningText}>
                {t.profile.interestsMin(freeSelected)}
              </Text>
            </View>
          ) : (
            <Text style={modalStyles.minHint}>{t.profile.interestsCount(interests.length)}</Text>
          )}

          {/* Categorie gratuite */}
          <Text style={modalStyles.groupLabel}>
            {language === 'it' ? 'Categorie gratuite' : 'Free categories'}
          </Text>
          <View style={modalStyles.tagsWrap}>
            {CATEGORY_CONFIG.filter(c => !c.premiumOnly).map((config) => {
              const active = interests.includes(config.id);
              return (
                <TouchableOpacity
                  key={config.id}
                  style={[modalStyles.tag, active && modalStyles.tagActive]}
                  onPress={() => toggleInterest(config.id, false)}
                >
                  <Text style={[modalStyles.tagText, active && modalStyles.tagTextActive]}>
                    {getCatLabel(config)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Categorie premium */}
          <View style={modalStyles.premiumGroupHeader}>
            <Text style={modalStyles.groupLabel}>
              {language === 'it' ? 'Categorie Premium' : 'Premium categories'}
            </Text>
            <View style={modalStyles.premiumBadgeSmall}>
              <Text style={modalStyles.premiumBadgeSmallText}>⭐</Text>
            </View>
          </View>
          <View style={modalStyles.tagsWrap}>
            {CATEGORY_CONFIG.filter(c => c.premiumOnly).map((config) => {
              const active = interests.includes(config.id);
              const locked = !isPremium;
              return (
                <TouchableOpacity
                  key={config.id}
                  style={[
                    modalStyles.tag,
                    modalStyles.tagPremium,
                    active && modalStyles.tagPremiumActive,
                    locked && modalStyles.tagLocked,
                  ]}
                  onPress={() => toggleInterest(config.id, true)}
                >
                  <Text style={[
                    modalStyles.tagText,
                    modalStyles.tagTextPremium,
                    active ? modalStyles.tagTextActive : (locked && modalStyles.tagTextLocked),
                  ]}>
                    {getCatLabel(config)}{locked ? ' 🔒' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </BottomSheet>


      {/* Modal fonti */}
      <BottomSheet visible={showSources} onClose={() => setShowSources(false)} title={t.profile.sourcesTitle}>
        {['The Guardian', 'BBC News', 'Reuters', 'Wired', 'National Geographic', 'Le Monde'].map((s, i) => (
          <View key={s} style={[modalStyles.sourceItem, i > 0 && modalStyles.sourceBorder]}>
            <View style={modalStyles.sourceDot} />
            <Text style={modalStyles.sourceText}>{s}</Text>
          </View>
        ))}
      </BottomSheet>

      {/* Modal privacy */}
      <BottomSheet visible={showPrivacy} onClose={() => setShowPrivacy(false)} title={t.profile.privacyTerms}>
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
          <Text style={modalStyles.legalSection}>Cosa raccogliamo</Text>
          <Text style={modalStyles.bodyText}>
            OddFeed non raccoglie né trasmette dati personali ai nostri server. Le tue preferenze (interessi, fascia oraria, data di nascita) sono salvate esclusivamente sul tuo dispositivo e non vengono mai condivise con noi o con terze parti.
          </Text>

          <Text style={modalStyles.legalSection}>Notifiche</Text>
          <Text style={modalStyles.bodyText}>
            Se attivi le notifiche, il tuo dispositivo riceve un token anonimo utilizzato solo per inviare le notizie del giorno. Questo token non è collegato alla tua identità e non viene usato per altri scopi.
          </Text>

          <Text style={modalStyles.legalSection}>Contenuti di terze parti</Text>
          <Text style={modalStyles.bodyText}>
            Le notizie provengono da fonti giornalistiche verificate (The Guardian, BBC, Reuters e altre). OddFeed non è responsabile dei contenuti prodotti da queste fonti.
          </Text>

          <Text style={modalStyles.legalSection}>I tuoi diritti</Text>
          <Text style={modalStyles.bodyText}>
            Puoi eliminare tutti i dati dell'app in qualsiasi momento disinstallandola dal tuo dispositivo. Per qualsiasi domanda: privacy@oddfeed.app
          </Text>

          <Text style={modalStyles.legalSection}>Termini di utilizzo</Text>
          <Text style={modalStyles.bodyText}>
            App +18. I contenuti sono a scopo informativo e di intrattenimento. È vietato l'uso dell'app per diffondere i contenuti in modo fuorviante o decontestualizzato.
          </Text>

          <Text style={modalStyles.legalFooter}>Versione 1.0 · Aprile 2026</Text>
        </ScrollView>
      </BottomSheet>

      {/* Modal lingua */}
      <BottomSheet visible={showLanguage} onClose={() => setShowLanguage(false)} title={t.profile.language}>
        {[{ code: 'it', label: '🇮🇹 Italiano' }, { code: 'en', label: '🇬🇧 English' }].map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[modalStyles.option, language === lang.code && modalStyles.optionActive]}
            onPress={() => { setLanguage(lang.code as Language); setShowLanguage(false); }}
          >
            <Text style={[modalStyles.optionText, language === lang.code && modalStyles.optionTextActive]}>
              {lang.label}
            </Text>
            {language === lang.code && <Text style={modalStyles.check}>✓</Text>}
          </TouchableOpacity>
        ))}
      </BottomSheet>

      {/* Modal dark mode */}
      <BottomSheet visible={showDarkModeInfo} onClose={() => setShowDarkModeInfo(false)} title={t.profile.darkMode}>
        <Text style={modalStyles.bodyText}>{t.profile.darkModeComingSoon}</Text>
      </BottomSheet>

      {/* Modal logout */}
      <BottomSheet visible={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} title={t.profile.logoutTitle}>
        <Text style={modalStyles.bodyText}>{t.profile.logoutBody}</Text>
        <TouchableOpacity style={modalStyles.saveBtn} onPress={onLogout}>
          <Text style={modalStyles.saveBtnText}>{t.profile.logoutConfirm}</Text>
        </TouchableOpacity>
      </BottomSheet>

      {/* Modal conferma eliminazione — step 1 */}
      <BottomSheet visible={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title={t.profile.deleteTitle}>
        <Text style={modalStyles.bodyText}>{t.profile.deleteBody}</Text>
        <TouchableOpacity
          style={modalStyles.deleteBtn}
          onPress={() => { setShowDeleteConfirm(false); setShowDeleteFinal(true); }}
        >
          <Text style={modalStyles.deleteBtnText}>{t.profile.deleteConfirm}</Text>
        </TouchableOpacity>
      </BottomSheet>

      {/* Modal conferma eliminazione — step 2 (definitivo) */}
      <BottomSheet visible={showDeleteFinal} onClose={() => setShowDeleteFinal(false)} title={t.profile.deleteFinalTitle}>
        <Text style={modalStyles.bodyText}>{t.profile.deleteFinalBody}</Text>
        <TouchableOpacity
          style={modalStyles.deleteBtn}
          onPress={async () => {
            try {
              setShowDeleteFinal(false);
              // Passiamo onAccountDeleted come callback da chiamare
              // DENTRO deleteAccount, appena prima di deleteUser.
              // Così il flag è settato prima che Firebase triggeri onAuthStateChanged,
              // ma SOLO se la cancellazione sta effettivamente per andare a buon fine.
              await deleteAccount(onAccountDeleted);
            } catch (err: any) {
              if (err?.code === 'auth/requires-recent-login') {
                Alert.alert(
                  'Riautenticazione richiesta',
                  'Per eliminare l\'account devi aver effettuato l\'accesso di recente. Esci e accedi di nuovo, poi riprova.',
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('Errore', err?.message ?? 'Impossibile eliminare l\'account. Riprova.');
              }
            }
          }}
        >
          <Text style={modalStyles.deleteBtnText}>{t.profile.deleteFinalConfirm}</Text>
        </TouchableOpacity>
      </BottomSheet>

    </SafeAreaView>
  );
}

const modalStyles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.xs,
    backgroundColor: Colors.bg2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionActive: {
    backgroundColor: Colors.text,
    borderColor: Colors.text,
  },
  optionText: {
    fontSize: FontSize.base,
    fontWeight: '500',
    color: Colors.text,
  },
  optionTextActive: { color: '#fff' },
  check: { fontSize: FontSize.base, color: '#fff', fontWeight: '700' },
  minHint: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginBottom: Spacing.md,
  },
  warning: {
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#F0D98A',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  warningText: {
    fontSize: FontSize.sm,
    color: '#7A6010',
    fontWeight: '500',
    lineHeight: 18,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: Spacing.md,
  },
  groupLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  premiumGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.sm,
    marginBottom: 4,
  },
  premiumBadgeSmall: {
    backgroundColor: '#FFF8E1',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#F0C040',
  },
  premiumBadgeSmallText: { fontSize: 11, fontWeight: '700', color: '#A07000' },
  tag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagActive: {
    backgroundColor: Colors.text,
    borderColor: Colors.text,
  },
  tagPremium: { borderColor: '#F0C040', backgroundColor: '#FFFBF0' },
  tagPremiumActive: { backgroundColor: '#C8860A', borderColor: '#C8860A' },
  tagLocked: { opacity: 0.6 },
  tagText: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  tagTextActive: { color: '#fff' },
  tagTextPremium: { color: '#A07000' },
  tagTextLocked: { color: Colors.textTertiary },
  tagBlocked: { opacity: 0.5 },
  hint: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.lg,
    color: Colors.text,
    backgroundColor: Colors.bg2,
    letterSpacing: 1,
  },
  saveBtn: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.text,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#fff',
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  sourceBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  sourceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.green,
  },
  sourceText: {
    fontSize: FontSize.base,
    color: Colors.text,
    fontWeight: '500',
  },
  bodyText: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  legalSection: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  deleteBtn: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.red,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#fff',
  },
  legalFooter: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
});

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
  profileHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  profileName: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text },
  profileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  metaDot: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    backgroundColor: Colors.bg2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
  },
  levelBadgeEmoji: { fontSize: 13 },
  levelBadgeText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  profilePoints: { fontSize: FontSize.base, color: Colors.textSecondary },
  profileStreak: { fontSize: FontSize.base, color: Colors.textSecondary },
  bold: { fontWeight: '700', color: Colors.text },
  sectionTitle: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#6366F1',
  },
  settingsGroup: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    minHeight: 52,
  },
  itemBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  premiumItem: { backgroundColor: '#FFFCF0' },
  settingsLabel: {
    fontSize: FontSize.base,
    color: Colors.text,
    flex: 1,
  },
  settingsNote: { fontSize: FontSize.xs, color: Colors.textTertiary },
  settingsValue: {
    fontSize: FontSize.base,
    color: Colors.textTertiary,
    maxWidth: 140,
    textAlign: 'right',
  },
  arrow: { fontSize: 18, color: Colors.textTertiary },
  premiumBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(201,162,39,0.15)',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.4)',
  },
  premiumBadgeText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gold },
  footer: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    paddingTop: Spacing.xl,
  },
});

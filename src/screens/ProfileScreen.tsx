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
} from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../theme/colors';
import { MOCK_USER } from '../data/mockData';
import { useTranslation, Language } from '../context/LanguageContext';

const NOTIFICATION_SLOTS = ['Colazione', 'Pranzo', 'Pomeriggio', 'Cena'];
const ALL_INTERESTS = [
  'Animali', 'Scienza', 'Tecnologia', 'Record',
  'Leggi Strane', 'Natura', 'Spazio', 'Storia',
  'Mistero', 'Cibo', 'Persone', 'Luoghi',
];

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
}

export default function ProfileScreen({ isPremium, onGoToPremium, onLogout }: ProfileScreenProps) {
  const { t, language, setLanguage } = useTranslation();
  const user = MOCK_USER;

  // Stati impostazioni
  const [darkMode, setDarkMode] = useState(false);
  const [showDarkModeInfo, setShowDarkModeInfo] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [notifSlot, setNotifSlot] = useState(user.notificationSlot);
  const [interests, setInterests] = useState<string[]>(user.interests);

  // Modal aperti
  const [showSlot, setShowSlot]         = useState(false);
  const [showInterests, setShowInterests] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteFinal, setShowDeleteFinal]     = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const toggleInterest = (item: string) => {
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
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
          <Text style={styles.profileName}>{user.name}</Text>
          <View style={styles.profileMeta}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeEmoji}>{user.level.emoji}</Text>
              <Text style={styles.levelBadgeText}>{t.levels[user.level.level] ?? user.level.name}</Text>
            </View>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.profilePoints}><Text style={styles.bold}>{user.points}</Text> pt</Text>
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
              {interests.length > 0 ? interests.join(', ') : (language === 'it' ? 'Nessuno' : 'None')}
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
        onClose={() => interests.length >= 3 && setShowInterests(false)}
        title={t.profile.interestsTitle}
      >
        {interests.length < 3 ? (
          <View style={modalStyles.warning}>
            <Text style={modalStyles.warningText}>
              {t.profile.interestsMin(interests.length)}
            </Text>
          </View>
        ) : (
          <Text style={modalStyles.minHint}>{t.profile.interestsCount(interests.length)}</Text>
        )}
        <View style={modalStyles.tagsWrap}>
          {ALL_INTERESTS.map((item) => {
            const active = interests.includes(item);
            return (
              <TouchableOpacity
                key={item}
                style={[modalStyles.tag, active && modalStyles.tagActive]}
                onPress={() => toggleInterest(item)}
              >
                <Text style={[modalStyles.tagText, active && modalStyles.tagTextActive]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
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
          onPress={() => {
            setNotifSlot(t.profile.slots[0]);
            setInterests(['Animali', 'Tecnologia', 'Record']);
            setDarkMode(false);
            setNotifications(true);
            setShowDeleteFinal(false);
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
  },
  tag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg2,
  },
  tagActive: {
    backgroundColor: Colors.text,
    borderColor: Colors.text,
  },
  tagText: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  tagTextActive: { color: '#fff' },
  tagBlocked: {
    opacity: 0.5,
  },
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

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from 'react-native';
import { Colors, getColors, FontSize, Spacing, Radius } from '../theme/colors';
import CustomSwitch from '../components/CustomSwitch';
import { useTheme } from '../context/ThemeContext';
import { USER_LEVELS } from '../data/mockData';
import { useTranslation, Language } from '../context/LanguageContext';
import { CATEGORY_CONFIG } from '../data/categoryConfig';
import { deleteAccount, getUserProfile, updateUserPreferences } from '../services/authService';
import { registerForPushNotifications } from '../services/notificationService';
import { auth } from '../config/firebase';
import { Category } from '../types';
import { UserStats } from '../../App';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';

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
  const { isDark, setIsDark } = useTheme();
  const C = getColors(isDark);

  // Livello dal profilo reale (fallback al livello 0 se non ancora caricato)
  const levelIndex = userStats?.level ?? 0;
  const userLevel = USER_LEVELS[levelIndex] ?? USER_LEVELS[0];

  // isDark viene da ThemeContext, non più da stato locale
  const [showDarkModeInfo, setShowDarkModeInfo] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [notifSlot, setNotifSlot] = useState('Colazione');
  const [interests, setInterests] = useState<Category[]>([]);

  // Carica interessi e slot notifica da Firestore al mount
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    getUserProfile(user.uid).then(profile => {
      if (profile?.interests && profile.interests.length > 0) setInterests(profile.interests as Category[]);
      if (profile?.notificationSlot) setNotifSlot(profile.notificationSlot);
    }).catch(() => {});
  }, []);

  // Modal aperti
  const [showSlot, setShowSlot]           = useState(false);
  const [showInterests, setShowInterests] = useState(false);
  const [showSources, setShowSources]     = useState(false);
  const [showPrivacy, setShowPrivacy]     = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteFinal, setShowDeleteFinal]     = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDarkModeLocked, setShowDarkModeLocked] = useState(false);

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

  const IconBox = ({ emoji }: { emoji: string }) => (
    <View style={[profStyles.iconBox, { backgroundColor: C.bg2, borderColor: C.border }]}>
      <Text style={profStyles.iconBoxEmoji}>{emoji}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <View style={[styles.heroArea, { backgroundColor: C.hero }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroKicker}>IL TUO PROFILO</Text>
            <Text style={styles.heroTitle}>{userName || '—'}</Text>
            {isPremium ? (
              <View style={styles.heroPremiumRow}>
                <Text style={styles.heroPremiumIcon}>✦</Text>
                <Text style={[styles.heroSubtitle, { color: C.heroSubtext }]}>Premium attivo</Text>
              </View>
            ) : (
              <Text style={[styles.heroSubtitle, { color: C.heroSubtext }]}>
                {userLevel.emoji} {t.levels[userLevel.level] ?? userLevel.name} · {userStats?.points ?? 0} pt
              </Text>
            )}
          </View>
          <Text style={styles.heroEmoji}>👤</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── PREFERENZE ── */}
        <View style={profStyles.secHdr}>
          <View style={profStyles.secHdrIcon}><Ionicons name="settings-outline" size={22} color={Colors.violet} /></View>
          <Text style={[profStyles.secHdrTitle, { color: '#1E1B4B' }]}>PREFERENZE</Text>
        </View>
        <View style={styles.settingsGroup}>

          {(userStats?.level ?? 0) >= 1 ? (
            <View style={[styles.settingsItem, { borderTopWidth: 0 }]}>
              <IconBox emoji="🌙" />
              <Text style={[styles.settingsLabel, { color: C.text }]}>{t.profile.darkMode}</Text>
              <CustomSwitch value={isDark} onValueChange={(val) => setIsDark(val)} activeColor={C.violet} inactiveColor={C.border} />
            </View>
          ) : (
            <TouchableOpacity style={[styles.settingsItem, { borderTopWidth: 0 }]} onPress={() => setShowDarkModeLocked(true)}>
              <IconBox emoji="🌙" />
              <Text style={[styles.settingsLabel, { color: C.text }]}>{t.profile.darkMode}</Text>
              <View style={[styles.comingSoonBadge, { backgroundColor: C.bg2, borderColor: C.border }]}>
                <Text style={[styles.comingSoonText, { color: C.textTertiary }]}>🔒 Esploratore</Text>
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.settingsItem}>
            <IconBox emoji="🔔" />
            <Text style={[styles.settingsLabel, { color: C.text }]}>{t.profile.notifications}</Text>
            <CustomSwitch
              value={notifications}
              onValueChange={async (val) => {
                setNotifications(val);
                if (val) {
                  const user = auth.currentUser;
                  if (user) { registerForPushNotifications(user.uid).catch(() => {}); }
                }
              }}
              activeColor={C.violet}
              inactiveColor={C.border}
            />
          </View>

          <TouchableOpacity style={styles.settingsItem} onPress={() => setShowLanguage(true)}>
            <IconBox emoji="🌐" />
            <Text style={[styles.settingsLabel, { color: C.text }]}>{t.profile.language}</Text>
            <Text style={[styles.settingsValue, { color: C.textTertiary }]}>{language === 'it' ? '🇮🇹 Italiano' : '🇬🇧 English'}</Text>
            <Ionicons name="chevron-forward" size={14} color={C.textTertiary} />
          </TouchableOpacity>

        </View>

        {/* ── ACCOUNT ── */}
        <View style={profStyles.secHdr}>
          <View style={profStyles.secHdrIcon}><Ionicons name="person-outline" size={22} color={Colors.violet} /></View>
          <Text style={[profStyles.secHdrTitle, { color: '#1E1B4B' }]}>ACCOUNT</Text>
        </View>
        {isPremium && (
          <TouchableOpacity style={profStyles.goldBanner} onPress={onGoToPremium} activeOpacity={0.8}>
            <Text style={{ fontSize: 18 }}>👑</Text>
            <View style={{ flex: 1 }}>
              <Text style={profStyles.goldBannerTitle}>OddFeed Premium attivo</Text>
              <Text style={profStyles.goldBannerSub}>Gestisci il tuo abbonamento</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={14} color="#D97706" />
          </TouchableOpacity>
        )}
        <View style={styles.settingsGroup}>
          <TouchableOpacity style={[styles.settingsItem, styles.premiumItem, { borderTopWidth: 0 }]} onPress={onGoToPremium}>
            <IconBox emoji="💳" />
            <Text style={[styles.settingsLabel, { fontWeight: '600', color: C.text }]}>{t.profile.premium}</Text>
            <View style={styles.premiumBadge}><Text style={styles.premiumBadgeText}>1,99 €/mese</Text></View>
            <Ionicons name="chevron-forward" size={14} color={C.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem} onPress={() => setShowSlot(true)}>
            <IconBox emoji="🔔" />
            <Text style={[styles.settingsLabel, { color: C.text }]}>{t.profile.notificationSlot}</Text>
            <Text style={[styles.settingsValue, { color: C.textTertiary }]}>{notifSlot}</Text>
            <Ionicons name="chevron-forward" size={14} color={C.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem} onPress={() => setShowSources(true)}>
            <IconBox emoji="📰" />
            <Text style={[styles.settingsLabel, { color: C.text }]}>{t.profile.sources}</Text>
            <Ionicons name="chevron-forward" size={14} color={C.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* ── INTERESSI (inline grid) ── */}
        <View style={profStyles.secHdr}>
          <View style={profStyles.secHdrIcon}><Ionicons name="heart-outline" size={22} color={Colors.violet} /></View>
          <Text style={[profStyles.secHdrTitle, { color: '#1E1B4B' }]}>INTERESSI</Text>
        </View>
        {freeSelected < 3 && (
          <View style={[profStyles.interestWarning, { backgroundColor: '#FFF3CD', borderColor: '#F0D98A' }]}>
            <Text style={{ fontSize: 12, color: '#7A6010', fontWeight: '500' }}>{t.profile.interestsMin(freeSelected)}</Text>
          </View>
        )}
        {/* Categorie gratuite */}
        <View style={profStyles.interestGrid}>
          {CATEGORY_CONFIG.filter(c => !c.premiumOnly).map((config) => {
            const active = interests.includes(config.id);
            return (
              <TouchableOpacity
                key={config.id}
                style={[
                  profStyles.intChip,
                  { borderColor: C.border, backgroundColor: C.bg },
                  active && { backgroundColor: '#EEF2FF', borderColor: Colors.violet },
                ]}
                onPress={() => toggleInterest(config.id, false)}
                activeOpacity={0.7}
              >
                <Text style={[
                  profStyles.intChipText,
                  { color: C.textSecondary },
                  active && { color: Colors.violet },
                ]} numberOfLines={1}>
                  {getCatLabel(config)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Divider categorie Premium */}
        <View style={profStyles.premiumCatHdr}>
          <View style={profStyles.premiumCatLine} />
          <View style={profStyles.premiumCatBadge}>
            <Text style={profStyles.premiumCatBadgeText}>👑 PREMIUM</Text>
          </View>
          <View style={profStyles.premiumCatLine} />
        </View>

        {/* Categorie premium */}
        <View style={[profStyles.interestGrid, { paddingBottom: 14 }]}>
          {CATEGORY_CONFIG.filter(c => c.premiumOnly).map((config) => {
            const active = interests.includes(config.id);
            const locked = !isPremium;
            return (
              <TouchableOpacity
                key={config.id}
                style={[
                  profStyles.intChip,
                  profStyles.intChipPremium,
                  active && !locked && { backgroundColor: '#FEF3C7', borderColor: '#D97706' },
                  locked && { opacity: 0.55 },
                ]}
                onPress={() => toggleInterest(config.id, true)}
                activeOpacity={0.7}
              >
                <Text style={[
                  profStyles.intChipText,
                  { color: '#92400E' },
                  active && !locked && { color: '#B45309', fontWeight: '700' },
                ]} numberOfLines={1}>
                  {getCatLabel(config)}{locked ? ' 🔒' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── PRIVACY E DATI ── */}
        <View style={profStyles.secHdr}>
          <View style={profStyles.secHdrIcon}><Ionicons name="shield-outline" size={22} color={Colors.violet} /></View>
          <Text style={[profStyles.secHdrTitle, { color: '#1E1B4B' }]}>PRIVACY E DATI</Text>
        </View>
        <View style={styles.settingsGroup}>
          <TouchableOpacity style={[styles.settingsItem, { borderTopWidth: 0 }]} onPress={() => setShowPrivacy(true)}>
            <IconBox emoji="🔒" />
            <Text style={[styles.settingsLabel, { color: C.text }]}>{t.profile.privacyTerms}</Text>
            <Ionicons name="chevron-forward" size={14} color={C.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem} onPress={() => setShowDeleteConfirm(true)}>
            <IconBox emoji="🗑️" />
            <Text style={[styles.settingsLabel, { color: Colors.red }]}>{t.profile.deleteAccount}</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={profStyles.logoutRow} onPress={() => setShowLogoutConfirm(true)}>
          <Text style={profStyles.logoutText}>{t.profile.logout}</Text>
        </TouchableOpacity>

        <Text style={[styles.footer, { color: C.textTertiary }]}>{t.profile.version}</Text>
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Modal fascia notifiche */}
      <BottomSheet visible={showSlot} onClose={() => setShowSlot(false)} title={t.profile.notifSlotTitle}>
        {t.profile.slots.map((slot) => (
          <TouchableOpacity
            key={slot}
            style={[modalStyles.option, notifSlot === slot && modalStyles.optionActive]}
            onPress={() => {
              setNotifSlot(slot);
              setShowSlot(false);
              const user = auth.currentUser;
              if (user) updateUserPreferences(user.uid, { notificationSlot: slot }).catch(() => {});
            }}
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
        onClose={async () => {
          setShowInterests(false);
          const user = auth.currentUser;
          if (user) {
            updateUserPreferences(user.uid, { interests }).catch(() => {});
          }
        }}
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
        {['The Guardian', 'ANSA', 'Fanpage.it', 'Il Post', 'TGcom24', 'BBC News', 'Reuters'].map((s, i) => (
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

      {/* Modal dark mode — rimosso (il toggle funziona direttamente) */}

      {/* Modal dark mode — bloccato (per chi non ha ancora Esploratore) */}
      <BottomSheet visible={showDarkModeLocked} onClose={() => setShowDarkModeLocked(false)} title="🔒 Funzione bloccata">
        <Text style={modalStyles.bodyText}>
          La modalità scura si sblocca quando raggiungi il livello <Text style={{ fontWeight: '700', color: Colors.text }}>Esploratore 🧭</Text> (100 pt).{'\n\n'}Continua a leggere le notizie per accumulare punti!
        </Text>
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
  heroArea: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 16,
    paddingBottom: 16,
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
  heroPremiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  heroPremiumIcon: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  heroEmoji: {
    fontSize: 72,
    lineHeight: 80,
    marginTop: 4,
  },
  bold: { fontWeight: '700', color: Colors.text },
  sectionTitle: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#4F46E5',
  },
  settingsGroup: {
    marginHorizontal: 0,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 0,
    minHeight: 52,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  itemBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  premiumItem: { backgroundColor: '#FFFCF0' },
  settingsLabel: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
    flex: 1,
  },
  settingsNote: { fontSize: FontSize.xs, color: Colors.textTertiary },
  settingsValue: {
    fontSize: 12,
    color: Colors.textSecondary,
    maxWidth: 140,
    textAlign: 'right',
    marginRight: 4,
  },
  arrow: { fontSize: 18, color: Colors.textTertiary },
  comingSoonBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  comingSoonText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textTertiary,
  },
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

// Stili specifici profile mockup
const profStyles = StyleSheet.create({
  secHdr: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  secHdrIcon: { alignItems: 'center', justifyContent: 'center' },
  secHdrTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 0.4, textTransform: 'uppercase', color: '#1E1B4B' },
  iconBox: { width: 30, height: 30, borderRadius: 9, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 },
  iconBoxEmoji: { fontSize: 14 },
  goldBanner: { marginHorizontal: 14, marginBottom: 8, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, paddingHorizontal: 14, borderWidth: 0.5, borderColor: '#FDE68A', flexDirection: 'row', alignItems: 'center', gap: 10 },
  goldBannerTitle: { fontSize: 13, fontWeight: '700', color: '#D97706' },
  goldBannerSub: { fontSize: 11, color: '#92400E', marginTop: 1 },
  // Inline interests grid
  interestGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 6,
  },
  intChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#C8C8CE',
    alignItems: 'center',
    justifyContent: 'center',
    width: '31.5%',
    overflow: 'hidden',
  },
  intChipPremium: {
    borderColor: '#F0C060',
    backgroundColor: '#FFFBEB',
  },
  intChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  premiumCatHdr: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginTop: 6,
    marginBottom: 8,
    gap: 8,
  },
  premiumCatLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F0C060',
  },
  premiumCatBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#F0C060',
  },
  premiumCatBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.6,
  },
  interestWarning: {
    marginHorizontal: 14,
    marginBottom: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#FFF1F1',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
    letterSpacing: 0.1,
  },
});

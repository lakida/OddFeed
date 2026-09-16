import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
  Linking,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, getColors, FontSize, Spacing, Radius } from '../theme/colors';
import { useTranslation } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { CATEGORY_CONFIG } from '../data/categoryConfig';
import { Category } from '../types';
import { STORAGE_KEYS } from '../../App';
import HeroHeader from '../components/HeroHeader';

interface SettingsScreenProps {
  interests: string[];
  onInterestsChange: (interests: string[]) => void;
  onShowWhatsNew?: () => void;
}

export default function SettingsScreen({ interests, onInterestsChange, onShowWhatsNew }: SettingsScreenProps) {
  const { t, language, setLanguage } = useTranslation();
  const { isDark, setIsDark } = useTheme();
  const C = getColors(isDark);
  const [localInterests, setLocalInterests] = useState<string[]>(interests);
  const [saved, setSaved] = useState(false);

  const toggleInterest = (id: Category) => {
    setLocalInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
    setSaved(false);
  };

  const handleSaveInterests = async () => {
    onInterestsChange(localInterests);
    await AsyncStorage.setItem(STORAGE_KEYS.INTERESTS, JSON.stringify(localInterests));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        <HeroHeader
          kicker="ODDFEED"
          titleDark="Impostazioni"
          subtitle="Tema, lingua e categorie"
          titleSize={30}
        />

        {/* Aspetto */}
        <View style={[styles.section, { backgroundColor: C.cardWhite, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>ASPETTO</Text>

          <View style={[styles.row, { borderBottomColor: C.border }]}>
            <View style={styles.rowLeft}>
              <Ionicons name={isDark ? 'moon' : 'sunny-outline'} size={20} color={Colors.violet} />
              <Text style={[styles.rowLabel, { color: C.text }]}>Tema scuro</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={(v) => setIsDark(v)}
              trackColor={{ false: Colors.border, true: Colors.violet }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="language-outline" size={20} color={Colors.violet} />
              <Text style={[styles.rowLabel, { color: C.text }]}>Lingua</Text>
            </View>
            <View style={styles.langToggle}>
              <TouchableOpacity
                style={[styles.langBtn, language === 'it' && styles.langBtnActive]}
                onPress={() => setLanguage('it')}
              >
                <Text style={[styles.langBtnText, language === 'it' && styles.langBtnTextActive]}>IT</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
                onPress={() => setLanguage('en')}
              >
                <Text style={[styles.langBtnText, language === 'en' && styles.langBtnTextActive]}>EN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Categorie preferite */}
        <View style={[styles.section, { backgroundColor: C.cardWhite, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>CATEGORIE PREFERITE</Text>
          <Text style={[styles.sectionSub, { color: C.textTertiary }]}>
            Le notizie di queste categorie appariranno per prime nel feed.
          </Text>

          <View style={styles.catGrid}>
            {CATEGORY_CONFIG.map(cat => {
              const selected = localInterests.includes(cat.id);
              const label = language === 'it' ? cat.labelIt : cat.labelEn;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catChip,
                    { borderColor: selected ? Colors.violet : C.border, backgroundColor: selected ? '#EEF2FF' : C.bg2 },
                  ]}
                  onPress={() => toggleInterest(cat.id as Category)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.catChipText, { color: selected ? Colors.violet : C.textSecondary }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saved && { backgroundColor: '#22c55e' }]}
            onPress={handleSaveInterests}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>{saved ? '✓ Salvato!' : 'Salva preferenze'}</Text>
          </TouchableOpacity>
        </View>

        {/* Altro */}
        <View style={[styles.section, { backgroundColor: C.cardWhite, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>ALTRO</Text>

          {onShowWhatsNew && (
            <TouchableOpacity
              style={[styles.row, { borderBottomColor: C.border }]}
              onPress={onShowWhatsNew}
              activeOpacity={0.75}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="sparkles-outline" size={20} color={Colors.violet} />
                <Text style={[styles.rowLabel, { color: C.text }]}>Cosa c'è di nuovo</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={C.textTertiary} />
            </TouchableOpacity>
          )}

        </View>

        {/* Legale */}
        <View style={[styles.section, { backgroundColor: C.cardWhite, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>LEGALE</Text>

          <TouchableOpacity
            style={[styles.row, { borderBottomColor: C.border }]}
            onPress={() => Linking.openURL('https://lakida.github.io/OddFeed/privacy-policy.html')}
            activeOpacity={0.75}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="shield-checkmark-outline" size={20} color={C.textTertiary} />
              <Text style={[styles.rowLabel, { color: C.text }]}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.row, { borderBottomColor: C.border, borderBottomWidth: 0 }]}
            onPress={() => Linking.openURL('https://lakida.github.io/OddFeed/termini.html')}
            activeOpacity={0.75}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="document-text-outline" size={20} color={C.textTertiary} />
              <Text style={[styles.rowLabel, { color: C.text }]}>Termini e Condizioni</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.textTertiary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.version, { color: C.textTertiary }]}>OddFeed · Il mondo è più strano di così</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  sectionSub: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 12,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  langToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  langBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  langBtnActive: {
    backgroundColor: Colors.violet,
  },
  langBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  langBtnTextActive: {
    color: '#fff',
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  catChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.violet,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 24,
  },
});

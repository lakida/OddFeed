import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Colors, getColors, FontSize, Spacing, Radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

interface AccountDeletedScreenProps {
  onRestart: () => void;
}

export default function AccountDeletedScreen({ onRestart }: AccountDeletedScreenProps) {
  const { isDark } = useTheme();
  const C = getColors(isDark);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>

      {/* Violet hero */}
      <View style={[styles.heroArea, { backgroundColor: C.hero }]}>
        <Text style={styles.heroKicker}>ODDFEED · ARRIVEDERCI</Text>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Account eliminato.</Text>
            <Text style={[styles.heroSubtitle, { color: C.heroSubtext }]}>
              Tutti i tuoi dati sono stati{'\n'}rimossi in modo definitivo.
            </Text>
          </View>
          <Text style={styles.heroEmoji}>👋</Text>
        </View>
      </View>

      <View style={[styles.container, { backgroundColor: C.bg }]}>

        {/* Card empatica */}
        <View style={[styles.card, { backgroundColor: C.bg2, borderColor: C.border }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>Ci dispiace vederti andare 💙</Text>
          <Text style={[styles.cardBody, { color: C.textSecondary }]}>
            Speriamo che sia una cosa temporanea. OddFeed sarà qui se dovessi tornare — con le notizie più strane del mondo ad aspettarti.
          </Text>
        </View>

        {/* CTA principale */}
        <TouchableOpacity style={styles.primaryBtn} onPress={onRestart} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Registrati di nuovo</Text>
        </TouchableOpacity>

        {/* CTA secondaria */}
        <TouchableOpacity style={styles.secondaryBtn} onPress={onRestart} activeOpacity={0.75}>
          <Text style={[styles.secondaryBtnText, { color: C.textSecondary }]}>Era un errore — accedi al tuo account</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  heroArea: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  heroKicker: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: 10,
  },
  heroTop: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: 8,
  },
  heroTitle: { fontSize: 33, fontWeight: '800', color: '#fff', letterSpacing: -0.5, lineHeight: 40 },
  heroSubtitle: { fontSize: 13, marginTop: 4, lineHeight: 19 },
  heroEmoji: { fontSize: 64, lineHeight: 72, marginTop: 2 },

  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    gap: Spacing.lg,
  },

  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardTitle: { fontSize: FontSize.base, fontWeight: '700' },
  cardBody: { fontSize: FontSize.base, lineHeight: 23 },

  primaryBtn: {
    backgroundColor: Colors.violet,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: FontSize.base, fontWeight: '700', color: '#fff' },

  secondaryBtn: { paddingVertical: 13, alignItems: 'center' },
  secondaryBtnText: { fontSize: FontSize.sm, fontWeight: '500', textDecorationLine: 'underline' },
});

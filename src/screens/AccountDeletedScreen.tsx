import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../theme/colors';

interface AccountDeletedScreenProps {
  onRestart: () => void;
}

export default function AccountDeletedScreen({ onRestart }: AccountDeletedScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Icona */}
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>👋</Text>
        </View>

        {/* Testi */}
        <Text style={styles.title}>Account eliminato</Text>
        <Text style={styles.subtitle}>
          Il tuo account è stato rimosso correttamente.{'\n'}
          Tutti i tuoi dati sono stati cancellati in modo definitivo.
        </Text>

        {/* Card empatica */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ci dispiace vederti andare 💙</Text>
          <Text style={styles.cardBody}>
            Speriamo che sia una cosa temporanea. OddFeed sarà qui se dovessi tornare — con le notizie più strane del mondo ad aspettarti.
          </Text>
        </View>

        {/* CTA principale — re-iscrizione */}
        <TouchableOpacity style={styles.primaryBtn} onPress={onRestart} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Registrati di nuovo</Text>
        </TouchableOpacity>

        {/* CTA secondaria — era un errore */}
        <TouchableOpacity style={styles.secondaryBtn} onPress={onRestart} activeOpacity={0.75}>
          <Text style={styles.secondaryBtnText}>Era un errore — accedi al tuo account</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
  },

  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.bg2,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  icon: { fontSize: 40 },

  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },

  card: {
    width: '100%',
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  cardTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text,
  },
  cardBody: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    lineHeight: 23,
  },

  primaryBtn: {
    width: '100%',
    backgroundColor: Colors.text,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#fff',
  },

  secondaryBtn: {
    width: '100%',
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
});

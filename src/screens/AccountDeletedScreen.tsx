import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../theme/colors';
import { useTranslation } from '../context/LanguageContext';

interface AccountDeletedScreenProps {
  onRestart: () => void;
}

export default function AccountDeletedScreen({ onRestart }: AccountDeletedScreenProps) {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.emoji}>👋</Text>
        <Text style={styles.title}>{t.accountDeleted.title}</Text>
        <Text style={styles.subtitle}>{t.accountDeleted.subtitle}</Text>
        <Text style={styles.note}>{t.accountDeleted.note}</Text>
        <TouchableOpacity style={styles.btn} onPress={onRestart}>
          <Text style={styles.btnText}>{t.accountDeleted.btn}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  emoji: { fontSize: 56 },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  note: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  btn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.text,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  btnText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#fff',
  },
});

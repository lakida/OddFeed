import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Colors, FontSize, Spacing, Radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';

// ─── Changelog: aggiungi nuove versioni in cima ──────────────────────────────
const CHANGELOG: Record<string, { emoji: string; title: string; description: string }[]> = {
  '1.1.0': [
    { emoji: '🔓', title: 'Accesso libero', description: 'Niente più registrazione o login — apri l\'app e leggi subito, senza account.' },
    { emoji: '🏷️', title: 'Categorie personalizzate', description: 'Scegli i tuoi interessi durante il setup: le notizie si adattano a te. Puoi cambiarli in qualsiasi momento da Impostazioni.' },
    { emoji: '🗂️', title: 'Archivio completo', description: 'Tutto l\'archivio dall\'inizio, senza limitazioni. Scorri, filtra e rileggi quando vuoi.' },
    { emoji: '🌙', title: 'Tema scuro e lingua', description: 'Dark mode e lingua (IT/EN) ora direttamente nelle Impostazioni.' },
  ],
  '1.0.0': [
    { emoji: '🚀', title: 'Benvenuto su OddFeed!', description: 'La prima versione è live. Notizie strane e curiose dal mondo, ogni giorno.' },
  ],
};

const STORAGE_KEY = '@oddFeed_lastSeenVersion';

interface Props {
  /** Se `true`, mostra sempre il modal (usato dall'entry in ProfileScreen) */
  forceVisible?: boolean;
  onClose?: () => void;
}

export default function WhatsNewModal({ forceVisible = false, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const { isDark } = useTheme();
  const C = getColors(isDark);

  const currentVersion = Constants.expoConfig?.version ?? '1.0.0';
  const changes = CHANGELOG[currentVersion] ?? CHANGELOG['1.0.0'];

  useEffect(() => {
    if (forceVisible) {
      setVisible(true);
      return;
    }
    // Mostra automaticamente solo se la versione è cambiata
    AsyncStorage.getItem(STORAGE_KEY).then(lastSeen => {
      if (lastSeen !== currentVersion && CHANGELOG[currentVersion]) {
        setVisible(true);
      }
    }).catch(() => {});
  }, [forceVisible, currentVersion]);

  const handleClose = async () => {
    if (!forceVisible) {
      await AsyncStorage.setItem(STORAGE_KEY, currentVersion).catch(() => {});
    }
    setVisible(false);
    onClose?.();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose} />
      <View style={styles.wrapper}>
        <View style={[styles.card, { backgroundColor: C.bg }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.kicker}>Versione {currentVersion}</Text>
            <Text style={styles.title}>🆕 Cosa c'è di nuovo</Text>
          </View>

          {/* Lista novità */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={{ paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {changes.map((item, i) => (
              <View key={i} style={[styles.row, { borderBottomColor: C.border }]}>
                <Text style={styles.rowEmoji}>{item.emoji}</Text>
                <View style={styles.rowBody}>
                  <Text style={[styles.rowTitle, { color: C.text }]}>{item.title}</Text>
                  <Text style={[styles.rowDesc, { color: C.textSecondary }]}>{item.description}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* CTA */}
          <TouchableOpacity style={styles.btn} onPress={handleClose} activeOpacity={0.85}>
            <Text style={styles.btnText}>Inizia a leggere 🚀</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingBottom: 34,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: Colors.violet,
    paddingHorizontal: Spacing.lg,
    paddingTop: 24,
    paddingBottom: 20,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  list: {
    maxHeight: 320,
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowEmoji: {
    fontSize: 22,
    width: 30,
    textAlign: 'center',
    marginTop: 1,
  },
  rowBody: { flex: 1 },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  rowDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  btn: {
    margin: Spacing.lg,
    marginTop: Spacing.md,
    backgroundColor: Colors.violet,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

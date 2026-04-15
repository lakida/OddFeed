import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../theme/colors';
import { MOCK_USER, USER_LEVELS, HOW_TO_EARN } from '../data/mockData';
import { useTranslation } from '../context/LanguageContext';

export default function PointsScreen() {
  const { t } = useTranslation();
  const user = MOCK_USER;
  const currentLevel = user.level;
  const nextLevel = USER_LEVELS[currentLevel.level + 1];

  const progress =
    (user.points - currentLevel.minPoints) /
    (currentLevel.maxPoints - currentLevel.minPoints);

  const pointsToNext = nextLevel ? nextLevel.minPoints - user.points : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.points.title}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Card livello */}
        <View style={styles.levelCard}>
          <View style={styles.levelRow}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeEmoji}>{currentLevel.emoji}</Text>
            </View>
            <View>
              <Text style={styles.levelName}>{t.levels[currentLevel.level] ?? currentLevel.name}</Text>
              <Text style={styles.levelSub}>{t.points.level(currentLevel.level)} · {t.points.totalPoints(user.points)}</Text>
            </View>
          </View>

          {/* Barra progresso */}
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>{user.points} pt</Text>
            <Text style={styles.progressLabel}>
              {nextLevel ? <Text style={styles.bold}>{t.levels[nextLevel.level] ?? nextLevel.name}</Text> : null}
              {nextLevel ? ` — ${nextLevel.minPoints} pt` : ''}
            </Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { flex: Math.min(progress, 1) }]} />
            <View style={{ flex: Math.max(1 - progress, 0) }} />
          </View>
          {nextLevel && (
            <Text style={styles.progressHint}>
              {t.points.progressHint(pointsToNext, t.levels[nextLevel.level] ?? nextLevel.name)}
            </Text>
          )}

          {/* Giorni consecutivi */}
          <View style={styles.streakRow}>
            <View style={styles.streakLeft}>
              <Text style={styles.streakLabel}>{t.points.consecutiveDays}</Text>
              <Text style={styles.streakValue}>{user.streak} giorni</Text>
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>+75 pt</Text>
            </View>
          </View>
        </View>

        {/* Come guadagnare */}
        <Text style={styles.sectionTitle}>{t.points.howToEarn}</Text>
        <View style={styles.card}>
          {HOW_TO_EARN.map((item, i) => (
            <View
              key={i}
              style={[styles.earnItem, i < HOW_TO_EARN.length - 1 && styles.earnItemBorder]}
            >
              <Text style={styles.earnLabel}>{item.label}</Text>
              {item.doneToday && <Text style={styles.doneCheck}>✓</Text>}
              <Text style={styles.earnPts}>+{item.points} pt</Text>
            </View>
          ))}
        </View>

        {/* Sblocchi */}
        <Text style={styles.sectionTitle}>{t.points.unlocks}</Text>
        <View style={styles.card}>
          {USER_LEVELS.map((lvl, i) => {
            const isDone    = user.level.level > lvl.level;
            const isCurrent = user.level.level === lvl.level;
            const isLocked  = user.level.level < lvl.level;
            return (
              <View
                key={lvl.level}
                style={[styles.unlockItem, i < USER_LEVELS.length - 1 && styles.unlockItemBorder]}
              >
                <View style={[
                  styles.unlockCircle,
                  isDone    && styles.unlockDone,
                  isCurrent && styles.unlockCurrent,
                  isLocked  && styles.unlockLocked,
                ]}>
                  <Text style={styles.unlockCircleText}>
                    {isDone ? '✓' : isCurrent ? lvl.emoji : '🔒'}
                  </Text>
                </View>
                <View style={styles.unlockInfo}>
                  <Text style={[styles.unlockName, isLocked && styles.unlockNameLocked]}>
                    {t.levels[lvl.level] ?? lvl.name}
                  </Text>
                  <Text style={styles.unlockDesc}>{lvl.unlock}</Text>
                </View>
                <Text style={[styles.unlockPts, isLocked && styles.unlockPtsLocked]}>
                  {lvl.minPoints === 0 ? '—' : `${lvl.minPoints.toLocaleString()} pt`}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={{ height: 24 }} />
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

  // Card livello
  levelCard: {
    margin: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  levelBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeEmoji: { fontSize: 24 },
  levelName: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  levelSub: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  progressLabel: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  bold: { fontWeight: '700', color: Colors.text },
  progressBg: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    marginBottom: Spacing.xs,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: '#6366F1',
    borderRadius: 3,
  },
  progressHint: {
    fontSize: FontSize.base,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },

  // Giorni consecutivi
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  streakLeft: { gap: 2 },
  streakLabel: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  streakValue: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  streakBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
  },
  streakBadgeText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text,
  },

  // Sezioni
  sectionTitle: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#6366F1',
  },
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },

  // Come guadagnare
  earnItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  earnItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  earnLabel: {
    fontSize: FontSize.base,
    color: Colors.text,
    flex: 1,
  },
  doneCheck: {
    fontSize: FontSize.base,
    color: '#6366F1',
    fontWeight: '700',
    marginRight: 4,
  },
  earnPts: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.textSecondary,
  },

  // Sblocchi
  unlockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  unlockItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  unlockCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockDone: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
  },
  unlockCurrent: { backgroundColor: Colors.text },
  unlockLocked: {
    backgroundColor: Colors.bg,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  unlockCircleText: { fontSize: 15 },
  unlockInfo: { flex: 1 },
  unlockName: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.text,
  },
  unlockNameLocked: { color: Colors.textTertiary },
  unlockDesc: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  unlockPts: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.text,
  },
  unlockPtsLocked: { color: Colors.textTertiary },
});

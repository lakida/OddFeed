import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, getColors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import {
  getRewardedAdUnitId,
  REWARDED_COOLDOWN_MS,
  REWARDED_COOLDOWN_KEY,
  REWARDED_POINTS,
} from '../../ads/adConfig';

/**
 * Import condizionale — graceful fallback se il modulo nativo non è linkato.
 */
let RewardedAd: any       = null;
let RewardedAdEventType: any = null;

try {
  const rngma = require('react-native-google-mobile-ads');
  RewardedAd          = rngma.RewardedAd;
  RewardedAdEventType = rngma.RewardedAdEventType;
} catch (_) {
  // Modulo nativo non ancora linkato
}

interface RewardedAdButtonProps {
  isPremium?: boolean;
  onReward: (points: number) => void;
}

type ButtonState = 'idle' | 'loading' | 'ready' | 'cooldown' | 'unavailable';

/**
 * Bottone "Guarda un video e guadagna 100 punti".
 *
 * - Nessuna pubblicità per utenti Premium (ritorna null)
 * - Cooldown di 24h — non disturba l'utente più di una volta al giorno
 * - Si collassa a null se il modulo nativo non è disponibile
 * - Stato "loading" mentre l'annuncio si carica
 */
export default function RewardedAdButton({ isPremium = false, onReward }: RewardedAdButtonProps) {
  const [state, setState]   = useState<ButtonState>('idle');
  const [cooldownLeft, setCooldownLeft] = useState('');
  const rewardedRef = useRef<any>(null);
  const listenersRef = useRef<(() => void)[]>([]);
  const { isDark } = useTheme();
  const C = getColors(isDark);

  // Pulisce i listener precedenti
  const cleanupListeners = () => {
    listenersRef.current.forEach(unsub => { try { unsub(); } catch {} });
    listenersRef.current = [];
  };

  // Controlla cooldown al mount
  useEffect(() => {
    if (isPremium || !RewardedAd) return;
    checkCooldown();
  }, [isPremium]);

  const checkCooldown = async (): Promise<boolean> => {
    try {
      const lastTs = await AsyncStorage.getItem(REWARDED_COOLDOWN_KEY);
      if (lastTs) {
        const elapsed = Date.now() - parseInt(lastTs, 10);
        if (elapsed < REWARDED_COOLDOWN_MS) {
          const msLeft = REWARDED_COOLDOWN_MS - elapsed;
          const hoursLeft = Math.ceil(msLeft / (60 * 60 * 1000));
          setCooldownLeft(`${hoursLeft}h`);
          setState('cooldown');
          return false;
        }
      }
    } catch {}
    return true;
  };

  const loadAd = async () => {
    if (!RewardedAd || !RewardedAdEventType) {
      setState('unavailable');
      return;
    }

    const canShow = await checkCooldown();
    if (!canShow) return;

    setState('loading');
    cleanupListeners();

    try {
      const rewarded = RewardedAd.createForAdRequest(getRewardedAdUnitId(), {
        requestNonPersonalizedAdsOnly: true,
      });
      rewardedRef.current = rewarded;

      const unsubLoaded = rewarded.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => setState('ready'),
      );
      const unsubError = rewarded.addAdEventListener(
        RewardedAdEventType.ERROR,
        () => setState('unavailable'),
      );
      const unsubEarned = rewarded.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        async () => {
          try {
            await AsyncStorage.setItem(REWARDED_COOLDOWN_KEY, String(Date.now()));
          } catch {}
          onReward(REWARDED_POINTS);
          setState('cooldown');
          setCooldownLeft('24h');
        },
      );

      listenersRef.current = [unsubLoaded, unsubError, unsubEarned];
      rewarded.load();
    } catch {
      setState('unavailable');
    }
  };

  const showAd = async () => {
    if (state === 'idle') {
      await loadAd();
      return;
    }
    if (state !== 'ready' || !rewardedRef.current) return;
    try {
      await rewardedRef.current.show();
    } catch {
      setState('unavailable');
    }
  };

  if (isPremium) return null;
  if (!RewardedAd) return null;

  const isDisabled = state === 'loading' || state === 'cooldown' || state === 'unavailable';

  const buttonLabel = () => {
    switch (state) {
      case 'loading':    return 'Caricamento...';
      case 'ready':      return 'Guarda ora e guadagna 100 pt →';
      case 'cooldown':   return `Già visto oggi — riprova tra ${cooldownLeft}`;
      case 'unavailable': return 'Annuncio non disponibile';
      default:           return 'Guarda un video → +100 pt';
    }
  };

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: isDark ? '#1e1b4b' : '#F0F4FF',
        borderColor: isDark ? '#3730a3' : '#C7D2FE',
      },
    ]}>
      <View style={styles.header}>
        <Text style={styles.emoji}>🎬</Text>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: C.text }]}>Guadagna guardando un video</Text>
          <Text style={[styles.sub, { color: C.textSecondary }]}>
            {state === 'cooldown'
              ? `Hai già guadagnato i tuoi punti oggi.`
              : `+${REWARDED_POINTS} punti · max 1 video al giorno`}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.btn,
          isDisabled && { backgroundColor: isDark ? '#374151' : '#E5E7EB' },
        ]}
        onPress={showAd}
        activeOpacity={0.75}
        disabled={isDisabled}
      >
        {state === 'loading' ? (
          <ActivityIndicator size="small" color={isDark ? '#9ca3af' : '#fff'} />
        ) : null}
        <Text style={[
          styles.btnText,
          isDisabled && { color: isDark ? '#6B7280' : '#9CA3AF' },
        ]}>
          {buttonLabel()}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  emoji: {
    fontSize: 28,
    lineHeight: 34,
  },
  headerText: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  sub: {
    fontSize: 12,
    lineHeight: 17,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.violet,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});

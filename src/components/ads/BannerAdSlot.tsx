import React, { useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { getBannerAdUnitId } from '../../ads/adConfig';

/**
 * Import condizionale — il modulo nativo non è disponibile finché non c'è
 * una nuova build EAS. Se il require fallisce, il componente ritorna null
 * senza crashare l'app.
 */
let BannerAd: any = null;
let BannerAdSize: any = null;

try {
  const rngma = require('react-native-google-mobile-ads');
  BannerAd   = rngma.BannerAd;
  BannerAdSize = rngma.BannerAdSize;
} catch (_) {
  // Modulo nativo non ancora linkato — fallback silenzioso
}

interface BannerAdSlotProps {
  isPremium?: boolean;
  style?: ViewStyle;
}

/**
 * Banner AdMob (320×50).
 * - Nessuna pubblicità per utenti Premium
 * - Si collassa a null se il modulo nativo non è disponibile o l'annuncio non carica
 * - Nessuno spazio vuoto in caso di errore
 */
export default function BannerAdSlot({ isPremium = false, style }: BannerAdSlotProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (isPremium) return null;
  if (!BannerAd || !BannerAdSize) return null;
  if (failed) return null;

  return (
    <View style={[styles.wrap, !loaded && styles.hidden, style]}>
      <BannerAd
        unitId={getBannerAdUnitId()}
        size={BannerAdSize.BANNER}
        onAdLoaded={() => setLoaded(true)}
        onAdFailedToLoad={() => setFailed(true)}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  // Prima che l'annuncio sia caricato non occupa spazio
  hidden: {
    height: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },
});

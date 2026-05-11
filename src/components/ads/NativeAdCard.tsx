import React, { useState } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../theme/colors';
import { getNativeAdUnitId } from '../../ads/adConfig';

/**
 * Import condizionale — graceful fallback se il modulo nativo non è linkato.
 */
let BannerAd: any = null;
let BannerAdSize: any = null;

try {
  const rngma = require('react-native-google-mobile-ads');
  BannerAd     = rngma.BannerAd;
  BannerAdSize = rngma.BannerAdSize;
} catch (_) {
  // Modulo nativo non ancora linkato
}

interface NativeAdCardProps {
  isPremium?: boolean;
  style?: ViewStyle;
}

/**
 * Card sponsorizzata iniettata ogni N notizie nella lista.
 * Usa un BannerAd MEDIUM_RECTANGLE (300×250) racchiuso in un wrapper
 * stilizzato come le news card con badge "Sponsor".
 *
 * - Nessuna pubblicità per utenti Premium
 * - Si collassa a null se il modulo non è disponibile o l'annuncio non carica
 * - Nessuno spazio vuoto in caso di fallback
 */
export default function NativeAdCard({ isPremium = false, style }: NativeAdCardProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (isPremium) return null;
  if (!BannerAd || !BannerAdSize) return null;
  if (failed) return null;

  return (
    <View style={[styles.container, !loaded && styles.hidden, style]}>
      {/* Badge sponsor */}
      {loaded && (
        <View style={styles.sponsorRow}>
          <View style={styles.sponsorBadge}>
            <Text style={styles.sponsorText}>SPONSOR</Text>
          </View>
        </View>
      )}

      {/* Ad content */}
      <View style={styles.adWrap}>
        <BannerAd
          unitId={getNativeAdUnitId()}
          size={BannerAdSize.MEDIUM_RECTANGLE}
          onAdLoaded={() => setLoaded(true)}
          onAdFailedToLoad={() => setFailed(true)}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 14,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
    backgroundColor: Colors.bg2,
    overflow: 'hidden',
  },
  hidden: {
    height: 0,
    marginVertical: 0,
    overflow: 'hidden',
  },
  sponsorRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
  },
  sponsorBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  sponsorText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 0.8,
  },
  adWrap: {
    alignItems: 'center',
    paddingBottom: 8,
  },
});

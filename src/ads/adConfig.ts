import { Platform } from 'react-native';

/**
 * OddFeed — Configurazione AdMob
 *
 * In DEV usa sempre i Google Test IDs per evitare policy violations.
 * Per la produzione, crea gli ad unit su console.admob.google.com e
 * sostituisci i segnaposto XXXXXXXXXX con i tuoi ID reali.
 */

// ─── App IDs (configurati anche in app.json sotto il plugin) ─────────────────
// Test App IDs ufficiali di Google (per sviluppo / staging):
export const ADMOB_APP_ID_IOS     = 'ca-app-pub-3940256099942544~1458002511';
export const ADMOB_APP_ID_ANDROID = 'ca-app-pub-3940256099942544~3347511713';
// TODO produzione:
// export const ADMOB_APP_ID_IOS     = 'ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX';
// export const ADMOB_APP_ID_ANDROID = 'ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX';

// ─── Flag test ────────────────────────────────────────────────────────────────
// In produzione puoi usare una variabile env o __DEV__
export const IS_TEST_ADS = __DEV__;

// ─── Ad Unit IDs ──────────────────────────────────────────────────────────────
const TEST = {
  BANNER_IOS:          'ca-app-pub-3940256099942544/2934735716',
  BANNER_ANDROID:      'ca-app-pub-3940256099942544/6300978111',
  REWARDED_IOS:        'ca-app-pub-3940256099942544/1712485313',
  REWARDED_ANDROID:    'ca-app-pub-3940256099942544/5224354917',
  NATIVE_IOS:          'ca-app-pub-3940256099942544/3986624511',
  NATIVE_ANDROID:      'ca-app-pub-3940256099942544/2247696110',
};

const PROD = {
  BANNER_IOS:          'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',   // TODO
  BANNER_ANDROID:      'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',   // TODO
  REWARDED_IOS:        'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',   // TODO
  REWARDED_ANDROID:    'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',   // TODO
  NATIVE_IOS:          'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',   // TODO
  NATIVE_ANDROID:      'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',   // TODO
};

const IDS = IS_TEST_ADS ? TEST : PROD;

export const getBannerAdUnitId   = () => Platform.OS === 'ios' ? IDS.BANNER_IOS    : IDS.BANNER_ANDROID;
export const getRewardedAdUnitId = () => Platform.OS === 'ios' ? IDS.REWARDED_IOS  : IDS.REWARDED_ANDROID;
export const getNativeAdUnitId   = () => Platform.OS === 'ios' ? IDS.NATIVE_IOS    : IDS.NATIVE_ANDROID;

// ─── Rewarded ad cooldown (24h) ───────────────────────────────────────────────
export const REWARDED_COOLDOWN_MS  = 24 * 60 * 60 * 1000;
export const REWARDED_COOLDOWN_KEY = '@oddFeed_lastRewardedTs';

// ─── Punti guadagnati guardando un video ─────────────────────────────────────
export const REWARDED_POINTS = 100;

// ─── Frequenza native ads nella lista notizie ─────────────────────────────────
export const NATIVE_AD_EVERY_N = 6;

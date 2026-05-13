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
const ADMOB_APP_ID_IOS_TEST     = 'ca-app-pub-3940256099942544~1458002511';
const ADMOB_APP_ID_ANDROID_TEST = 'ca-app-pub-3940256099942544~3347511713';
// Produzione:
const ADMOB_APP_ID_IOS_PROD     = 'ca-app-pub-2396272435294555~5922806904';
const ADMOB_APP_ID_ANDROID_PROD = 'ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX'; // TODO Android

export const ADMOB_APP_ID_IOS     = __DEV__ ? ADMOB_APP_ID_IOS_TEST     : ADMOB_APP_ID_IOS_PROD;
export const ADMOB_APP_ID_ANDROID = __DEV__ ? ADMOB_APP_ID_ANDROID_TEST : ADMOB_APP_ID_ANDROID_PROD;

// ─── Flag test ────────────────────────────────────────────────────────────────
// In produzione puoi usare una variabile env o __DEV__
export const IS_TEST_ADS = __DEV__;

// ─── Ad Unit IDs ──────────────────────────────────────────────────────────────
const TEST = {
  BANNER_IOS:           'ca-app-pub-3940256099942544/2934735716',
  BANNER_ANDROID:       'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL_IOS:     'ca-app-pub-3940256099942544/4411468910',
  INTERSTITIAL_ANDROID: 'ca-app-pub-3940256099942544/1033173712',
  REWARDED_IOS:         'ca-app-pub-3940256099942544/1712485313',
  REWARDED_ANDROID:     'ca-app-pub-3940256099942544/5224354917',
  NATIVE_IOS:           'ca-app-pub-3940256099942544/3986624511',
  NATIVE_ANDROID:       'ca-app-pub-3940256099942544/2247696110',
};

const PROD = {
  BANNER_IOS:           'ca-app-pub-2396272435294555/5071320274',
  BANNER_ANDROID:       'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',   // TODO Android
  INTERSTITIAL_IOS:     'ca-app-pub-2396272435294555/8818993599',
  INTERSTITIAL_ANDROID: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',   // TODO Android
  REWARDED_IOS:         'ca-app-pub-2396272435294555/3669390103',
  REWARDED_ANDROID:     'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',   // TODO Android
  NATIVE_IOS:           'ca-app-pub-2396272435294555/4688176894',
  NATIVE_ANDROID:       'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',   // TODO Android
};

const IDS = IS_TEST_ADS ? TEST : PROD;

export const getBannerAdUnitId       = () => Platform.OS === 'ios' ? IDS.BANNER_IOS        : IDS.BANNER_ANDROID;
export const getInterstitialAdUnitId = () => Platform.OS === 'ios' ? IDS.INTERSTITIAL_IOS  : IDS.INTERSTITIAL_ANDROID;
export const getRewardedAdUnitId     = () => Platform.OS === 'ios' ? IDS.REWARDED_IOS       : IDS.REWARDED_ANDROID;
export const getNativeAdUnitId       = () => Platform.OS === 'ios' ? IDS.NATIVE_IOS         : IDS.NATIVE_ANDROID;

// ─── Rewarded ad cooldown (24h) ───────────────────────────────────────────────
export const REWARDED_COOLDOWN_MS  = 24 * 60 * 60 * 1000;
export const REWARDED_COOLDOWN_KEY = '@oddFeed_lastRewardedTs';

// ─── Punti guadagnati guardando un video ─────────────────────────────────────
export const REWARDED_POINTS = 100;

// ─── Frequenza native ads nella lista notizie ─────────────────────────────────
export const NATIVE_AD_EVERY_N = 6;

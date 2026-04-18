/**
 * Credenziali OAuth per Google e Facebook.
 *
 * COME OTTENERLE:
 *
 * GOOGLE WEB CLIENT ID:
 *   Firebase Console → Authentication → Sign-in methods → Google
 *   → Espandi "Configurazione SDK Web" → copia "ID client web"
 *   Formato: XXXXXXXXXX-xxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
 *
 * GOOGLE IOS CLIENT ID:
 *   Firebase Console → Project settings → Le tue app → app iOS
 *   → Scarica GoogleService-Info.plist → apri con testo → cerca CLIENT_ID
 *   Formato: XXXXXXXXXX-xxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
 *
 * FACEBOOK APP ID:
 *   https://developers.facebook.com → Le mie app → la tua app → Dashboard
 *   → copia "ID app" (numero come 1234567890123456)
 *   NB: devi anche aggiungere l'App ID e il segreto in:
 *   Firebase Console → Authentication → Sign-in methods → Facebook
 */

export const GOOGLE_WEB_CLIENT_ID =
  '272354842276-ip86npl2ktn038ubapabchdicp6ujaf8.apps.googleusercontent.com';

export const GOOGLE_IOS_CLIENT_ID =
  'INCOLLA_QUI_IL_GOOGLE_IOS_CLIENT_ID';

export const FACEBOOK_APP_ID =
  'INCOLLA_QUI_IL_FACEBOOK_APP_ID';

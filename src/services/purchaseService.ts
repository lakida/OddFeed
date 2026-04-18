/**
 * OddFeed — Servizio acquisti Premium con RevenueCat
 *
 * SETUP NECESSARIO prima di attivare:
 * 1. Crea account su revenuecat.com
 * 2. Crea app iOS e Android su RevenueCat
 * 3. Crea i prodotti su App Store Connect e Google Play Console:
 *    - oddfeed_premium_monthly  → 1,99 €/mese
 *    - oddfeed_premium_yearly   → 14,99 €/anno
 * 4. Collega i prodotti a RevenueCat
 * 5. Sostituisci REVENUECAT_API_KEY_IOS e REVENUECAT_API_KEY_ANDROID
 *
 * INSTALLAZIONE SDK (richiede development build, non Expo Go):
 * npx expo install react-native-purchases
 */

// ─── Identificatori prodotti (devono corrispondere a App Store / Google Play) ──
export const PRODUCT_IDS = {
  monthly: 'oddfeed_premium_monthly',
  yearly:  'oddfeed_premium_yearly',
};

// ─── Chiavi API RevenueCat (da sostituire quando hai l'account) ────────────────
const REVENUECAT_API_KEY_IOS     = 'test_nhHnVAPEkKCxaoPTtGHucxjxQvA';
const REVENUECAT_API_KEY_ANDROID = 'YOUR_REVENUECAT_ANDROID_KEY'; // goog_...

// ─── Flag per attivare RevenueCat (false = usa mock, true = reale) ─────────────
const REVENUECAT_ENABLED = false;

// ─── Tipi ─────────────────────────────────────────────────────────────────────
export interface PurchasePackage {
  identifier: string;
  priceString: string;
  product: {
    title: string;
    description: string;
  };
}

// ─── Funzioni mock (usate finché RevenueCat non è attivo) ─────────────────────

async function mockGetOfferings(): Promise<PurchasePackage[]> {
  return [
    {
      identifier: PRODUCT_IDS.monthly,
      priceString: '€1,99',
      product: { title: 'OddFeed Premium Mensile', description: '1 mese' },
    },
    {
      identifier: PRODUCT_IDS.yearly,
      priceString: '€14,99',
      product: { title: 'OddFeed Premium Annuale', description: '1 anno' },
    },
  ];
}

// ─── API pubblica del servizio ─────────────────────────────────────────────────

/**
 * Inizializza RevenueCat — chiamato all'avvio dell'app
 */
export async function initializePurchases(userId: string): Promise<void> {
  if (!REVENUECAT_ENABLED) return;

  try {
    const Purchases = require('react-native-purchases').default;
    const { Platform } = require('react-native');

    const apiKey = Platform.OS === 'ios'
      ? REVENUECAT_API_KEY_IOS
      : REVENUECAT_API_KEY_ANDROID;

    await Purchases.configure({ apiKey });
    await Purchases.logIn(userId);
  } catch (e) {
    console.warn('RevenueCat non disponibile:', e);
  }
}

/**
 * Ottieni i pacchetti disponibili (mensile/annuale)
 */
export async function getOfferings(): Promise<PurchasePackage[]> {
  if (!REVENUECAT_ENABLED) return mockGetOfferings();

  try {
    const Purchases = require('react-native-purchases').default;
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return [];

    return current.availablePackages.map((pkg: any) => ({
      identifier: pkg.identifier,
      priceString: pkg.product.priceString,
      product: {
        title: pkg.product.title,
        description: pkg.product.description,
      },
    }));
  } catch (e) {
    return mockGetOfferings();
  }
}

/**
 * Acquista un pacchetto
 * @returns true se l'acquisto è andato a buon fine
 */
export async function purchasePackage(identifier: string): Promise<boolean> {
  if (!REVENUECAT_ENABLED) {
    // Mock: simula acquisto riuscito
    console.log('Mock acquisto:', identifier);
    return true;
  }

  try {
    const Purchases = require('react-native-purchases').default;
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages.find(
      (p: any) => p.identifier === identifier
    );
    if (!pkg) return false;

    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo.entitlements.active['premium'] !== undefined;
  } catch (e: any) {
    if (e.userCancelled) return false;
    throw e;
  }
}

/**
 * Ripristina acquisti precedenti
 */
export async function restorePurchases(): Promise<boolean> {
  if (!REVENUECAT_ENABLED) return false;

  try {
    const Purchases = require('react-native-purchases').default;
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo.entitlements.active['premium'] !== undefined;
  } catch (e) {
    return false;
  }
}

/**
 * Verifica se l'utente ha Premium attivo
 */
export async function checkPremiumStatus(): Promise<boolean> {
  if (!REVENUECAT_ENABLED) return false;

  try {
    const Purchases = require('react-native-purchases').default;
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active['premium'] !== undefined;
  } catch (e) {
    return false;
  }
}

/**
 * Annulla abbonamento (apre le impostazioni dello store)
 */
export async function openManageSubscriptions(): Promise<void> {
  if (!REVENUECAT_ENABLED) return;

  try {
    const Purchases = require('react-native-purchases').default;
    await Purchases.showManageSubscriptions();
  } catch (e) {
    // Fallback: apri impostazioni
    const { Linking } = require('react-native');
    Linking.openURL('https://apps.apple.com/account/subscriptions');
  }
}

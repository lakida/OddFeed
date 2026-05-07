#!/usr/bin/env node
/**
 * OddFeed — Invia notifiche push per uno slot specifico.
 *
 * Uso:  node scripts/send-notifications.js lunch
 *       node scripts/send-notifications.js evening
 *       node scripts/send-notifications.js morning   (di default)
 *
 * Questo script è complementare a fetch-news.js:
 * - fetch-news.js  →  genera notizie + invia notifiche fascia Colazione (ore 7)
 * - send-notifications.js lunch   → ore 14, utenti con fascia Pranzo + Premium
 * - send-notifications.js evening → ore 17-21, utenti con fascia Pomeriggio/Cena + Premium
 *
 * Crontab suggerito (MacOS/Linux):
 *   0  7 * * *  /path/to/run-daily.sh        # genera notizie + invia Colazione
 *   0 14 * * *  node /path/send-notifications.js lunch
 *   0 17 * * *  node /path/send-notifications.js evening
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// ─── Argomento slot ────────────────────────────────────────────────
const slot = process.argv[2] ?? 'morning';
if (!['morning', 'lunch', 'evening'].includes(slot)) {
  console.error(`❌ Slot non valido: "${slot}". Usa morning | lunch | evening`);
  process.exit(1);
}

// ─── Inizializza Firebase Admin ────────────────────────────────────
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
} else {
  serviceAccount = JSON.parse(
    require('fs').readFileSync(
      process.env.FIREBASE_SERVICE_ACCOUNT || './firebase-service-account.json',
      'utf8'
    )
  );
}
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ─── Mappa slot → fascia utente (IT + EN) ─────────────────────────
const SLOT_LABELS = {
  morning: ['Colazione', 'Breakfast'],
  lunch:   ['Pranzo',    'Lunch'],
  evening: ['Pomeriggio','Afternoon', 'Cena', 'Dinner'],
};

const SLOT_FIELD = {
  morning: 'lastNotifMorning',
  lunch:   'lastNotifLunch',
  evening: 'lastNotifEvening',
};

const SLOT_ARTICLE_INDEX = {
  morning: 0,
  lunch:   1,
  evening: 2,
};

const EMOJI_MAP = {
  sesso_relazioni: '💋', gossip: '🌟', crimini_strani: '🔪',
  storie_assurde: '🤪', psicologia_strana: '🧠', soldi_folli: '💸',
  coincidenze: '🌀', tecnologia: '💻', record: '🏆',
  animali: '🐾', scienza: '🔬', leggi: '⚖️',
  cultura: '🌍', gastronomia: '🍽️', luoghi: '📍',
  attualita: '📰', gossip_spettacolo: '🌟',
};

// ─── Funzioni helper ──────────────────────────────────────────────

function findBestArticle(articles, interests, isPremium, articleIndex = 0) {
  const accessible = isPremium ? articles : articles.filter(a => !a.isPremium);
  if (interests.length === 0) return accessible[articleIndex] ?? accessible[0] ?? null;
  const interestSet = new Set(interests);
  const ranked = [
    ...accessible.filter(a => interestSet.has(a.category)),
    ...accessible.filter(a => !interestSet.has(a.category)),
  ];
  return ranked[articleIndex] ?? ranked[0] ?? null;
}

function buildNotifText(article, isPremium) {
  const emoji = EMOJI_MAP[article.category] ?? '📰';
  const titleText = (article.titleIt ?? 'Notizia del giorno').substring(0, 60);
  if (isPremium) {
    return {
      title: titleText,
      body: `${emoji} La tua storia premium di oggi è pronta.`,
    };
  }
  return {
    title: `${emoji} ${titleText}`,
    body: 'La tua notizia curiosa ti aspetta. Aprila adesso.',
  };
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`\n📬 OddFeed — Notifiche slot "${slot}" per ${today}`);

  // Carica articoli di oggi
  const articlesSnap = await db.collection('articles')
    .where('date', '==', today)
    .get();

  if (articlesSnap.empty) {
    console.log('   ⚠️ Nessun articolo trovato per oggi. Aborto.');
    process.exit(0);
  }

  const articles = articlesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`   ${articles.length} articoli trovati.`);

  // Carica utenti con notifiche attive
  const usersSnap = await db.collection('users')
    .where('notificationsEnabled', '==', true)
    .get();

  if (usersSnap.empty) {
    console.log('   Nessun utente con notifiche attive.');
    process.exit(0);
  }

  const slotLabels  = SLOT_LABELS[slot];
  const slotField   = SLOT_FIELD[slot];
  const articleIdx  = SLOT_ARTICLE_INDEX[slot];

  const messages = [];

  for (const userDoc of usersSnap.docs) {
    const user       = userDoc.data();
    const userId     = userDoc.id;
    const token      = user.expoPushToken;
    const userIsPrem = user.isPremium ?? false;
    const userSlot   = user.notificationSlot ?? 'Colazione';
    const interests  = user.interests ?? [];

    if (!token || !token.startsWith('ExponentPushToken[')) continue;

    // Free: invia solo nella fascia scelta e una volta al giorno
    if (!userIsPrem) {
      if (!slotLabels.includes(userSlot)) continue;
      if (user.lastNotifDate === today) continue; // già notificato oggi
    }
    // Premium: invia in ogni fascia, ma non ripetere lo stesso slot
    if (userIsPrem && user[slotField] === today) continue;

    const article = findBestArticle(articles, interests, userIsPrem, articleIdx);
    if (!article) continue;

    const { title, body } = buildNotifText(article, userIsPrem);

    messages.push({
      userId,
      isPremium: userIsPrem,
      message: {
        to: token,
        title,
        body,
        sound: 'default',
        badge: 1,
        data: {
          type: 'daily_news',
          newsId: article.id,
          category: article.category,
          screen: 'Article',
          date: today,
        },
      },
    });
  }

  if (messages.length === 0) {
    console.log('   Nessuna notifica da inviare per questo slot.');
    process.exit(0);
  }

  console.log(`   Invio a ${messages.length} utenti...`);

  // Invia in batch da 100 (limite Expo Push API)
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chunk.map(m => m.message)),
    });

    const result = await res.json();
    const errors = (result.data ?? []).filter(r => r.status === 'error');
    console.log(`   ✓ Inviate: ${chunk.length - errors.length}, ⚠️ Fallite: ${errors.length}`);
    if (errors.length > 0) {
      errors.slice(0, 3).forEach(e => console.log(`     - ${e.message}`));
    }

    // Aggiorna tracking su Firestore
    const batch = db.batch();
    chunk.forEach(({ userId, isPremium: userIsPrem }) => {
      const update = userIsPrem
        ? { [slotField]: today }
        : { lastNotifDate: today };
      batch.update(db.collection('users').doc(userId), update);
    });
    await batch.commit();
  }

  console.log(`\n✅ Slot "${slot}" completato.`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Errore:', err.message);
  process.exit(1);
});

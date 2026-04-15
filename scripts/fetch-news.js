#!/usr/bin/env node
/**
 * OddFeed — Script giornaliero per generare notizie reali
 *
 * Uso: node scripts/fetch-news.js
 *
 * Cosa fa:
 * 1. Chiama Guardian API per le notizie più curiose/strane del giorno
 * 2. Usa GPT-4o mini per riscrivere ogni notizia in italiano e inglese
 * 3. Salva tutto su Firebase Firestore
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { OpenAI } = require('openai');

// ─── Configurazione ────────────────────────────────────────────────
const GUARDIAN_KEY   = process.env.GUARDIAN_KEY;
const OPENAI_KEY     = process.env.OPENAI_KEY;
const FIREBASE_SA    = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!GUARDIAN_KEY || !OPENAI_KEY) {
  console.error('❌ Mancano GUARDIAN_KEY o OPENAI_KEY nel file .env');
  process.exit(1);
}

// ─── Inizializza Firebase Admin ────────────────────────────────────
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  // Variabile d'ambiente (produzione cloud)
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
} else {
  // File locale (sviluppo Mac)
  serviceAccount = JSON.parse(require('fs').readFileSync(FIREBASE_SA || './firebase-service-account.json', 'utf8'));
}
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ─── Inizializza OpenAI ────────────────────────────────────────────
const openai = new OpenAI({ apiKey: OPENAI_KEY });

// ─── Sezioni Guardian più "curiose" ───────────────────────────────
const GUARDIAN_QUERIES = [
  'weird OR bizarre OR unusual OR strange OR odd',
  'animals behavior OR animal funny OR animal surprising',
  'record OR world record OR first ever',
  'science discovery OR science surprising',
  'technology unusual OR invention odd',
];

// ─── Funzione: cerca notizie su Guardian ──────────────────────────
async function fetchGuardianNews(query, maxResults = 5) {
  const url = `https://content.guardianapis.com/search?` +
    `q=${encodeURIComponent(query)}&` +
    `show-fields=headline,trailText,thumbnail&` +
    `order-by=newest&` +
    `page-size=${maxResults}&` +
    `api-key=${GUARDIAN_KEY}`;

  const res = await fetch(url);
  const data = await res.json();
  return data.response?.results ?? [];
}

// ─── Funzione: rielabora con GPT-4o mini ──────────────────────────
async function rewriteWithAI(article) {
  const prompt = `Sei il redattore di OddFeed, un'app italiana di notizie curiose e strane dal mondo.

Devi riscrivere questo articolo del Guardian in stile OddFeed: breve, coinvolgente, con un tono leggermente ironico ma informativo.

Articolo originale:
Titolo: ${article.fields?.headline ?? article.webTitle}
Sommario: ${article.fields?.trailText ?? ''}

Rispondi SOLO con un JSON valido in questo formato esatto:
{
  "titleIt": "Titolo in italiano (max 80 caratteri, curioso e diretto)",
  "titleEn": "Title in English (max 80 chars, curious and direct)",
  "descriptionIt": "Descrizione breve in italiano (2-3 frasi, max 200 caratteri)",
  "descriptionEn": "Short description in English (2-3 sentences, max 200 chars)",
  "fullTextIt": "Testo completo in italiano (3-4 paragrafi da 60-80 parole ognuno, separati da \\n\\n)",
  "fullTextEn": "Full text in English (3-4 paragraphs of 60-80 words each, separated by \\n\\n)",
  "category": "una di: animali|scienza|tecnologia|record|leggi|natura|spazio|storia|mistero|cibo|persone|luoghi",
  "categoryLabelIt": "es. 🐾 Animali",
  "categoryLabelEn": "es. 🐾 Animals"
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 1000,
  });

  const raw = completion.choices[0].message.content ?? '{}';
  // Rimuovi eventuali backtick markdown
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(clean);
}

// ─── Mappa sezione Guardian → paese/fonte ─────────────────────────
function guessCountry(article) {
  const text = (article.sectionName + ' ' + article.webTitle).toLowerCase();
  if (text.includes('japan') || text.includes('japan'))    return '🇯🇵 Giappone';
  if (text.includes('australia'))                          return '🇦🇺 Australia';
  if (text.includes('uk') || text.includes('britain'))     return '🇬🇧 UK';
  if (text.includes('us') || text.includes('america'))     return '🇺🇸 USA';
  if (text.includes('germany') || text.includes('german')) return '🇩🇪 Germania';
  if (text.includes('france') || text.includes('french'))  return '🇫🇷 Francia';
  if (text.includes('italy') || text.includes('italian'))  return '🇮🇹 Italia';
  if (text.includes('china') || text.includes('chinese'))  return '🇨🇳 Cina';
  return '🌍 Mondo';
}

// ─── Funzione principale ───────────────────────────────────────────
async function main() {
  console.log('🚀 OddFeed — Generazione notizie del giorno\n');

  // Oggi come stringa YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];

  // Controlla se le notizie di oggi esistono già
  const existing = await db.collection('articles')
    .where('date', '==', today)
    .get();

  if (!existing.empty) {
    console.log(`ℹ️  Le notizie per oggi (${today}) esistono già su Firestore.`);
    console.log('   Usa --force per sovrascriverle.');
    if (!process.argv.includes('--force')) process.exit(0);
  }

  // Raccoglie articoli da Guardian
  console.log('📰 Recupero notizie da Guardian API...');
  const allArticles = [];
  for (const query of GUARDIAN_QUERIES) {
    const results = await fetchGuardianNews(query, 3);
    allArticles.push(...results);
    await new Promise(r => setTimeout(r, 200)); // rate limiting
  }

  // Deduplica per URL
  const seen = new Set();
  const unique = allArticles.filter(a => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  console.log(`   → Trovati ${unique.length} articoli unici`);

  // Prende i primi N articoli (1 free, fino a 5 premium)
  const MAX_ARTICLES = 5;
  const selected = unique.slice(0, MAX_ARTICLES);

  // Processa con AI e salva su Firestore
  console.log('\n🤖 Rielaborazione con GPT-4o mini...');
  const batch = db.batch();

  for (let i = 0; i < selected.length; i++) {
    const article = selected[i];
    process.stdout.write(`   [${i + 1}/${selected.length}] ${article.webTitle.substring(0, 60)}...`);

    try {
      const ai = await rewriteWithAI(article);

      const docRef = db.collection('articles').doc();
      batch.set(docRef, {
        // Contenuto bilingue
        titleIt: ai.titleIt,
        titleEn: ai.titleEn,
        descriptionIt: ai.descriptionIt,
        descriptionEn: ai.descriptionEn,
        fullTextIt: ai.fullTextIt,
        fullTextEn: ai.fullTextEn,

        // Metadati
        category: ai.category,
        categoryLabelIt: ai.categoryLabelIt,
        categoryLabelEn: ai.categoryLabelEn,
        country: guessCountry(article),
        source: 'The Guardian',
        sourceUrl: article.webUrl,
        date: today,
        isToday: i === 0, // Solo la prima è "di oggi"
        order: i,         // Ordine di visualizzazione
        isPremium: i > 0, // La prima è free, le altre richiedono premium
        daysAgo: 0,

        // Reazioni (iniziali)
        reactions: [
          { emoji: '🤯', count: 0, label: 'Sconvolto' },
          { emoji: '😮', count: 0, label: 'Sorpreso' },
          { emoji: '😂', count: 0, label: 'Divertente' },
          { emoji: '🤔', count: 0, label: 'Interessante' },
          { emoji: '❤️', count: 0, label: 'Adoro' },
        ],

        createdAt: new Date(),
      });

      process.stdout.write(' ✓\n');
      await new Promise(r => setTimeout(r, 500)); // Rate limiting OpenAI
    } catch (e) {
      process.stdout.write(` ✗ (${e.message})\n`);
    }
  }

  await batch.commit();
  console.log(`\n✅ ${selected.length} notizie salvate su Firestore per il ${today}!`);

  // Invia notifica push a tutti gli utenti registrati
  console.log('\n🔔 Invio notifiche push...');
  const firstArticle = selected[0];
  const aiTitle = await rewriteWithAI(firstArticle).catch(() => null);
  const notifTitle = aiTitle?.titleIt ?? 'OddFeed — Notizia del giorno';
  const notifBody = aiTitle?.descriptionIt?.substring(0, 100) ?? 'La tua notizia curiosa di oggi è pronta!';

  await sendPushNotifications(notifTitle, notifBody);
  console.log('   L\'app mostrerà automaticamente i nuovi contenuti.');
}

// ─── Invia notifiche Expo a tutti gli utenti ──────────────────────
async function sendPushNotifications(title, body) {
  // Leggi tutti i token da Firestore
  const usersSnap = await db.collection('users')
    .where('notificationsEnabled', '==', true)
    .where('expoPushToken', '!=', null)
    .get();

  if (usersSnap.empty) {
    console.log('   Nessun utente con notifiche attive.');
    return;
  }

  const tokens = usersSnap.docs
    .map(d => d.data().expoPushToken)
    .filter(Boolean);

  console.log(`   Invio a ${tokens.length} dispositivi...`);

  // Invia in batch da 100 (limite Expo)
  const chunks = [];
  for (let i = 0; i < tokens.length; i += 100) {
    chunks.push(tokens.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    const messages = chunk.map(token => ({
      to: token,
      title: `📰 ${title}`,
      body,
      sound: 'default',
      badge: 1,
      data: { type: 'daily_news', date: new Date().toISOString().split('T')[0] },
    }));

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await res.json();
    const errors = result.data?.filter(r => r.status === 'error') ?? [];
    if (errors.length > 0) {
      console.log(`   ⚠️  ${errors.length} notifiche fallite`);
    } else {
      console.log(`   ✓ ${chunk.length} notifiche inviate`);
    }
  }
}

main().catch(console.error);

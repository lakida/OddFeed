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

// ─── Query Guardian per categoria ─────────────────────────────────
// Ogni query è associata a una categoria OddFeed
const GUARDIAN_QUERIES = [
  // HIGH engagement
  { query: 'sex relationship bizarre OR unusual couple love strange', category: 'sesso_relazioni' },
  { query: 'celebrity gossip scandal shocking star famous', category: 'gossip' },
  { query: 'crime bizarre unusual theft robbery weird criminal', category: 'crimini_strani' },
  { query: 'weird bizarre absurd unusual story incredible', category: 'storie_assurde' },
  // MEDIUM engagement
  { query: 'psychology study human behavior surprising brain', category: 'psicologia_strana' },
  { query: 'money millionaire bizarre spending rich absurd', category: 'soldi_folli' },
  { query: 'coincidence incredible unlikely chance fate', category: 'coincidenze' },
  { query: 'technology invention unusual gadget bizarre engineer', category: 'tecnologia' },
  { query: 'record world first ever extraordinary achievement', category: 'record' },
  // LOW engagement
  { query: 'animals behavior surprising extraordinary animal', category: 'animali' },
  { query: 'science discovery surprising unexpected finding', category: 'scienza' },
  { query: 'law unusual bizarre illegal rule country', category: 'leggi' },
  { query: 'culture tradition unusual strange country', category: 'cultura' },
  { query: 'food unusual strange bizarre eating world', category: 'gastronomia' },
  { query: 'place unusual strange world location extraordinary', category: 'luoghi' },
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
  "category": "una di: animali|scienza|tecnologia|record|leggi|cultura|gastronomia|luoghi|sesso_relazioni|gossip|crimini_strani|storie_assurde|psicologia_strana|soldi_folli|coincidenze",
  "categoryLabelIt": "es. 🐾 Animali (con emoji appropriata)",
  "categoryLabelEn": "es. 🐾 Animals (with appropriate emoji)",
  "engagementLevel": "high|medium|low"
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
  if (text.includes('japan') || text.includes('japanese')) return '🇯🇵 Giappone';
  if (text.includes('australia'))                          return '🇦🇺 Australia';
  if (text.includes('uk') || text.includes('britain'))     return '🇬🇧 UK';
  if (text.includes('us') || text.includes('america'))     return '🇺🇸 USA';
  if (text.includes('germany') || text.includes('german')) return '🇩🇪 Germania';
  if (text.includes('france') || text.includes('french'))  return '🇫🇷 Francia';
  if (text.includes('italy') || text.includes('italian'))  return '🇮🇹 Italia';
  if (text.includes('china') || text.includes('chinese'))  return '🇨🇳 Cina';
  if (text.includes('india') || text.includes('indian'))   return '🇮🇳 India';
  if (text.includes('brazil') || text.includes('brazil'))  return '🇧🇷 Brasile';
  if (text.includes('canada') || text.includes('canadian'))return '🇨🇦 Canada';
  if (text.includes('spain') || text.includes('spanish'))  return '🇪🇸 Spagna';
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
  for (const { query, category } of GUARDIAN_QUERIES) {
    const results = await fetchGuardianNews(query, 2);
    // Aggiungi la categoria suggerita per aiutare la classificazione AI
    results.forEach(r => r._suggestedCategory = category);
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
  const savedArticles = []; // Per le notifiche personalizzate

  for (let i = 0; i < selected.length; i++) {
    const article = selected[i];
    process.stdout.write(`   [${i + 1}/${selected.length}] ${article.webTitle.substring(0, 60)}...`);

    try {
      const ai = await rewriteWithAI(article);

      // Usa la categoria suggerita dalla query se AI non è sicura
      const category = ai.category ?? article._suggestedCategory ?? 'storie_assurde';
      const isPremiumArticle = i > 0; // La prima è free, le altre richiedono premium

      const docRef = db.collection('articles').doc();
      const articleData = {
        // Contenuto bilingue
        titleIt: ai.titleIt,
        titleEn: ai.titleEn,
        descriptionIt: ai.descriptionIt,
        descriptionEn: ai.descriptionEn,
        fullTextIt: ai.fullTextIt,
        fullTextEn: ai.fullTextEn,

        // Metadati
        category,
        categoryLabelIt: ai.categoryLabelIt,
        categoryLabelEn: ai.categoryLabelEn,
        engagementLevel: ai.engagementLevel ?? 'medium',
        country: guessCountry(article),
        source: 'The Guardian',
        sourceUrl: article.webUrl,
        date: today,
        isToday: true,
        order: i,
        isPremium: isPremiumArticle,
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
      };

      batch.set(docRef, articleData);
      savedArticles.push({ id: docRef.id, ...articleData });

      process.stdout.write(' ✓\n');
      await new Promise(r => setTimeout(r, 500)); // Rate limiting OpenAI
    } catch (e) {
      process.stdout.write(` ✗ (${e.message})\n`);
    }
  }

  await batch.commit();
  console.log(`\n✅ ${selected.length} notizie salvate su Firestore per il ${today}!`);

  // Invia notifica push personalizzata per categoria
  console.log('\n🔔 Invio notifiche push personalizzate...');
  await sendPersonalizedNotifications(savedArticles);
  console.log('   L\'app mostrerà automaticamente i nuovi contenuti.');
}

// ─── Notifiche personalizzate per categoria ───────────────────────
// Per ogni utente, invia la notizia più rilevante in base ai suoi interessi

async function sendPersonalizedNotifications(articles) {
  const usersSnap = await db.collection('users')
    .where('notificationsEnabled', '==', true)
    .get();

  if (usersSnap.empty) {
    console.log('   Nessun utente con notifiche attive.');
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const messages = [];

  for (const userDoc of usersSnap.docs) {
    const user = userDoc.data();
    if (!user.expoPushToken) continue;

    // Controlla se ha già ricevuto una notifica oggi
    if (user.lastNotifDate === today) continue;

    const isPremium = user.isPremium ?? false;
    const interests = user.interests ?? []; // es. ['animali', 'tecnologia']
    const prefs = user.notificationPrefs ?? {};
    if (prefs.enabled === false) continue;

    // Trova l'articolo più rilevante per questo utente
    const relevantArticle = findBestArticleForUser(articles, interests, isPremium);
    if (!relevantArticle) continue;

    // Costruisci il testo della notifica
    const { title, body } = buildNotifText(relevantArticle, isPremium);

    messages.push({
      token: user.expoPushToken,
      userId: userDoc.id,
      message: {
        to: user.expoPushToken,
        title,
        body,
        sound: 'default',
        badge: 1,
        data: {
          type: 'daily_news',
          newsId: relevantArticle.id,
          category: relevantArticle.category,
          screen: 'Article',
          date: today,
        },
      },
    });
  }

  if (messages.length === 0) {
    console.log('   Nessuna notifica da inviare oggi.');
    return;
  }

  console.log(`   Invio a ${messages.length} utenti...`);

  // Invia in batch da 100 (limite Expo)
  const chunks = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(chunk.map(m => m.message)),
    });

    const result = await res.json();
    const errors = (result.data ?? []).filter(r => r.status === 'error');
    console.log(`   ✓ ${chunk.length - errors.length} inviate, ⚠️ ${errors.length} fallite`);

    // Aggiorna lastNotifDate per ogni utente notificato con successo
    const batchUpdate = db.batch();
    chunk.forEach(({ userId }) => {
      batchUpdate.update(db.collection('users').doc(userId), { lastNotifDate: today });
    });
    await batchUpdate.commit();
  }
}

// Trova l'articolo migliore per un utente in base ai suoi interessi
function findBestArticleForUser(articles, interests, isPremium) {
  const accessibleArticles = isPremium
    ? articles
    : articles.filter(a => !a.isPremium);

  if (interests.length === 0) {
    // Nessuna preferenza: ritorna l'articolo con più engagement
    return accessibleArticles[0] ?? null;
  }

  // Priorità: articoli nelle categorie di interesse
  const interestSet = new Set(interests);
  const relevant = accessibleArticles.filter(a => interestSet.has(a.category));
  return relevant[0] ?? accessibleArticles[0] ?? null;
}

// Costruisce titolo e body della notifica
function buildNotifText(article, isPremium) {
  const EMOJI_MAP = {
    sesso_relazioni: '💋', gossip: '🌟', crimini_strani: '🔪',
    storie_assurde: '🤪', psicologia_strana: '🧠', soldi_folli: '💸',
    coincidenze: '🌀', tecnologia: '💻', record: '🏆',
    animali: '🐾', scienza: '🔬', leggi: '⚖️',
    cultura: '🌍', gastronomia: '🍽️', luoghi: '📍',
  };
  const emoji = EMOJI_MAP[article.category] ?? '📰';
  const titleText = article.titleIt?.substring(0, 60) ?? 'Notizia del giorno';
  const title = `${emoji} ${titleText}`;
  const body = isPremium
    ? article.descriptionIt?.substring(0, 100) ?? 'La tua notizia Premium di oggi è pronta!'
    : 'La tua notizia curiosa di oggi è pronta!';

  return { title, body };
}

main().catch(console.error);

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
// Query specifiche e aggressive per pescare storie davvero bizzarre
const GUARDIAN_QUERIES = [
  // GOLD TIER — storie assurde garantite
  { query: 'man woman arrested bizarre absurd toilet OR shower OR drunk OR naked OR costume', category: 'crimini_strani' },
  { query: 'weird law banned illegal absurd country fined', category: 'leggi' },
  { query: 'alligator snake python found house toilet car surprise', category: 'animali' },
  { query: 'world record longest fastest biggest smallest unusual attempt', category: 'record' },
  { query: 'accidental discovered mistake unusual found buried treasure odd', category: 'storie_assurde' },
  // HIGH — persone assurde
  { query: 'man OR woman OR couple bizarre obsession collection unusual hobby extreme', category: 'storie_assurde' },
  { query: 'scam fraud bizarre trick unusual theft comedy mistake', category: 'crimini_strani' },
  { query: 'millionaire eccentric spending bizarre luxury unusual purchase', category: 'soldi_folli' },
  { query: 'celebrity bizarre behaviour odd scandal embarrassing moment', category: 'gossip' },
  { query: 'lawsuit strange sue bizarre legal case unusual court', category: 'leggi' },
  // MEDIUM — storie virali
  { query: 'study reveals surprising shocking humans prefer secret desire', category: 'psicologia_strana' },
  { query: 'animal intelligence surprising behavior first time science discovery', category: 'animali' },
  { query: 'food challenge eating contest bizarre menu strange restaurant', category: 'gastronomia' },
  { query: 'town village bizarre tradition ritual festival weird celebration', category: 'cultura' },
  { query: 'coincidence incredible reunion twins separated same mistake', category: 'coincidenze' },
  { query: 'invention gadget bizarre unusual robot AI funny useless', category: 'tecnologia' },
  { query: 'relationship breakup marriage unusual strange proposal divorce', category: 'sesso_relazioni' },
  { query: 'haunted abandoned strange mysterious place found discovered', category: 'luoghi' },
];

// ─── Funzione: cerca notizie su Guardian ──────────────────────────
async function fetchGuardianNews(query, maxResults = 5) {
  // Cerca negli ultimi 30 giorni per avere più materiale
  const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const url = `https://content.guardianapis.com/search?` +
    `q=${encodeURIComponent(query)}&` +
    `show-fields=headline,trailText,thumbnail,bodyText&` +
    `order-by=relevance&` +
    `from-date=${fromDate}&` +
    `page-size=${maxResults}&` +
    `api-key=${GUARDIAN_KEY}`;

  const res = await fetch(url);
  const data = await res.json();
  return data.response?.results ?? [];
}

// ─── Funzione: scoring AI per selezionare solo storie davvero bizzarre ───
async function scoreAndSelectArticles(candidates, count = 5) {
  const summaries = candidates.map((a, i) => {
    const headline = a.fields?.headline ?? a.webTitle ?? '';
    const trail = a.fields?.trailText ?? '';
    return `[${i}] ${headline} | ${trail.substring(0, 120)}`;
  }).join('\n');

  const prompt = `Sei il curatore di OddFeed, un'app italiana di notizie virali e bizzarre.
Devi selezionare le ${count} notizie più virali, bizzarre e assurde da questa lista.

CRITERI DI SELEZIONE (in ordine di priorità):
1. 🏆 Incredibilmente assurda / imbarazzante / surreale
2. 😂 Ha un elemento comico involontario
3. 🤯 Fatto che nessuno si aspetta
4. ⚡ Tocca temi universali (sesso, soldi, crimini stupidi, animali pazzi, leggi assurde)
5. ✅ Verificabile e reale (non speculativa)

SCARTA: notizie politiche ordinarie, economia generale, conflitti bellici, sport mainstream, salute generica.

Lista articoli:
${summaries}

Rispondi SOLO con un JSON valido:
{
  "selected": [indici degli articoli scelti, dal più virale al meno, es. [3, 7, 1, 12, 5]],
  "reasoning": "breve spiegazione in una riga"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 200,
    });
    const raw = completion.choices[0].message.content ?? '{}';
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(clean);
    console.log(`   Selezione AI: ${result.reasoning}`);
    const indices = result.selected?.slice(0, count) ?? [];
    return indices.map(i => candidates[i]).filter(Boolean);
  } catch (e) {
    console.log(`   ⚠️ Scoring fallito, uso selezione casuale: ${e.message}`);
    // Fallback: prendi articoli distribuiti dalle varie query
    return candidates.slice(0, count);
  }
}

// ─── Funzione: rielabora con GPT-4o mini ──────────────────────────
async function rewriteWithAI(article) {
  const headline = article.fields?.headline ?? article.webTitle ?? '';
  const trail = article.fields?.trailText ?? '';
  const bodyPreview = article.fields?.bodyText?.substring(0, 400) ?? '';

  const prompt = `Sei il redattore capo di OddFeed, un'app italiana di notizie bizzarre e virali.
Il tuo stile è quello del Corriere della Sera se diventasse un tabloid: ironico, diretto, sorprendente.

NOTIZIA ORIGINALE:
Titolo: ${headline}
Sommario: ${trail}
${bodyPreview ? `Testo: ${bodyPreview}` : ''}

REGOLE PER IL TITOLO ITALIANO (FONDAMENTALI):
- Massimo 65 caratteri — conta ogni lettera
- Inizia sempre con un'emoji pertinente
- Deve contenere il fatto più assurdo/sorprendente in modo esplicito
- Usa numeri specifici quando presenti (es. "per 47 anni", "con 3.000 api")
- Tono: stupore + ironia leggera, come se tu stessi dicendo "ma ci rendiamo conto?!"
- NON usare mai: "Un uomo", "Una donna", "Si scopre che" — troppo generico
- Esempi di TITOLI BUONI: "🐊 Trova un coccodrillo nel wc: era lì da 3 giorni", "💸 Spende 40mila€ per sembrare sua moglie — lei lo lascia", "🧠 Studio: il 73% di noi mente al dentista per questa ragione"

REGOLE PER IL TESTO:
- Tono da giornalista curioso che racconta a un amico al bar
- Includi sempre il dettaglio più assurdo nel primo paragrafo
- Seconda frase del primo paragrafo: il contesto (dove, quando, chi)
- Secondo paragrafo: sviluppo + reazione delle persone coinvolte
- Terzo paragrafo: una citazione immaginaria plausibile O un dato che amplifica l'assurdità

Rispondi SOLO con un JSON valido:
{
  "titleIt": "Titolo italiano (max 65 char, emoji iniziale obbligatoria)",
  "titleEn": "English title (max 65 chars, opening emoji required)",
  "descriptionIt": "Gancio in italiano: 1-2 frasi che amplificano la cosa più assurda (max 180 caratteri)",
  "descriptionEn": "Hook in English: 1-2 sentences on the most absurd part (max 180 chars)",
  "fullTextIt": "3 paragrafi in italiano (80-100 parole ciascuno, separati da \\n\\n)",
  "fullTextEn": "3 paragraphs in English (80-100 words each, separated by \\n\\n)",
  "category": "una di: animali|scienza|tecnologia|record|leggi|cultura|gastronomia|luoghi|sesso_relazioni|gossip|crimini_strani|storie_assurde|psicologia_strana|soldi_folli|coincidenze",
  "categoryLabelIt": "es. 🐾 Animali",
  "categoryLabelEn": "es. 🐾 Animals",
  "engagementLevel": "high|medium|low"
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.85,
    max_tokens: 1200,
  });

  const raw = completion.choices[0].message.content ?? '{}';
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

  // Raccoglie articoli da Guardian (pool ampio per poi selezionare i migliori)
  console.log('📰 Recupero notizie da Guardian API...');
  const allArticles = [];
  for (const { query, category } of GUARDIAN_QUERIES) {
    const results = await fetchGuardianNews(query, 4); // 4 per query = pool più ampio
    results.forEach(r => r._suggestedCategory = category);
    allArticles.push(...results);
    await new Promise(r => setTimeout(r, 150)); // rate limiting
  }

  // Deduplica per URL
  const seen = new Set();
  const unique = allArticles.filter(a => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  console.log(`   → Trovati ${unique.length} articoli unici nel pool`);

  // ⭐ Scoring AI: seleziona le 5 storie più virali/bizzarre dal pool
  const MAX_ARTICLES = 5;
  console.log('\n⭐ Selezione AI delle storie più virali...');
  const selected = await scoreAndSelectArticles(unique, MAX_ARTICLES);

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

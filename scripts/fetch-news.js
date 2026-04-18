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
// Le query con tag:'world/italy' pescano articoli taggati Italia dal Guardian.
// Queste hanno priorità nella selezione finale.
const GUARDIAN_QUERIES = [
  // 🇮🇹 ITALIA FIRST — almeno 2-3 notizie italiane per ogni giornata
  { query: 'italy bizarre crime unusual strange absurd', category: 'crimini_strani', tag: 'world/italy' },
  { query: 'italy court law sentence judge unusual verdict', category: 'leggi', tag: 'world/italy' },
  { query: 'italy scandal gossip celebrity politician embarrassing', category: 'gossip', tag: 'world/italy' },
  { query: 'italy discovery found unusual treasure ancient surprising', category: 'storie_assurde', tag: 'world/italy' },
  { query: 'italy food restaurant tradition record bizarre', category: 'gastronomia', tag: 'world/italy' },
  { query: 'italy protest demonstration unusual funny absurd', category: 'storie_assurde', tag: 'world/italy' },
  // GOLD TIER — storie assurde garantite (mondo)
  { query: 'man woman arrested bizarre absurd toilet OR shower OR drunk OR naked OR costume', category: 'crimini_strani' },
  { query: 'weird law banned illegal absurd country fined', category: 'leggi' },
  { query: 'alligator snake python found house toilet car surprise', category: 'animali' },
  { query: 'world record longest fastest biggest smallest unusual attempt', category: 'record' },
  { query: 'accidental discovered mistake unusual found buried treasure odd', category: 'storie_assurde' },
  // HIGH — persone assurde (mondo)
  { query: 'man OR woman OR couple bizarre obsession collection unusual hobby extreme', category: 'storie_assurde' },
  { query: 'scam fraud bizarre trick unusual theft comedy mistake', category: 'crimini_strani' },
  { query: 'millionaire eccentric spending bizarre luxury unusual purchase', category: 'soldi_folli' },
  { query: 'celebrity bizarre behaviour odd scandal embarrassing moment', category: 'gossip' },
  { query: 'lawsuit strange sue bizarre legal case unusual court', category: 'leggi' },
  // MEDIUM — storie virali (mondo)
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
async function fetchGuardianNews(query, maxResults = 5, tag = null) {
  const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  let url = `https://content.guardianapis.com/search?` +
    `q=${encodeURIComponent(query)}&` +
    `show-fields=headline,trailText,thumbnail,bodyText&` +
    `order-by=relevance&` +
    `from-date=${fromDate}&` +
    `page-size=${maxResults}&` +
    `api-key=${GUARDIAN_KEY}`;

  if (tag) url += `&tag=${encodeURIComponent(tag)}`;

  const res = await fetch(url);
  const data = await res.json();
  return data.response?.results ?? [];
}

// ─── Funzione: scoring AI per selezionare solo storie davvero bizzarre ───
async function scoreAndSelectArticles(candidates, count = 5) {
  // Separa articoli italiani da internazionali
  const italianCandidates = candidates.filter(a => a._isItalian);
  const worldCandidates = candidates.filter(a => !a._isItalian);

  // Garantisce almeno 2 notizie italiane se disponibili
  const MIN_ITALIAN = Math.min(2, italianCandidates.length);
  const needed = count - MIN_ITALIAN;

  // Crea la lista con gli italiani etichettati
  const summaries = candidates.map((a, i) => {
    const headline = a.fields?.headline ?? a.webTitle ?? '';
    const trail = a.fields?.trailText ?? '';
    const flag = a._isItalian ? ' 🇮🇹' : '';
    return `[${i}]${flag} ${headline} | ${trail.substring(0, 120)}`;
  }).join('\n');

  const prompt = `Sei il curatore di OddFeed, un'app italiana di notizie virali e bizzarre.
Il pubblico è italiano, quindi le notizie dall'Italia hanno priorità assoluta.

Devi selezionare ${count} notizie rispettando questa regola:
- OBBLIGATORIO: almeno ${MIN_ITALIAN} notizie con 🇮🇹 (italiane) se disponibili
- Le restanti ${needed}: le più virali/bizzarre indipendentemente dal paese

CRITERI (in ordine):
1. 🇮🇹 È italiana (priorità assoluta)
2. 🏆 Assurda / imbarazzante / surreale
3. 😂 Elemento comico involontario
4. 🤯 Fatto che nessuno si aspetta
5. ⚡ Temi universali: sesso, soldi, crimini stupidi, animali pazzi, leggi assurde

SCARTA: politica ordinaria, economia, guerra, sport mainstream, salute generica.

Lista articoli:
${summaries}

Rispondi SOLO con un JSON valido:
{
  "selected": [indici dal più interessante al meno, es. [3, 7, 1, 12, 5]],
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
  // Passa fino a 1000 caratteri di corpo — più contesto = meno invenzioni
  const bodyPreview = (article.fields?.bodyText ?? '').substring(0, 1000);

  const prompt = `Sei il redattore di OddFeed, un'app italiana di notizie bizzarre dal mondo.

ARTICOLO ORIGINALE (usalo come unica fonte di fatti):
Titolo originale: ${headline}
Sommario: ${trail}
${bodyPreview ? `Testo originale: ${bodyPreview}` : ''}

═══ REGOLE ASSOLUTE ═══

TITOLO (titleIt / titleEn):
- Max 65 caratteri, emoji in apertura obbligatoria
- Deve contenere il fatto più sorprendente dell'articolo, in modo esplicito
- Usa numeri reali se presenti nell'articolo
- Tono ironico e diretto — vietato: "Un uomo...", "Si scopre che..."
- Esempi: "🐊 Coccodrillo nel bagno: era nascosto lì da 3 giorni", "💸 Vende i denti del nonno su eBay: era convinto fossero d'oro"

TESTO (fullTextIt / fullTextEn) — REGOLA PRINCIPALE:
⚠️ Il testo deve raccontare ESATTAMENTE la stessa storia del titolo.
⚠️ NON inventare fatti, nomi, luoghi o citazioni che non sono nell'articolo originale.
⚠️ Se l'articolo originale è breve, scrivi meno — meglio corto e vero che lungo e inventato.

Struttura del testo:
- Paragrafo 1: spiega il fatto del titolo — chi, cosa, dove, quando (solo dati reali)
- Paragrafo 2: contesto e sviluppo della storia, basato sull'articolo originale
- Paragrafo 3: conseguenze, reazioni, o dato aggiuntivo presente nell'articolo — se non c'è, accorcia

DESCRIZIONE (descriptionIt / descriptionEn):
- 1-2 frasi che amplificano il fatto più assurdo (max 160 caratteri)
- Deve essere coerente con il titolo e il testo

Rispondi SOLO con un JSON valido:
{
  "titleIt": "...",
  "titleEn": "...",
  "descriptionIt": "...",
  "descriptionEn": "...",
  "fullTextIt": "paragrafo 1\\n\\nparagrafo 2\\n\\nparagrafo 3",
  "fullTextEn": "paragraph 1\\n\\nparagraph 2\\n\\nparagraph 3",
  "category": "una di: animali|scienza|tecnologia|record|leggi|cultura|gastronomia|luoghi|sesso_relazioni|gossip|crimini_strani|storie_assurde|psicologia_strana|soldi_folli|coincidenze",
  "categoryLabelIt": "es. 🐾 Animali",
  "categoryLabelEn": "es. 🐾 Animals",
  "engagementLevel": "high|medium|low"
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.6,
    max_tokens: 1400,
  });

  const raw = completion.choices[0].message.content ?? '{}';
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(clean);
}

// ─── Mappa sezione Guardian → paese/fonte ─────────────────────────
function guessCountry(article) {
  // Se l'articolo viene da una query taggata Italia, è Italia di sicuro
  if (article._isItalian) return '🇮🇹 Italia';

  const text = (article.sectionName + ' ' + article.webTitle + ' ' + (article.fields?.trailText ?? '')).toLowerCase();
  if (text.includes('italy') || text.includes('italian') || text.includes('rome') || text.includes('milan') || text.includes('napoli') || text.includes('sicil')) return '🇮🇹 Italia';
  if (text.includes('japan') || text.includes('japanese') || text.includes('tokyo')) return '🇯🇵 Giappone';
  if (text.includes('australia') || text.includes('sydney') || text.includes('melbourne')) return '🇦🇺 Australia';
  if (text.includes('uk') || text.includes('britain') || text.includes('london') || text.includes('england')) return '🇬🇧 UK';
  if (text.includes(' us ') || text.includes('america') || text.includes('florida') || text.includes('texas') || text.includes('california')) return '🇺🇸 USA';
  if (text.includes('germany') || text.includes('german') || text.includes('berlin')) return '🇩🇪 Germania';
  if (text.includes('france') || text.includes('french') || text.includes('paris')) return '🇫🇷 Francia';
  if (text.includes('china') || text.includes('chinese') || text.includes('beijing')) return '🇨🇳 Cina';
  if (text.includes('india') || text.includes('indian') || text.includes('mumbai')) return '🇮🇳 India';
  if (text.includes('brazil') || text.includes('brazilian')) return '🇧🇷 Brasile';
  if (text.includes('canada') || text.includes('canadian')) return '🇨🇦 Canada';
  if (text.includes('spain') || text.includes('spanish') || text.includes('madrid')) return '🇪🇸 Spagna';
  if (text.includes('mexico') || text.includes('mexican')) return '🇲🇽 Messico';
  if (text.includes('russia') || text.includes('russian') || text.includes('moscow')) return '🇷🇺 Russia';
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
  for (const { query, category, tag } of GUARDIAN_QUERIES) {
    const results = await fetchGuardianNews(query, 4, tag ?? null);
    results.forEach(r => {
      r._suggestedCategory = category;
      r._isItalian = !!tag; // marca gli articoli che vengono da query Italia
    });
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

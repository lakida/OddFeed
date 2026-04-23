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
const RSSParser = require('rss-parser');

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

// ─── Fonti RSS italiane ────────────────────────────────────────────
// Solo sezioni già orientate a notizie bizzarre/virali/cronaca curiosa.
// Evitare feed generali (homepage) che portano sport, politica, economia.
const ITALIAN_RSS_FEEDS = [
  // Cronaca curiosa e casi strani
  { url: 'https://www.fanpage.it/feed/',                              source: 'Fanpage.it',  category: 'storie_assurde' },
  { url: 'https://www.ansa.it/sito/notizie/cronaca/cronaca_rss.xml',  source: 'ANSA',        category: 'crimini_strani' },
  { url: 'https://www.today.it/feed/',                                source: 'Today.it',    category: 'storie_assurde' },
  { url: 'https://www.tgcom24.mediaset.it/rss/home.xml',              source: 'TGcom24',     category: null },
  // Sezioni "strane" di testate generaliste
  { url: 'https://www.corriere.it/rss/cronache.xml',                  source: 'Corriere',    category: 'crimini_strani' },
  { url: 'https://www.ilpost.it/feed/',                               source: 'Il Post',     category: null },
];

// ─── Parole chiave che indicano notizie NOIOSE da scartare pre-AI ──
// Se titolo o sommario contengono uno di questi termini, l'articolo
// viene eliminato prima ancora di arrivare allo scoring AI.
const BORING_KEYWORDS = [
  // Sport
  'champions league', 'serie a', 'serie b', 'campionato', 'classifica', 'gol', 'partita',
  'calciatore', 'calcio', 'pallone', 'allenatore', 'stadio', 'portiere', 'arbitro',
  'motogp', 'formula 1', 'formula uno', 'giro d\'italia', 'olimpiadi', 'mondiali',
  'nba', 'nfl', 'tennis', 'roland garros', 'wimbledon', 'us open',
  'bayern', 'real madrid', 'barcellona', 'juventus', 'milan', 'inter', 'napoli', 'roma',
  // Politica / Governo
  'parlamento', 'senato', 'camera dei deputati', 'governo', 'premier', 'presidente della repubblica',
  'ministro', 'opposizione', 'partito', 'elezioni', 'voto', 'referendum', 'coalizione',
  'decreto legge', 'legge di bilancio', 'riforma', 'commissione europea',
  'meloni', 'schlein', 'salvini', 'conte', 'renzi', 'berlusconi',
  // Economia / Finanza
  'pil', 'inflazione', 'spread', 'borsa', 'azioni', 'mercati', 'banca centrale',
  'bce', 'fed', 'tasso di interesse', 'deflazione', 'recessione', 'deficit',
  'manovra', 'finanziaria', 'pensioni', 'istat', 'bankitalia',
  // Guerra / Geopolitica
  'guerra', 'missile', 'bombardamento', 'attacco aereo', 'esercito', 'soldati',
  'ucraina', 'russia', 'putin', 'zelensky', 'nato', 'tregua', 'cessate il fuoco',
  'israele', 'gaza', 'hamas', 'hezbollah', 'iran', 'siria',
  // Salute / Medicina (generici)
  'vaccino', 'pandemia', 'covid', 'variante', 'ospedale', 'terapia intensiva',
  'tumore', 'cancro', 'farmaco', 'trial clinico', 'oms', 'aifa',
  // Ambiente / Clima
  'cambiamento climatico', 'cop', 'emissioni', 'co2', 'siccità', 'alluvione',
  'terremoto', 'eruzione', 'maremoto', 'emergenza meteo',
];

const rssParser = new RSSParser({
  timeout: 10000,
  requestOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    },
  },
});

// ─── Pre-filtro anti-noia ──────────────────────────────────────────
// Elimina articoli che contengono parole chiave di argomenti noiosi.
// Questo avviene PRIMA dello scoring AI per ridurre il rumore nel pool.
function isBoringArticle(article) {
  const text = [
    article.webTitle ?? '',
    article.fields?.headline ?? '',
    article.fields?.trailText ?? '',
  ].join(' ').toLowerCase();

  return BORING_KEYWORDS.some(kw => text.includes(kw));
}

async function fetchItalianRSSNews(maxPerFeed = 8) {
  const results = [];
  for (const feed of ITALIAN_RSS_FEEDS) {
    try {
      const parsed = await rssParser.parseURL(feed.url);
      const items = (parsed.items ?? []).slice(0, maxPerFeed).map(item => ({
        id: item.guid ?? item.link ?? item.title,
        webTitle: item.title ?? '',
        webUrl: item.link ?? '',
        fields: {
          headline: item.title ?? '',
          trailText: item.contentSnippet ?? item.summary ?? '',
          bodyText: item.content ?? item.contentSnippet ?? '',
        },
        _suggestedCategory: feed.category ?? 'storie_assurde',
        _isItalian: true,
        _source: feed.source,
        sectionName: 'Italian',
      }));
      console.log(`   🇮🇹 ${feed.source}: ${items.length} articoli`);
      results.push(...items);
    } catch (e) {
      console.log(`   ⚠️  ${feed.source} non raggiungibile: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 200));
  }
  return results;
}

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

  const prompt = `Sei il curatore di OddFeed, un'app italiana di notizie bizzarre.
Il pubblico è italiano: notizie dall'Italia hanno priorità.

REGOLA FONDAMENTALE: seleziona SOLO articoli in cui il fatto bizzarro/assurdo è già evidente nel titolo o nel sommario originale. Non selezionare articoli normali sperando di renderli interessanti in fase di scrittura — non funziona.

DOMANDA DA FARTI per ogni articolo: "Se racconto questa storia a un amico al bar, si stupirà o si annoierà?" → Se si annoia, scarta.

✅ SELEZIONA se nell'originale c'è già:
- Una persona che fa qualcosa di ridicolo/illegale/imbarazzante
- Un animale in un posto assurdo
- Una legge o sentenza ridicola
- Un record assurdo o una coincidenza incredibile
- Uno scandalo imbarazzante
- Un crimine comico o incompetente

❌ SCARTA SEMPRE (anche se 🇮🇹):
- Missioni spaziali, astronomia, NASA (notizie normali di scienza)
- Politica, elezioni, governo, parlamento
- Economia, mercati, inflazione, banche
- Guerra, conflitti, crisi internazionali
- Sport (partite, campionati, trasferimenti)
- Salute, medicina, farmaci, pandemie
- Clima, ambiente, disastri naturali
- Qualsiasi notizia "seria" travestita da bizzarra

QUOTA ITALIA: se ci sono articoli 🇮🇹 che superano il test del bar, includi almeno ${MIN_ITALIAN}.

Lista articoli:
${summaries}

Rispondi SOLO con un JSON valido. Devi sempre selezionare almeno ${Math.min(3, candidates.length)} articoli — se non ne trovi di perfetti, scegli comunque i meno peggio tra quelli disponibili:
{
  "selected": [indici dal più bizzarro al meno, es. [3, 7, 1]],
  "reasoning": "breve spiegazione"
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
    const selected = indices.map(i => candidates[i]).filter(Boolean);
    if (selected.length === 0) {
      console.log(`   ⚠️  AI ha selezionato 0 articoli — uso fallback con articoli italiani o bizzarri disponibili.`);
      // Fallback intelligente: priorità agli articoli italiani e a categorie bizzarre
      const fallback = candidates
        .filter(a => a._isItalian || ['storie_assurde','crimini_strani','animali','record','leggi','gossip'].includes(a._suggestedCategory))
        .slice(0, count);
      return fallback.length > 0 ? fallback : candidates.slice(0, count);
    }
    if (selected.length < 3) {
      console.log(`   ⚠️  Solo ${selected.length} articoli scelti dall'AI — integro con i successivi disponibili.`);
      // Completa con articoli non già selezionati, preferendo italiani
      const selectedIds = new Set(selected.map(a => a.id));
      const extras = candidates
        .filter(a => !selectedIds.has(a.id))
        .sort((a, b) => (b._isItalian ? 1 : 0) - (a._isItalian ? 1 : 0))
        .slice(0, count - selected.length);
      return [...selected, ...extras];
    }
    return selected;
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

ARTICOLO ORIGINALE:
Titolo originale: ${headline}
Sommario: ${trail}
${bodyPreview ? `Testo originale: ${bodyPreview}` : ''}

═══ REGOLA N.1 — NON INVENTARE MAI ═══
Il titolo e il testo devono contenere SOLO fatti presenti nell'articolo originale.
Se nell'originale non c'è nulla di davvero bizzarro, scrivi un titolo onesto e diretto — non aggiungere dettagli inventati per renderlo più strano.
ESEMPIO VIETATO: l'articolo parla di astronauti vicino alla luna → NON scrivere "il bagno è rotto" se non è scritto nell'originale.
ESEMPIO CORRETTO: se l'unica cosa strana è X, il titolo parla di X e basta.

═══ TITOLO ═══
- Max 65 caratteri, emoji iniziale obbligatoria
- Riassumi il fatto più insolito CHE ESISTE DAVVERO nell'articolo
- Usa numeri reali se ci sono nell'originale
- Tono ironico ma onesto

═══ TESTO ═══
- Paragrafo 1: chi, cosa, dove, quando — solo dati reali dall'articolo
- Paragrafo 2: contesto o sviluppo presente nell'articolo
- Paragrafo 3: solo se c'è materiale reale; altrimenti ometti e lascia 2 paragrafi

═══ DESCRIZIONE ═══
- 1-2 frasi sul fatto più insolito dell'articolo (max 160 caratteri)

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
  // Fonti italiane → sempre Italia
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

  // Supporta --date YYYY-MM-DD per rigenerare giorni specifici
  const dateArg = process.argv.find(a => a.startsWith('--date='));
  const today = dateArg
    ? dateArg.replace('--date=', '')
    : new Date().toISOString().split('T')[0];

  console.log(`📅 Data target: ${today}\n`);

  // Controlla se le notizie di oggi esistono già
  const existing = await db.collection('articles')
    .where('date', '==', today)
    .get();

  if (!existing.empty) {
    if (!process.argv.includes('--force')) {
      console.log(`ℹ️  Le notizie per oggi (${today}) esistono già su Firestore.`);
      console.log('   Usa --force per sovrascriverle.');
      process.exit(0);
    }
    // --force: cancella prima le notizie esistenti per oggi
    console.log(`🗑️  --force: cancello ${existing.size} notizie esistenti per ${today}...`);
    const deleteBatch = db.batch();
    existing.docs.forEach(doc => deleteBatch.delete(doc.ref));
    await deleteBatch.commit();
    console.log('   ✓ Cancellate.\n');
  }

  // Carica URL degli articoli già pubblicati negli ultimi 30 giorni
  // per evitare di riproporre la stessa notizia in giorni diversi
  const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const alreadyPublished = await db.collection('articles')
    .where('date', '>=', cutoff30)
    .get();
  const usedSourceUrls = new Set(
    alreadyPublished.docs.map(d => d.data().sourceUrl).filter(Boolean)
  );
  console.log(`   → ${usedSourceUrls.size} articoli già pubblicati negli ultimi 30 giorni (esclusi dal pool)`);

  // Raccoglie articoli da Guardian (pool ampio per poi selezionare i migliori)
  console.log('📰 Recupero notizie da Guardian API...');
  const allArticles = [];
  for (const { query, category, tag } of GUARDIAN_QUERIES) {
    const results = await fetchGuardianNews(query, 4, tag ?? null);
    results.forEach(r => {
      r._suggestedCategory = category;
      r._isItalian = !!tag;
    });
    allArticles.push(...results);
    await new Promise(r => setTimeout(r, 150));
  }

  // Aggiunge articoli da fonti RSS italiane
  console.log('\n🇮🇹 Recupero notizie da fonti italiane...');
  const italianArticles = await fetchItalianRSSNews(8);
  allArticles.push(...italianArticles);

  // Deduplica per ID Guardian + escludi articoli già pubblicati in precedenza
  const seen = new Set();
  const unique = allArticles.filter(a => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    if (usedSourceUrls.has(a.webUrl)) return false; // già pubblicato in un giorno precedente
    return true;
  });

  // Pre-filtro anti-noia: rimuove sport, politica, economia, guerra prima dell'AI
  const beforeFilter = unique.length;
  const filtered = unique.filter(a => !isBoringArticle(a));
  console.log(`   → Pool: ${beforeFilter} articoli totali → ${filtered.length} dopo pre-filtro anti-noia (${beforeFilter - filtered.length} scartati)`);

  // Se il pre-filtro è troppo aggressivo e rimangono meno di 10 articoli,
  // reintegra quelli scartati per non lasciare il pool vuoto
  const pool = filtered.length >= 10 ? filtered : unique;
  if (filtered.length < 10) {
    console.log(`   ⚠️  Pre-filtro troppo aggressivo (${filtered.length} rimasti) — uso pool completo`);
  }

  // ⭐ Scoring AI: seleziona le 5 storie più virali/bizzarre dal pool
  const MAX_ARTICLES = 5;
  console.log('\n⭐ Selezione AI delle storie più virali...');
  const selected = await scoreAndSelectArticles(pool, MAX_ARTICLES);

  // Riordina: categorie non-premium prima, così il primo articolo (free) non è mai premium
  const PREMIUM_CATS = new Set(['sesso_relazioni', 'gossip', 'crimini_strani']);
  selected.sort((a, b) => {
    const aPremium = PREMIUM_CATS.has(a._suggestedCategory ?? '') ? 1 : 0;
    const bPremium = PREMIUM_CATS.has(b._suggestedCategory ?? '') ? 1 : 0;
    return aPremium - bPremium;
  });

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
      // isPremium = true se non è il primo articolo OPPURE se è in una categoria premium
      const isPremiumArticle = i > 0 || PREMIUM_CATS.has(category);

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
        source: article._source ?? 'The Guardian',
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

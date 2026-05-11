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
const OPENAI_KEY  = process.env.OPENAI_KEY;
const FIREBASE_SA = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!OPENAI_KEY) {
  console.error('❌ Manca OPENAI_KEY nel file .env');
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

// ─── Fonti RSS specializzate in notizie bizzarre/virali ───────────
// Queste fonti pubblicano GIÀ solo notizie strane/virali/assurde.
// Non serve cercare il bizzarro: ogni articolo è già pre-selezionato.
const BIZARRE_RSS_FEEDS = [
  { url: 'https://rss.upi.com/news/Odd_News.rss',                      source: 'UPI Odd News',    category: 'storie_assurde', isItalian: false },
  { url: 'https://nypost.com/weird-but-true/feed/',                     source: 'NY Post',         category: 'storie_assurde', isItalian: false },
  { url: 'https://www.odditycentral.com/feed',                          source: 'Oddity Central',  category: 'storie_assurde', isItalian: false },
  { url: 'https://www.thesun.co.uk/news/weird/feed/',                   source: 'The Sun',         category: 'storie_assurde', isItalian: false },
  { url: 'https://www.dailystar.co.uk/weird-news/rss.xml',              source: 'Daily Star',      category: 'storie_assurde', isItalian: false },
  { url: 'https://www.boredpanda.com/feed/',                            source: 'Bored Panda',     category: 'storie_assurde', isItalian: false },
  { url: 'https://www.huffpost.com/section/weird-news/feed',            source: 'HuffPost Weird',  category: 'storie_assurde', isItalian: false },
  { url: 'https://www.unilad.com/rss',                                  source: 'UNILAD',          category: 'storie_assurde', isItalian: false },
];

// ─── Fonti RSS attualità (notizie del giorno + gossip) ────────────
// Usate per la sezione "In primo piano" in Home — visibile a tutti.
const CURRENT_NEWS_FEEDS = [
  // Attualità italiana
  { url: 'https://www.ansa.it/sito/notizie/mondo/rss.xml',            source: 'ANSA',        category: 'attualita' },
  { url: 'https://www.corriere.it/rss/homepage.xml',                  source: 'Corriere',    category: 'attualita' },
  { url: 'https://www.repubblica.it/rss/homepage/rss2.0.xml',         source: 'Repubblica',  category: 'attualita' },
  // Gossip / Spettacolo
  { url: 'https://www.tgcom24.mediaset.it/spettacolo/rss.xml',        source: 'TGcom24 TV',  category: 'gossip_spettacolo' },
  { url: 'https://www.tvblog.it/feed/',                               source: 'TvBlog',      category: 'gossip_spettacolo' },
  { url: 'https://www.gossip.it/feed/',                               source: 'Gossip.it',   category: 'gossip_spettacolo' },
];

// ─── Fonti RSS italiane ed europee ────────────────────────────────
// Priorità a fonti orientate al virale/bizzarro/curioso.
// RIMOSSI: ANSA cronaca e Corriere cronache — portano omicidi e crimini seri.
// AGGIUNTO: ANSA "Strani ma veri" — sezione dedicata alle notizie bizzarre.
const ITALIAN_RSS_FEEDS = [
  { url: 'https://www.ansa.it/sito/notizie/mondo/strani_ma_veri/rss.xml',               source: 'ANSA Strani ma veri', category: 'storie_assurde', isItalian: true },
  { url: 'https://www.ansa.it/sito/notizie/cultura_e_spettacoli/curiosita/rss.xml',     source: 'ANSA Curiosità',      category: 'storie_assurde', isItalian: true },
  { url: 'https://www.fanpage.it/feed/',                                                 source: 'Fanpage.it',          category: 'storie_assurde', isItalian: true },
  { url: 'https://www.today.it/feed/',                                                   source: 'Today.it',            category: 'storie_assurde', isItalian: true },
  { url: 'https://www.tgcom24.mediaset.it/rss/home.xml',                                source: 'TGcom24',             category: null,             isItalian: true },
  { url: 'https://www.wired.it/feed/',                                                   source: 'Wired Italia',        category: 'tecnologia',     isItalian: true },
  { url: 'https://www.leggo.it/feed/',                                                   source: 'Leggo.it',            category: 'storie_assurde', isItalian: true },
  { url: 'https://www.ilfattoquotidiano.it/category/societa/feed/',                      source: 'Il Fatto Quotidiano', category: 'storie_assurde', isItalian: true },
];

// ─── Fetch testo completo dell'articolo ───────────────────────────
// Scarica la pagina HTML e rimuove tag, script e stili con regex.
// Nessuna dipendenza nativa — funziona su qualsiasi ambiente.
async function fetchFullText(url, maxChars = 3000) {
  if (!url) return '';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return '';
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      // Rimuovi metadata tipici dei siti italiani (date, aggiornamenti, copyright)
      .replace(/\b(lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica)\s+\d+\s+\w+\s+\d{4}[^.|\n]*/gi, '')
      .replace(/aggiornato\s+il\s+[\d/]+[^.|\n]*/gi, '')
      .replace(/aggiornato alle?[\s\d:]+/gi, '')
      .replace(/pubblicato\s+il\s+[\d/]+[^.|\n]*/gi, '')
      .replace(/©\s*\d{4}[^.|\n]*/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    return text.substring(0, maxChars);
  } catch (e) {
    return '';
  }
}

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
  // Salute / Medicina / Benessere (generici)
  'vaccino', 'pandemia', 'covid', 'variante', 'ospedale', 'terapia intensiva',
  'tumore', 'cancro', 'farmaco', 'trial clinico', 'oms', 'aifa',
  'dieta', 'dimagrire', 'dimagramento', 'obesità', 'calorie', 'nutrizion',
  'bellezza', 'skincare', 'rughe', 'invecchiamento', 'chirurgia estetica',
  // Ambiente / Clima
  'cambiamento climatico', 'cop', 'emissioni', 'co2', 'siccità', 'alluvione',
  'terremoto', 'eruzione', 'maremoto', 'emergenza meteo',
  // Crimine serio / Violenza / Tragedia — MAI su OddFeed
  'omicidio', 'femminicidio', 'stupro', 'violenza sessuale', 'abuso', 'pedofil',
  'uccide', 'ucciso', 'uccisa', 'assassin', 'sparatoria', 'accoltell',
  'morto', 'morti', 'vittima', 'cadavere', 'corpo', 'strage', 'tragedia',
  'incidente mortale', 'suicid', 'aggressione', 'rapina', 'sequestro',
  'carcere', 'condanna', 'ergastolo', 'arresti domiciliari',
  'droga', 'cocaina', 'eroina', 'smercio', 'narcotraffico',
];

const rssParser = new RSSParser({
  timeout: 10000,
  customFields: {
    item: [
      ['media:content',   'mediaContent',   { keepArray: false }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: false }],
      ['enclosure',       'enclosure',      { keepArray: false }],
      ['media:group',     'mediaGroup',     { keepArray: false }],
    ],
  },
  requestOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    },
  },
});

// ─── Estrae URL immagine dall'item RSS (vari formati) ────────────
function getArticleImageUrl(item) {
  // media:content (standard RSS 2.0 + Media RSS)
  const mc = item.mediaContent;
  if (mc) {
    if (mc.$?.url) return mc.$.url;
    if (Array.isArray(mc) && mc[0]?.$?.url) return mc[0].$.url;
  }
  // media:thumbnail
  const mt = item.mediaThumbnail;
  if (mt?.$?.url) return mt.$.url;
  // media:group > media:content
  const mg = item.mediaGroup?.['media:content'];
  if (mg?.$?.url) return mg.$.url;
  if (Array.isArray(mg) && mg[0]?.$?.url) return mg[0].$.url;
  // enclosure (solo immagini, non audio/video)
  const enc = item.enclosure;
  if (enc?.url && /\.(jpe?g|png|webp|gif)/i.test(enc.url)) return enc.url;
  return null;
}

// ─── Colori per categoria (sfondo gradient card/NDL) ─────────────
const CATEGORY_COLORS = {
  animali:           ['#14532d', '#15803d'],
  tecnologia:        ['#1e3a8a', '#3730a3'],
  record:            ['#1e1b4b', '#4f46e5'],
  leggi:             ['#1c1917', '#44403c'],
  scienza:           ['#164e63', '#0e7490'],
  gastronomia:       ['#7f1d1d', '#b91c1c'],
  cultura:           ['#1e3a5f', '#1d4ed8'],
  luoghi:            ['#052e16', '#166534'],
  sesso_relazioni:   ['#831843', '#be185d'],
  gossip:            ['#4c1d95', '#7c3aed'],
  crimini_strani:    ['#1c1917', '#292524'],
  storie_assurde:    ['#7C2D12', '#b45309'],
  psicologia_strana: ['#2e1065', '#6d28d9'],
  soldi_folli:       ['#713f12', '#b45309'],
  coincidenze:       ['#0f172a', '#334155'],
  attualita:         ['#1e3a5f', '#2563eb'],
  gossip_spettacolo: ['#7c3aed', '#a855f7'],
};
function getCategoryColor(category) {
  return CATEGORY_COLORS[category] ?? ['#1e3a5f', '#2563eb'];
}

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

// ─── Fetch RSS da una lista di feed ───────────────────────────────
async function fetchFromFeeds(feeds, maxPerFeed = 10) {
  const results = [];
  for (const feed of feeds) {
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
        _isItalian: feed.isItalian ?? false,
        _source: feed.source,
        _imageUrl: getArticleImageUrl(item),
        sectionName: feed.isItalian ? 'Italian' : 'World',
      }));
      const flag = feed.isItalian ? '🇮🇹' : '🌍';
      console.log(`   ${flag} ${feed.source}: ${items.length} articoli`);
      results.push(...items);
    } catch (e) {
      console.log(`   ⚠️  ${feed.source} non raggiungibile: ${e.message.substring(0, 60)}`);
    }
    await new Promise(r => setTimeout(r, 200));
  }
  return results;
}

// ─── Funzione: scoring AI per selezionare solo storie davvero bizzarre ───
async function scoreAndSelectArticles(candidates, count = 5) {
  // Separa articoli italiani da internazionali
  const italianCandidates = candidates.filter(a => a._isItalian);
  const worldCandidates = candidates.filter(a => !a._isItalian);

  // Garantisce almeno 3 notizie italiane se disponibili
  const MIN_ITALIAN = Math.min(3, italianCandidates.length);
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

QUOTA ITALIA: il pubblico è italiano — se ci sono articoli 🇮🇹 che superano il test del bar, includi almeno ${MIN_ITALIAN} su ${count}. Se ne trovi di più buoni, includili tutti.

Lista articoli:
${summaries}

IMPORTANTE: è meglio salvare 2 notizie davvero buone che 5 mediocri. Se trovi solo 2-3 articoli che superano il test del bar, seleziona solo quelli. Non riempire i posti con notizie noiose.

Rispondi SOLO con un JSON valido:
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
      const fallback = candidates
        .filter(a => a._isItalian || ['storie_assurde','crimini_strani','animali','record','leggi','gossip'].includes(a._suggestedCategory))
        .slice(0, count);
      return fallback.length > 0 ? fallback : candidates.slice(0, count);
    }
    // NON completare con articoli extra se l'AI ne sceglie pochi:
    // meglio 2 notizie davvero buone che 5 mediocri.
    console.log(`   → ${selected.length} articoli selezionati dall'AI.`);
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
  // _fullText viene popolato dal fetch completo prima di chiamare questa funzione
  const fullText = article._fullText ?? article.fields?.bodyText ?? '';
  const bodyPreview = fullText.substring(0, 2500);

  const prompt = `Sei il redattore di OddFeed, un'app italiana di notizie bizzarre dal mondo.
Il tuo obiettivo è scrivere un articolo che il lettore voglia davvero leggere fino in fondo.

ARTICOLO ORIGINALE:
Titolo originale: ${headline}
Sommario: ${trail}
${bodyPreview ? `Testo completo: ${bodyPreview}` : ''}

═══ REGOLA N.1 — NON INVENTARE MAI ═══
Usa SOLO fatti presenti nell'articolo originale. Non aggiungere dettagli inventati.
Se il testo originale ha dettagli specifici (nomi, numeri, luoghi, citazioni), usali — rendono l'articolo credibile e interessante.

═══ TITOLO ═══
- Max 70 caratteri, emoji iniziale obbligatoria
- Cattura il fatto più assurdo/curioso con tono ironico
- Usa numeri reali se presenti ("47 gatti", "3 anni di prigione", ecc.)

═══ TESTO ═══
Scrivi 3-4 paragrafi sostanziosi (non liste, non bullet). Ogni paragrafo almeno 3-4 frasi.
- Paragrafo 1: apri con il fatto più assurdo per agganciare il lettore. Chi, cosa, dove, quando.
- Paragrafo 2: approfondisci con dettagli, contesto, background. Usa tutti i dettagli disponibili nell'originale.
- Paragrafo 3: sviluppi, reazioni, conseguenze o aspetti secondari interessanti presenti nell'articolo.
- Paragrafo 4 (opzionale): curiosità finale, dato sorprendente, o chiusura ironica se c'è materiale.

═══ DESCRIZIONE ═══
- 2 frasi che catturano l'essenza bizzarra (max 180 caratteri)

Rispondi SOLO con un JSON valido:
{
  "titleIt": "...",
  "titleEn": "...",
  "descriptionIt": "...",
  "descriptionEn": "...",
  "fullTextIt": "paragrafo 1\\n\\nparagrafo 2\\n\\nparagrafo 3\\n\\nparagrafo 4",
  "fullTextEn": "paragraph 1\\n\\nparagraph 2\\n\\nparagraph 3\\n\\nparagraph 4",
  "category": "una di: animali|scienza|tecnologia|record|leggi|cultura|gastronomia|luoghi|sesso_relazioni|gossip|crimini_strani|storie_assurde|psicologia_strana|soldi_folli|coincidenze",
  "categoryLabelIt": "es. 🐾 Animali",
  "categoryLabelEn": "es. 🐾 Animals",
  "imageEmoji": "1-2 emoji che rappresentano visivamente il soggetto principale (es: 🐊 per coccodrillo, 💰🔥 per soldi bruciati, 🧬🔬 per scoperta scientifica, 🍕😱 per cibo assurdo)",
  "engagementLevel": "high|medium|low"
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.6,
    max_tokens: 2500,
  });

  const raw = completion.choices[0].message.content ?? '{}';
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  // Primo tentativo: parse diretto
  try {
    return JSON.parse(clean);
  } catch (e1) {
    // Secondo tentativo: estrai solo il blocco JSON con regex
    try {
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
    } catch (e2) {}
    // Terzo tentativo: chiedi all'AI di riscrivere solo il JSON
    try {
      const fix = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: `Il seguente testo non è un JSON valido. Riscrivilo come JSON valido mantenendo tutti i valori ma correggendo la sintassi. Rispondi SOLO con il JSON:\n\n${clean}` },
        ],
        temperature: 0,
        max_tokens: 2500,
      });
      const fixed = (fix.choices[0].message.content ?? '{}').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(fixed);
    } catch (e3) {
      throw new Error(`JSON non parsabile dopo 3 tentativi: ${e1.message}`);
    }
  }
}

// ─── Calcola viewSeed realistico per il contatore social proof ────
// Il numero viene generato alla creazione in base al tipo/categoria.
// Lato client viene incrementato in base all'ora del giorno per sembrare reale.
function calcViewSeed(articleType, category) {
  const ranges = {
    top_odd:        [400, 1200],
    forbidden:      [300,  900],
    sesso_relazioni:[250,  800],
    gossip:         [200,  600],
    crimini_strani: [180,  500],
    storie_assurde: [120,  400],
  };
  const key = articleType === 'top_odd' ? 'top_odd'
    : articleType === 'forbidden' ? 'forbidden'
    : (category ?? 'storie_assurde');
  const [min, max] = ranges[key] ?? [80, 300];
  return Math.floor(Math.random() * (max - min + 1)) + min;
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

// ─── Notizie di attualità: selezione + rewrite breve ─────────────
async function fetchAndSaveCurrentNews(today, db) {
  console.log('\n📰 Recupero notizie di attualità...');

  // Controlla se esistono già
  const existing = await db.collection('articles')
    .where('date', '==', today)
    .where('articleType', '==', 'current')
    .get();

  if (!existing.empty && !process.argv.includes('--force')) {
    console.log(`   ℹ️  Notizie di attualità già presenti per ${today}, skip.`);
    return;
  }
  if (!existing.empty) {
    const del = db.batch();
    existing.docs.forEach(d => del.delete(d.ref));
    await del.commit();
  }

  const articles = await fetchFromFeeds(CURRENT_NEWS_FEEDS, 8);
  if (articles.length === 0) {
    console.log('   ⚠️  Nessun articolo di attualità trovato.');
    return;
  }

  // Selezione AI: top 6 notizie più importanti/rilevanti del giorno
  const summaries = articles.map((a, i) => {
    const cat = a._suggestedCategory === 'gossip_spettacolo' ? ' 🌟 gossip' : ' 📰 news';
    return `[${i}]${cat} ${a.webTitle} | ${(a.fields?.trailText ?? '').substring(0, 100)}`;
  }).join('\n');

  const selPrompt = `Sei il curatore di OddFeed. Seleziona le 6 notizie più importanti e rilevanti per un pubblico italiano tra queste.
Metti al primo posto la notizia più importante del giorno (news), poi puoi mescolare news e gossip.
Se ci sono notizie di gossip rilevanti (scandali, notizie inaspettate su VIP), includile.
Scarta notizie tecniche, comunicati stampa, articoli di opinione.

Lista:
${summaries}

Rispondi SOLO con JSON: {"selected": [i1, i2, i3, i4, i5, i6], "reasoning": "..."}`;

  let selectedArticles = [];
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: selPrompt }],
      temperature: 0.2,
      max_tokens: 200,
    });
    const raw = (res.choices[0].message.content ?? '{}').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(raw);
    console.log(`   Selezione AI: ${result.reasoning}`);
    selectedArticles = (result.selected ?? []).slice(0, 6).map(i => articles[i]).filter(Boolean);
  } catch (e) {
    console.log(`   ⚠️  Selezione fallita: ${e.message} — uso i primi 6`);
    selectedArticles = articles.slice(0, 6);
  }

  // Rewrite breve per ogni articolo selezionato
  const batch = db.batch();
  for (let i = 0; i < selectedArticles.length; i++) {
    const article = selectedArticles[i];
    process.stdout.write(`   [${i + 1}/${selectedArticles.length}] ${(article.webTitle ?? '').substring(0, 55)}... `);

    const rewritePrompt = `Sei un giornalista di OddFeed. Riscrivi questa notizia in italiano in modo chiaro e coinvolgente.

Titolo originale: ${article.webTitle}
Sommario: ${article.fields?.trailText ?? ''}

Scrivi:
- Un titolo accattivante (max 70 caratteri, emoji iniziale appropriata)
- Una descrizione di 2 frasi (max 160 caratteri)
- 2 paragrafi sostanziosi che spiegano la notizia con contesto e dettagli

Rispondi SOLO con JSON:
{
  "titleIt": "...", "titleEn": "...",
  "descriptionIt": "...", "descriptionEn": "...",
  "fullTextIt": "paragrafo 1\\n\\nparagrafo 2",
  "fullTextEn": "paragraph 1\\n\\nparagraph 2",
  "category": "attualita o gossip_spettacolo",
  "categoryLabelIt": "es. 📰 Attualità",
  "categoryLabelEn": "es. 📰 News",
  "imageEmoji": "1-2 emoji che rappresentano visivamente il soggetto principale (es: 🏛️ per politica, 🔬 per scienza, 🌊 per ambiente, 🎭 per gossip/spettacolo)"
}`;

    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: rewritePrompt }],
        temperature: 0.5,
        max_tokens: 800,
      });
      const raw = (res.choices[0].message.content ?? '{}').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const ai = JSON.parse(raw);
      const isGossip = (ai.category ?? '') === 'gossip_spettacolo';

      const docRef = db.collection('articles').doc();
      batch.set(docRef, {
        articleType: 'current',
        titleIt: ai.titleIt,
        titleEn: ai.titleEn,
        descriptionIt: ai.descriptionIt,
        descriptionEn: ai.descriptionEn,
        fullTextIt: ai.fullTextIt,
        fullTextEn: ai.fullTextEn,
        category: ai.category ?? 'attualita',
        categoryLabelIt: ai.categoryLabelIt ?? (isGossip ? '🌟 Gossip' : '📰 Attualità'),
        categoryLabelEn: ai.categoryLabelEn ?? (isGossip ? '🌟 Gossip' : '📰 News'),
        imageEmoji: ai.imageEmoji ?? (isGossip ? '🌟' : '📰'),
        imageColor: getCategoryColor(ai.category ?? (isGossip ? 'gossip_spettacolo' : 'attualita')),
        imageUrl: article._imageUrl ?? null,
        country: '🇮🇹 Italia',
        countryCode: 'IT',
        source: article._source ?? 'ANSA',
        sourceUrl: article.webUrl ?? '',
        date: today,
        order: i,
        isPremium: false,
        reactions: [
          { emoji: '🤯', count: 0, label: 'Sconvolto' },
          { emoji: '😮', count: 0, label: 'Sorpreso' },
          { emoji: '😂', count: 0, label: 'Divertente' },
          { emoji: '🤔', count: 0, label: 'Interessante' },
          { emoji: '❤️', count: 0, label: 'Adoro' },
        ],
        createdAt: new Date(),
      });
      process.stdout.write('✓\n');
    } catch (e) {
      process.stdout.write(`✗ (${e.message})\n`);
    }
    await new Promise(r => setTimeout(r, 400));
  }
  await batch.commit();
  console.log(`   ✅ ${selectedArticles.length} notizie di attualità salvate.`);
}

// ─── "Non dovresti leggerla" — articoli borderline/shock ──────────
// Usa lo stesso pool dei bizzarri ma con un prompt che cerca contenuto
// più scioccante, imbarazzante o morbosamente curioso.
async function fetchAndSaveForbiddenNews(today, db, articlePool) {
  console.log('\n🚫 Generazione "Non dovresti leggerla"...');

  const existing = await db.collection('articles')
    .where('date', '==', today)
    .where('articleType', '==', 'forbidden')
    .get();

  if (!existing.empty && !process.argv.includes('--force')) {
    console.log('   ℹ️  Articoli "Non dovresti" già presenti, skip.');
    return;
  }
  if (!existing.empty) {
    const del = db.batch();
    existing.docs.forEach(d => del.delete(d.ref));
    await del.commit();
  }

  if (articlePool.length === 0) {
    console.log('   ⚠️  Pool vuoto, skip.');
    return;
  }

  // Selezione AI: cerca il contenuto più scioccante/imbarazzante/morbosamente curioso
  const summaries = articlePool.map((a, i) => {
    const headline = a.fields?.headline ?? a.webTitle ?? '';
    const trail = a.fields?.trailText ?? '';
    return `[${i}] ${headline} | ${trail.substring(0, 100)}`;
  }).join('\n');

  const selPrompt = `Sei il curatore della sezione "Non dovresti leggerla" di OddFeed.
Questa sezione contiene le notizie più scioccanti, imbarazzanti o morbosamente curiose.
NON contenuto violento o traumatico — solo cose che fanno pensare "non avrei voluto saperlo".

Criteri di selezione (almeno uno):
- Comportamenti sessuali insoliti ma non volgari
- Scandali imbarazzanti o rivelazioni shock
- Crimini grotteschi o paradossali
- Rivelazioni che cambiano come si vede una cosa comune

Seleziona ESATTAMENTE 2 articoli. Se nessuno soddisfa i criteri, scegli i 2 più curiosi/imbarazzanti disponibili.

Lista:
${summaries}

Rispondi SOLO con JSON: {"selected": [i1, i2], "reasoning": "..."}`;

  let selectedIndices = [0, 1];
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: selPrompt }],
      temperature: 0.3,
      max_tokens: 150,
    });
    const raw = (res.choices[0].message.content ?? '{}').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(raw);
    console.log(`   Selezione: ${result.reasoning}`);
    selectedIndices = result.selected ?? [0, 1];
  } catch (e) {
    console.log(`   ⚠️  Selezione fallita: ${e.message} — uso i primi 2`);
  }

  const selectedArticles = selectedIndices.map(i => articlePool[i]).filter(Boolean).slice(0, 2);
  if (selectedArticles.length === 0) return;

  const batch = db.batch();
  for (let i = 0; i < selectedArticles.length; i++) {
    const article = selectedArticles[i];
    process.stdout.write(`   [${i + 1}/${selectedArticles.length}] ${(article.webTitle ?? '').substring(0, 50)}... `);

    if (!article._fullText) {
      article._fullText = await fetchFullText(article.webUrl);
    }

    const rewritePrompt = `Sei il redattore della sezione "Non dovresti leggerla" di OddFeed.
Riscrivi questa notizia con tono intrigante e leggermente misterioso, come se stessi rivelando un segreto.
Il lettore deve sentirsi come se leggesse qualcosa che "non dovrebbe sapere".

ARTICOLO ORIGINALE:
Titolo: ${article.webTitle}
Sommario: ${article.fields?.trailText ?? ''}
${article._fullText ? `Testo: ${article._fullText.substring(0, 2000)}` : ''}

REGOLE:
- Titolo: inizia con "🚫" + max 65 caratteri, tono misterioso/intrigante
- 3 paragrafi sostanziosi, tono narrativo
- Rimani sui fatti reali — il mistero viene dal modo di raccontare
- Categoria: sesso_relazioni, gossip, crimini_strani, o storie_assurde

Rispondi SOLO con JSON:
{
  "titleIt": "🚫 ...",
  "titleEn": "🚫 ...",
  "descriptionIt": "...",
  "descriptionEn": "...",
  "fullTextIt": "paragrafo 1\\n\\nparagrafo 2\\n\\nparagrafo 3",
  "fullTextEn": "...",
  "category": "...",
  "categoryLabelIt": "...",
  "categoryLabelEn": "..."
}`;

    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: rewritePrompt }],
        temperature: 0.7,
        max_tokens: 1500,
      });
      const raw = (res.choices[0].message.content ?? '{}').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      let ai;
      try { ai = JSON.parse(raw); }
      catch { const m = raw.match(/\{[\s\S]*\}/); ai = m ? JSON.parse(m[0]) : null; }
      if (!ai) { process.stdout.write('✗ (JSON non parsabile)\n'); continue; }

      const category = ai.category ?? 'storie_assurde';
      const docRef = db.collection('articles').doc();
      batch.set(docRef, {
        articleType: 'forbidden',
        isForbidden: true,
        isPremium: true,
        titleIt: ai.titleIt,
        titleEn: ai.titleEn,
        descriptionIt: ai.descriptionIt,
        descriptionEn: ai.descriptionEn,
        fullTextIt: ai.fullTextIt,
        fullTextEn: ai.fullTextEn,
        category,
        categoryLabelIt: ai.categoryLabelIt ?? '🚫 Non dovresti',
        categoryLabelEn: ai.categoryLabelEn ?? '🚫 Forbidden',
        imageEmoji: '🚫',
        imageColor: getCategoryColor(category),
        imageUrl: article._imageUrl ?? null,
        country: guessCountry(article),
        source: article._source ?? 'OddFeed',
        sourceUrl: article.webUrl ?? '',
        date: today,
        order: i,
        viewSeed: calcViewSeed('forbidden', category),
        reactions: [
          { emoji: '🤯', count: 0, label: 'Sconvolto' },
          { emoji: '😮', count: 0, label: 'Sorpreso' },
          { emoji: '😂', count: 0, label: 'Divertente' },
          { emoji: '🤔', count: 0, label: 'Interessante' },
          { emoji: '❤️', count: 0, label: 'Adoro' },
        ],
        createdAt: new Date(),
      });
      process.stdout.write('✓\n');
    } catch (e) {
      process.stdout.write(`✗ (${e.message})\n`);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  await batch.commit();
  console.log(`   ✅ ${selectedArticles.length} articoli "Non dovresti leggerla" salvati.`);
}

// ─── Funzione principale ───────────────────────────────────────────
async function main() {
  console.log('🚀 OddFeed — Generazione notizie del giorno\n');

  // Supporta --date YYYY-MM-DD per rigenerare giorni specifici
  const dateArg = process.argv.find(a => a.startsWith('--date='));
  const today = dateArg
    ? dateArg.replace('--date=', '')
    : new Date().toISOString().split('T')[0];

  // Supporta --notify-only per inviare solo notifiche senza rigenerare articoli
  // Supporta --slot=morning|lunch|evening per specificare la fascia oraria
  const notifyOnly = process.argv.includes('--notify-only');
  const slotArg = process.argv.find(a => a.startsWith('--slot='));
  const currentSlot = slotArg ? slotArg.replace('--slot=', '') : 'morning'; // morning|lunch|evening

  if (notifyOnly) {
    console.log(`🔔 Modalità notifiche-only — fascia: ${currentSlot}`);
    const snap = await db.collection('articles').where('date', '==', today).get();
    if (snap.empty) {
      console.log('   ℹ️  Nessun articolo per oggi — notifiche non inviate.');
      process.exit(0);
    }
    const articles = snap.docs
      .filter(d => (d.data().articleType ?? 'bizarre') !== 'current')
      .map(d => ({ id: d.id, ...d.data() }));
    await sendPersonalizedNotifications(articles, currentSlot);
    process.exit(0);
  }

  console.log(`📅 Data target: ${today}\n`);

  // Controlla se le notizie di oggi esistono già
  const existing = await db.collection('articles')
    .where('date', '==', today)
    .get();

  if (!existing.empty) {
    if (!process.argv.includes('--force')) {
      console.log(`ℹ️  Le notizie per oggi (${today}) esistono già su Firestore.`);
      console.log('   Invio comunque le notifiche push...');
      // Non rigeneriamo gli articoli, ma inviamo le notifiche (potrebbero non essere state mandate)
      const existingArticles = existing.docs
        .filter(d => (d.data().articleType ?? 'bizarre') !== 'current')
        .map(d => ({ id: d.id, ...d.data() }));
      await sendPersonalizedNotifications(existingArticles, 'morning');
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

  // Recupera da fonti internazionali specializzate in notizie bizzarre
  console.log('🌍 Recupero notizie bizzarre internazionali...');
  const worldArticles = await fetchFromFeeds(BIZARRE_RSS_FEEDS, 10);

  // Recupera da fonti italiane per contenuto locale
  console.log('\n🇮🇹 Recupero notizie italiane...');
  const italianArticles = await fetchFromFeeds(ITALIAN_RSS_FEEDS, 10);

  const allArticles = [...worldArticles, ...italianArticles];

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

  // ⭐ Scoring AI: seleziona le 6 storie più virali/bizzarre dal pool
  const MAX_ARTICLES = 6;
  console.log('\n⭐ Selezione AI delle storie più virali...');
  const selected = await scoreAndSelectArticles(pool, MAX_ARTICLES);

  // Riordina: categorie non-premium prima, così i primi 2 articoli (free) non sono mai premium
  const PREMIUM_CATS = new Set(['sesso_relazioni', 'gossip', 'crimini_strani']);
  selected.sort((a, b) => {
    const aPremium = PREMIUM_CATS.has(a._suggestedCategory ?? '') ? 1 : 0;
    const bPremium = PREMIUM_CATS.has(b._suggestedCategory ?? '') ? 1 : 0;
    return aPremium - bPremium;
  });

  // Processa con AI e salva su Firestore
  // Scarica il testo completo di ogni articolo selezionato
  console.log('\n📄 Download testo completo degli articoli...');
  for (let i = 0; i < selected.length; i++) {
    const article = selected[i];
    const url = article.webUrl;
    process.stdout.write(`   [${i + 1}/${selected.length}] ${(article.webTitle ?? '').substring(0, 50)}... `);
    const fullText = await fetchFullText(url);
    article._fullText = fullText;
    process.stdout.write(fullText ? `✓ (${fullText.length} chars)\n` : '⚠️  nessun testo\n');
    await new Promise(r => setTimeout(r, 300));
  }

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
      // isPremium = true se non sono i primi 2 articoli OPPURE se è in una categoria premium
      const isPremiumArticle = i > 1 || PREMIUM_CATS.has(category);
      // Top Odd News: i 3 articoli più assurdi (i primi dopo ordinamento AI per bizarreness)
      const isTopOdd = i < 3;

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
        imageEmoji: ai.imageEmoji ?? '🌍',
        imageColor: getCategoryColor(category),
        imageUrl: article._imageUrl ?? null,
        country: guessCountry(article),
        source: article._source ?? 'The Guardian',
        sourceUrl: article.webUrl,
        date: today,
        isToday: true,
        order: i,
        isPremium: isPremiumArticle,
        isTopOdd,
        viewSeed: calcViewSeed(isTopOdd ? 'top_odd' : 'bizarre', category),
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

  // Genera le notizie di attualità ("In primo piano")
  await fetchAndSaveCurrentNews(today, db);

  // Genera gli articoli "Non dovresti leggerla" dal pool già scaricato
  await fetchAndSaveForbiddenNews(today, db, selected);

  // Invia notifica push personalizzata per categoria (fascia mattina)
  console.log('\n🔔 Invio notifiche push personalizzate (fascia Colazione)...');
  await sendPersonalizedNotifications(savedArticles, 'morning');
  console.log('   L\'app mostrerà automaticamente i nuovi contenuti.');

  // Chiude esplicitamente il processo: Firebase Admin SDK tiene aperte le connessioni
  // e Node.js non esce da solo, causando un timeout di 30 minuti su GitHub Actions.
  process.exit(0);
}

// ─── Notifiche personalizzate per categoria ───────────────────────
// Per ogni utente, invia la notizia più rilevante in base ai suoi interessi.
//
// slot: 'morning' | 'lunch' | 'evening'
//   morning  → utenti con fascia "Colazione" / "Breakfast" + utenti Premium (1a notifica)
//   lunch    → utenti con fascia "Pranzo" / "Lunch" + utenti Premium (2a notifica)
//   evening  → utenti con fascia "Pomeriggio" / "Afternoon" / "Cena" / "Dinner" + Premium (3a)
//
// Free:    1 notifica/giorno nella loro fascia scelta. Tracking: lastNotifDate (per slot)
// Premium: fino a 3 notifiche/giorno. Tracking: lastNotifMorning, lastNotifLunch, lastNotifEvening

// Mappa slot → label fascia utente (IT + EN)
const SLOT_LABELS = {
  morning: ['Colazione', 'Breakfast'],
  lunch:   ['Pranzo', 'Lunch'],
  evening: ['Pomeriggio', 'Afternoon', 'Cena', 'Dinner'],
};

// Campo Firestore aggiornato dopo l'invio per ogni slot
const SLOT_FIELD = {
  morning: 'lastNotifMorning',
  lunch:   'lastNotifLunch',
  evening: 'lastNotifEvening',
};

// Indice articolo da usare per slot (premium riceve articoli diversi in ogni fascia)
const SLOT_ARTICLE_INDEX = {
  morning: 0,
  lunch:   1,
  evening: 2,
};

async function sendPersonalizedNotifications(articles, slot = 'morning') {
  const usersSnap = await db.collection('users')
    .where('notificationsEnabled', '==', true)
    .get();

  if (usersSnap.empty) {
    console.log('   Nessun utente con notifiche attive.');
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const messages = [];
  const slotLabels = SLOT_LABELS[slot] ?? SLOT_LABELS.morning;
  const slotField  = SLOT_FIELD[slot]  ?? SLOT_FIELD.morning;
  const articleIdx = SLOT_ARTICLE_INDEX[slot] ?? 0;

  for (const userDoc of usersSnap.docs) {
    const user = userDoc.data();
    if (!user.expoPushToken) continue;

    const isPremium = user.isPremium ?? false;
    const prefs = user.notificationPrefs ?? {};
    if (prefs.enabled === false) continue;

    const interests = user.interests ?? [];
    const userSlot  = user.notificationSlot ?? 'Colazione'; // stringa salvata

    if (isPremium) {
      // Premium: notifica ad ogni fascia, purché non già ricevuta oggi per questo slot
      if (user[slotField] === today) continue;
    } else {
      // Free: notifica solo nella fascia scelta, una volta al giorno
      if (!slotLabels.includes(userSlot)) continue;
      if (user.lastNotifDate === today) continue;
    }

    // Seleziona l'articolo: premium riceve quello al suo indice-slot, free il migliore
    const relevantArticle = isPremium
      ? findBestArticleForUser(articles, interests, true, articleIdx)
      : findBestArticleForUser(articles, interests, false, 0);
    if (!relevantArticle) continue;

    const { title, body } = buildNotifText(relevantArticle, isPremium);

    messages.push({
      token: user.expoPushToken,
      userId: userDoc.id,
      isPremium,
      slotField,
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

  console.log(`   Invio a ${messages.length} utenti (slot: ${slot})...`);

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

    // Aggiorna il campo notif appropriato per ogni utente notificato
    const batchUpdate = db.batch();
    chunk.forEach(({ userId, isPremium: userIsPremium, slotField: sf }) => {
      const update = userIsPremium
        ? { [sf]: today }               // Premium: traccia per slot
        : { lastNotifDate: today };      // Free: traccia per giorno
      batchUpdate.update(db.collection('users').doc(userId), update);
    });
    await batchUpdate.commit();
  }
}

// Trova l'articolo migliore per un utente in base ai suoi interessi.
// articleIndex consente ai premium di ricevere articoli diversi in ogni fascia oraria.
function findBestArticleForUser(articles, interests, isPremium, articleIndex = 0) {
  const accessibleArticles = isPremium
    ? articles
    : articles.filter(a => !a.isPremium);

  if (interests.length === 0) {
    // Nessuna preferenza: ritorna l'articolo all'indice richiesto
    return accessibleArticles[articleIndex] ?? accessibleArticles[0] ?? null;
  }

  // Priorità: articoli nelle categorie di interesse
  const interestSet = new Set(interests);
  const relevant = accessibleArticles.filter(a => interestSet.has(a.category));

  // Per i premium, pesca dall'indice richiesto nella lista rilevante
  const ranked = [...relevant, ...accessibleArticles.filter(a => !interestSet.has(a.category))];
  return ranked[articleIndex] ?? ranked[0] ?? null;
}

// Costruisce titolo e body della notifica
function buildNotifText(article, isPremium) {
  const EMOJI_MAP = {
    sesso_relazioni: '💋', gossip: '🌟', crimini_strani: '🔪',
    storie_assurde: '🤪', psicologia_strana: '🧠', soldi_folli: '💸',
    coincidenze: '🌀', tecnologia: '💻', record: '🏆',
    animali: '🐾', scienza: '🔬', leggi: '⚖️',
    cultura: '🌍', gastronomia: '🍽️', luoghi: '📍',
    attualita: '📰', gossip_spettacolo: '🌟',
  };
  const emoji = EMOJI_MAP[article.category] ?? '📰';

  if (isPremium) {
    // Premium: usa il titolo riscritto come gancio, tono più coinvolgente
    const titleText = article.titleIt?.substring(0, 55) ?? 'Notizia del giorno';
    return {
      title: `${titleText}`,
      body: 'Buongiorno. La storia più assurda di oggi ti aspetta.',
    };
  }

  // Free: tono standard
  const titleText = article.titleIt?.substring(0, 60) ?? 'Notizia del giorno';
  return {
    title: `${emoji} ${titleText}`,
    body: 'La tua notizia curiosa di oggi è pronta.',
  };
}

main().catch(console.error);

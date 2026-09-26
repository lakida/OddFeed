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
  // ── Fonti core bizzarre internazionali (verificate) ──────────────────────────
  { url: 'https://rss.upi.com/news/Odd_News.rss',                        source: 'UPI Odd News',       category: 'storie_assurde', isItalian: false },
  { url: 'https://nypost.com/weird-but-true/feed/',                       source: 'NY Post Weird',      category: 'storie_assurde', isItalian: false },
  { url: 'https://www.odditycentral.com/feed',                            source: 'Oddity Central',     category: 'storie_assurde', isItalian: false },
  { url: 'https://www.boredpanda.com/feed/',                              source: 'Bored Panda',        category: 'storie_assurde', isItalian: false },
  { url: 'https://www.mentalfloss.com/rss.xml',                           source: 'Mental Floss',       category: 'storie_assurde', isItalian: false },
  // ── Crimini assurdi / incompetenti ──────────────────────────────────────────
  { url: 'https://www.thesmokinggun.com/rss.xml',                         source: 'The Smoking Gun',    category: 'crimini_strani', isItalian: false },
  // ── Reddit — notizie reali che sembrano inventate (perfetto per OddFeed) ────
  { url: 'https://www.reddit.com/r/nottheonion/.rss',                     source: 'r/nottheonion',      category: 'storie_assurde', isItalian: false },
  { url: 'https://www.reddit.com/r/mildlyinfuriating/.rss',               source: 'r/mildlyinfuriating',category: 'storie_assurde', isItalian: false },
  { url: 'https://www.reddit.com/r/tifu/.rss',                            source: 'r/tifu',             category: 'storie_assurde', isItalian: false },
  // ── Animali & natura bizzarra ────────────────────────────────────────────────
  { url: 'https://www.reddit.com/r/AnimalsBeingDerps/.rss',               source: 'r/AnimalsBeingDerps',category: 'animali',        isItalian: false },
  // ── Record & storie estreme ──────────────────────────────────────────────────
  { url: 'https://www.guinnessworldrecords.com/news/rss',                  source: 'Guinness Records',   category: 'record',         isItalian: false },
  // ── Leggi assurde & burocrazia folle ────────────────────────────────────────
  { url: 'https://reason.com/feed/',                                       source: 'Reason',             category: 'leggi',          isItalian: false },
  // ── Tecnologia strana ───────────────────────────────────────────────────────
  { url: 'https://feeds.arstechnica.com/arstechnica/index',               source: 'Ars Technica',       category: 'tecnologia',     isItalian: false },
];

// ─── Fonti RSS attualità (notizie del giorno + gossip) ────────────
// Usate per la sezione "In primo piano" in Home — visibile a tutti.
const CURRENT_NEWS_FEEDS = [
  // Attualità italiana — URL ANSA aggiornato (il vecchio /mondo/rss.xml dava 404)
  { url: 'https://www.ansa.it/sito/ansait_rss.xml',                   source: 'ANSA',        category: 'attualita' },
  { url: 'https://www.corriere.it/rss/homepage.xml',                  source: 'Corriere',    category: 'attualita' },
  { url: 'https://www.repubblica.it/rss/homepage/rss2.0.xml',         source: 'Repubblica',  category: 'attualita' },
  // Gossip / Spettacolo
  { url: 'https://www.tgcom24.mediaset.it/spettacolo/rss.xml',        source: 'TGcom24 TV',        category: 'gossip_spettacolo' },
  { url: 'https://www.gossip.it/feed/',                               source: 'Gossip.it',         category: 'gossip_spettacolo' },
  { url: 'https://www.adnkronos.com/RSS_Spettacolo.xml',              source: 'Adnkronos Spettacolo', category: 'gossip_spettacolo' },
  // TvBlog sostituito con La Stampa (TvBlog dava 403)
  { url: 'https://www.lastampa.it/rss/copertina.xml',                 source: 'La Stampa',   category: 'attualita' },
];

// ─── Fonti RSS italiane ed europee ────────────────────────────────
// Priorità a fonti orientate al virale/bizzarro/curioso.
// RIMOSSI: ANSA cronaca e Corriere cronache — portano omicidi e crimini seri.
// AGGIUNTO: ANSA "Strani ma veri" — sezione dedicata alle notizie bizzarre.
const ITALIAN_RSS_FEEDS = [
  // ANSA Lifestyle (sostituisce ANSA Strani ma veri — 404)
  { url: 'https://www.ansa.it/canale_lifestyle/notizie/lifestyle_rss.xml',               source: 'ANSA Lifestyle',      category: 'storie_assurde', isItalian: true },
  // ANSA Cultura (sostituisce ANSA Curiosità — 404)
  { url: 'https://www.ansa.it/sito/notizie/cultura/cultura_rss.xml',                     source: 'ANSA Cultura',        category: 'storie_assurde', isItalian: true },
  // Libero Quotidiano (sostituisce Fanpage.it — 403)
  { url: 'https://www.liberoquotidiano.it/rss.xml',                                      source: 'Libero Quotidiano',   category: 'storie_assurde', isItalian: true },
  // Il Tempo (sostituisce Today.it — 404)
  { url: 'https://www.iltempo.it/rss.xml',                                               source: 'Il Tempo',            category: 'storie_assurde', isItalian: true },
  { url: 'https://www.tgcom24.mediaset.it/rss/home.xml',                                 source: 'TGcom24',             category: null,             isItalian: true },
  // ANSA Tecnologia (sostituisce Wired Italia — 400)
  { url: 'https://www.ansa.it/canale_tecnologia/notizie/tecnologia_rss.xml',             source: 'ANSA Tecnologia',     category: 'tecnologia',     isItalian: true },
  // Il Messaggero (sostituisce Leggo.it — 404)
  { url: 'https://www.ilmessaggero.it/rss/home.xml',                                     source: 'Il Messaggero',       category: 'storie_assurde', isItalian: true },
  { url: 'https://www.ilfattoquotidiano.it/category/societa/feed/',                       source: 'Il Fatto Quotidiano', category: 'storie_assurde', isItalian: true },
  // Adnkronos Cultura — notizie di cultura, spettacolo, curiosità
  { url: 'https://www.adnkronos.com/RSS_Cultura.xml',                                    source: 'Adnkronos Cultura',   category: 'storie_assurde', isItalian: true },
];

// ─── Fonti RSS sesso & relazioni ──────────────────────────────────
// Feed internazionali/italiani specializzati in sesso, amore, relazioni.
// Gli articoli vengono pre-filtrati per keyword prima di essere passati all'AI.
const SEX_RELATIONS_FEEDS = [
  { url: 'https://www.cosmopolitan.com/rss/all.xml',          source: 'Cosmopolitan',    isItalian: false },
  { url: 'https://www.menshealth.com/rss/all.xml',            source: 'Men\'s Health',   isItalian: false },
  { url: 'https://www.womenshealthmag.com/rss/all.xml',       source: 'Women\'s Health', isItalian: false },
  { url: 'https://www.vanityfair.it/feed',                    source: 'Vanity Fair IT',  isItalian: true  },
  { url: 'https://style.corriere.it/feed/',                   source: 'Style Corriere',  isItalian: true  },
  { url: 'https://www.iodonna.it/feed/',                      source: 'io Donna',        isItalian: true  },
];

// Keyword che segnalano un articolo di sesso/relazioni — usate per pre-filtrare
// il pool ampio (Cosmo, MH, WH pubblicano anche fitness, beauty, ecc.)
const SEX_KEYWORDS = [
  'sex', 'sexual', 'sexuality', 'orgasm', 'libido', 'erotic', 'intimate', 'intimacy',
  'relationship', 'dating', 'romance', 'romantic', 'affair', 'hookup', 'flirt',
  'condom', 'contraception', 'pleasure', 'foreplay', 'kink', 'fetish',
  'sesso', 'sessuale', 'sessualità', 'orgasmo', 'libido', 'erotico', 'intimità',
  'relazione', 'appuntamento', 'romantico', 'relazioni', 'coppia', 'tradimento',
  'fedeltà', 'infedeltà', 'desiderio', 'piacere',
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

MISSIONE: OddFeed esiste per raccontare storie che fanno esclamare "MA DAI?!" ad alta voce. Storie che si condividono su WhatsApp perché troppo assurde per non dirlo a qualcuno.

═══ TEST VIRALE ═══
Prima di selezionare un articolo, chiediti: "Se mando questa storia su un gruppo WhatsApp, la gente risponde con 😱🤣😂 o con il silenzio?"
→ Silenzio = scarta. Reazioni = includi.

✅ SELEZIONA SOLO se c'è UNO di questi elementi:
1. ASSURDO UMANO: Una persona che fa qualcosa di talmente stupido/folle/imbarazzante da essere quasi incredibile (es. ladro che chiama il 112 per denunciare che gli hanno rubato la droga; uomo arrestato tre volte nello stesso giorno)
2. ANIMALE PROTAGONISTA: Un animale che fa cose che non dovrebbe fare in posti impossibili (es. orso che guida un carrello al supermercato; pinguino che sfugge allo zoo e vive in un ristorante di pesce per 3 settimane)
3. RECORD O CASO ESTREMO: Qualcosa di così esagerato che sembra impossibile ma è vero (es. donna che vince alla lotteria 4 volte nella stessa settimana; uomo che vive in aeroporto per 7 anni)
4. LEGGE O SENTENZA RIDICOLA: Regole o decisioni giudiziarie che fanno ridere/inorridire (es. condannato a 15 anni per aver rubato 3 caramelle in Louisiana; città che vieta ai residenti di urlare dopo le 10)
5. COINCIDENZA INCREDIBILE: Qualcosa di così improbabile da sembrare inventato
6. CRIMINE TRAGICOMICO: Ladri/criminali talmente incompetenti o assurdi da essere comici
7. SCANDALO IMBARAZZANTE: Situazioni umilianti che coinvolgono personaggi pubblici in modi inaspettati

❌ SCARTA SENZA ECCEZIONI — non importa quanto sembri "interessante":
- Qualsiasi notizia di politica, governo, elezioni (ANCHE bizzarra nella forma)
- Economia, mercati, aziende (anche se c'è un fatto strano)
- Guerra, conflitti, tensioni internazionali
- Sport (partite, record sportivi, trasferimenti)
- Salute, farmaci, studi scientifici (anche curiosi)
- Clima, meteo, disastri naturali
- Astronomia, spazio, NASA/ESA (salvo alieni veri... che non esistono)
- "Studio rivela che..." o "Ricerca dimostra che..." → quasi sempre noiosi
- Notizie con titoli che iniziano con "Come..." o "Perché..." o "I vantaggi di..."
- Qualsiasi cosa che in un TG normale sarebbe nella sezione "economia" o "esteri"

QUOTA ITALIA: il pubblico è italiano — se ci sono articoli 🇮🇹 che superano il test virale, includi almeno ${MIN_ITALIAN} su ${count}.

Lista articoli:
${summaries}

IMPORTANTE: Seleziona idealmente 6-10 articoli. Se ne trovi di meno buoni, seleziona solo quelli buoni (meglio 4 virali che 10 mediocri). NON selezionare articoli che non superano il test virale solo per raggiungere un numero — la qualità è più importante della quantità. Ma ricorda: se un articolo ti fa anche solo sorridere o alzare un sopracciglio, probabilmente vale la pena includerlo.

Rispondi SOLO con un JSON valido (niente testo prima o dopo):
{"selected": [indici dal più virale/assurdo al meno, es. [3, 7, 1]]}`;

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
- Max 75 caratteri, NIENTE emoji — solo testo
- Deve contenere IL fatto più assurdo — chi legge il titolo deve già capire perché la storia è incredibile
- Usa numeri reali e specifici ("47 gatti", "3 anni di prigione", "9 anni senza dirlo")
- Scrivi come un amico che racconta una storia incredibile, NON come un giornalista
- Il titolo deve creare immediato stupore/risata/incredulità

ESEMPI — studia queste trasformazioni:
- ✗ "🐊 Coccodrillo trovato in appartamento a Miami" → generico, potrebbe essere ovunque
- ✓ "🐊 Viveva con un coccodrillo da 9 anni senza dirlo al padrone di casa" → specifico, assurdo, personale
- ✗ "🐈 Gatto entra in banca a Londra" → descrittivo, noioso
- ✓ "🐈 Un gatto si è presentato in banca come cliente e ha aspettato in fila per 20 minuti" → cinematografico
- ✗ "🍕 Uomo denuncia ristorante per pizza sbagliata" → normale
- ✓ "🍕 Ha fatto causa per 5 anni a una pizzeria perché gli hanno messo il mais: ha vinto" → specifico, escalation, sorpresa finale
- ✗ "💰 Truffatore arrestato dopo aver rubato milioni" → normale cronaca
- ✓ "💰 Ha truffato 3 milioni di euro fingendosi farmacista su TikTok — i clienti lo seguivano ancora dopo l'arresto" → dettaglio incredibile

═══ TESTO ═══
Scrivi 3-4 paragrafi sostanziosi (non liste, non bullet). Ogni paragrafo almeno 3-4 frasi.
- Paragrafo 1: INIZIA con il fatto più assurdo già nella prima frase — NON costruire suspense prima di rivelare il fatto. Il lettore deve capire subito perché questa storia è incredibile. Chi, cosa, dove, quando. Sii diretto e specifico.
- Paragrafo 2: approfondisci con dettagli, contesto, background. Usa TUTTI i dettagli specifici disponibili nell'originale (nomi, numeri, date, luoghi). I dettagli specifici rendono la storia credibile e ancora più incredibile.
- Paragrafo 3: sviluppi, reazioni, conseguenze o aspetti secondari. Come hanno reagito le persone coinvolte? Cosa è successo dopo? Le reazioni degli altri spesso sono la parte più divertente.
- Paragrafo 4 (opzionale): curiosità finale, statistica sorprendente, confronto con casi simili, o chiusura ironica. Se hai materiale, chiudi con una frase che fa riflettere o ridere.

Tono: conversazionale e ironico, come se stessi raccontando la storia a un amico. NON usare il gergo giornalistico tipo "fonti confermano", "secondo quanto emerge", "la vicenda".

═══ DESCRIZIONE ═══
- 2 frasi concise che catturano l'essenza bizzarra. La prima deve essere il fatto più incredibile, la seconda un dettaglio che amplifica lo stupore. Max 180 caratteri.

Rispondi SOLO con un JSON valido:
{
  "titleIt": "...",
  "titleEn": "...",
  "descriptionIt": "...",
  "descriptionEn": "...",
  "descriptionIg": "2-3 frasi, max 280 caratteri, tono parlante e curioso — racconta il fatto principale più un dettaglio di contesto che aiuta a capire la storia. Stile: come se lo raccontassi a un amico su Instagram. Può iniziare con una domanda o fatto sorprendente, poi aggiunge il contesto essenziale. NO gergo giornalistico. Es: 'Un uomo in Florida ha chiamato il 112 per denunciare che gli avevano rubato la droga. La polizia è arrivata, ha confermato il furto... e lo ha arrestato.' oppure 'Viveva con un coccodrillo da 9 anni nel suo appartamento a Miami. Il padrone di casa lo ha scoperto solo quando il rettile ha risposto al campanello.'",
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

Rispondi SOLO con JSON (niente testo prima o dopo): {"selected": [i1, i2, i3, i4, i5, i6]}`;

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

    const rewritePrompt = `Sei il giornalista-star di OddFeed. Riscrivi questa notizia in italiano per un pubblico giovane e curioso — deve essere impossibile non leggerla.

Titolo originale: ${article.webTitle}
Sommario: ${article.fields?.trailText ?? ''}

═══ TITOLO (max 70 caratteri) ═══
NIENTE emoji — solo testo. Il titolo deve contenere il fatto reale, non nasconderlo.
Deve essere chiaro e specifico: chi ha fatto cosa. Puoi renderlo coinvolgente ma NON vago.
Usa numeri e dettagli concreti quando disponibili.

ESEMPI:
  ✗ "La notizia che sta sconvolgendo tutti"  → vago, non dice niente
  ✓ "Condannato a 3 anni per aver falsificato 200 ricette mediche su TikTok"  → chiaro e specifico
  ✗ "Il dettaglio che nessuno ti ha mai detto"  → nasconde il fatto
  ✓ "La legge italiana che vieta di fare rumore in bagno dopo le 22"  → diretto e curioso

═══ DESCRIZIONE (max 160 caratteri) ═══
2 frasi. Prima: il fatto core. Seconda: la svolta o il dettaglio che incuriosisce.

═══ TESTO ═══
2 paragrafi sostanziosi. Ogni paragrafo almeno 3-4 frasi.
Paragrafo 1: INIZIA subito con il fatto reale — chi, cosa, dove, quando. Il lettore deve capire esattamente cosa è successo già dalla prima frase. Niente suspense prima di rivelare il fatto, niente eufemismi o linguaggio vago.
Paragrafo 2: contesto, conseguenze, reazione pubblica. Usa tutti i dettagli specifici disponibili (nomi, numeri, luoghi).

Rispondi SOLO con JSON:
{
  "titleIt": "...", "titleEn": "...",
  "descriptionIt": "...", "descriptionEn": "...",
  "fullTextIt": "paragrafo 1\\n\\nparagrafo 2",
  "fullTextEn": "paragraph 1\\n\\nparagraph 2",
  "category": "attualita o gossip_spettacolo",
  "categoryLabelIt": "es. 📰 Attualità",
  "categoryLabelEn": "es. 📰 News",
  "imageEmoji": "1-2 emoji che rappresentano visivamente il soggetto (es: 🏛️ politica, 🔬 scienza, 🌊 ambiente, 🎭 gossip)"
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

    const rewritePrompt = `Sei il redattore capo della sezione "Non dovresti leggerla" di OddFeed.
Questa è la sezione più cliccata dell'app — il titolo deve essere irresistibile.
Il lettore deve sentirsi come se stesse per scoprire qualcosa che "non avrebbe dovuto sapere".

ARTICOLO ORIGINALE:
Titolo: ${article.webTitle}
Sommario: ${article.fields?.trailText ?? ''}
${article._fullText ? `Testo: ${article._fullText.substring(0, 2000)}` : ''}

═══ TITOLO ═══
Max 65 caratteri, NIENTE emoji — solo testo. Il titolo deve dire chiaramente cosa è successo.
Può essere intrigante e diretto allo stesso tempo — usa il fatto reale come gancio.
Usa dettagli specifici (nomi, numeri, azioni concrete).
  ✗ "La confessione che nessuno oserebbe fare"  → vago, non dice niente
  ✓ "Arrestato per aver tirato un peto in faccia alla moglie mentre dormiva"  → chiaro e assurdo
  • Rivelazione shock: "🚫 La verità dietro X che cambia tutto quello che pensavi"
  • Contraddizione: "🚫 Ha fatto X — e tutti continuano a dargli ragione"

EVITA titoli generici, descrittivi o che sembrino un comunicato stampa.
✗ "🚫 Uomo scoperto a fare qualcosa di strano in un supermercato"
✓ "🚫 È stato fermato 12 volte nello stesso supermercato — nessuno sa perché continuasse"

═══ DESCRIZIONE (max 160 caratteri) ═══
Prima frase: il fatto principale espresso chiaramente (cosa è successo, in modo diretto). Seconda frase: il dettaglio più sorprendente o la conseguenza. Niente frasi vaghe o misteriose.

═══ TESTO ═══
3 paragrafi narrativi. Apri con il fatto reale esatto (cosa è successo, chi, dove),
poi costruisci il contesto, poi chiudi con la conseguenza o la rivelazione finale.
Tono: giornalismo tabloide di qualità — divertente ma CHIARO.
IMPORTANTE: il lettore deve capire esattamente cosa è successo già dal primo paragrafo.
Non usare eufemismi o linguaggio vago per nascondere i fatti — racconta quello che è successo davvero.
Categoria: sesso_relazioni, gossip, crimini_strani, o storie_assurde

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

// ─── Sesso & Relazioni: 2 articoli al giorno (Premium) ────────────
// Fetcha da Cosmopolitan, Men's Health, Women's Health, Donna Moderna, io Donna.
// Pre-filtra per keyword, poi GPT seleziona i 2 più interessanti.
// Salvati come articleType: 'current', category: 'sesso_relazioni', isPremium: true.
async function fetchAndSaveSexNews(today, db) {
  console.log('\n💋 Recupero notizie sesso & relazioni...');

  const existing = await db.collection('articles')
    .where('date', '==', today)
    .where('category', '==', 'sesso_relazioni')
    .get();

  if (!existing.empty && !process.argv.includes('--force')) {
    console.log('   ℹ️  Articoli sesso & relazioni già presenti, skip.');
    return;
  }
  if (!existing.empty) {
    const del = db.batch();
    existing.docs.forEach(d => del.delete(d.ref));
    await del.commit();
  }

  // Fetch dal pool di feed
  const raw = await fetchFromFeeds(SEX_RELATIONS_FEEDS, 15);

  // Pre-filtro: tieni solo articoli che contengono almeno una keyword sesso/relazioni
  const pool = raw.filter(a => {
    const text = [a.webTitle ?? '', a.fields?.trailText ?? ''].join(' ').toLowerCase();
    return SEX_KEYWORDS.some(kw => text.includes(kw));
  });

  console.log(`   → ${raw.length} articoli totali → ${pool.length} dopo filtro per keyword`);

  if (pool.length === 0) {
    console.log('   ⚠️  Nessun articolo sesso & relazioni trovato.');
    return;
  }

  // Selezione AI: i 2 articoli più curiosi/interessanti/provocatori
  const summaries = pool.map((a, i) =>
    `[${i}] ${a.webTitle ?? ''} (${a._source ?? ''}) | ${(a.fields?.trailText ?? '').substring(0, 100)}`
  ).join('\n');

  const selPrompt = `Sei il curatore della sezione "Sesso & Relazioni" di OddFeed, app di notizie per un pubblico italiano adulto.
Seleziona i 2 articoli più interessanti, sorprendenti o provocatori su sesso, amore e relazioni da questa lista.
Privilegia studi scientifici insoliti, tendenze culturali, curiosità o rivelazioni inaspettate. Evita contenuto banale o di routine.

Lista:
${summaries}

Rispondi SOLO con JSON: {"selected": [i1, i2], "reasoning": "..."}`;

  let selectedArticles = [];
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: selPrompt }],
      temperature: 0.3,
      max_tokens: 150,
    });
    const raw2 = (res.choices[0].message.content ?? '{}').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(raw2);
    console.log(`   Selezione AI: ${result.reasoning}`);
    selectedArticles = (result.selected ?? []).slice(0, 2).map(i => pool[i]).filter(Boolean);
  } catch (e) {
    console.log(`   ⚠️  Selezione fallita: ${e.message} — uso i primi 2`);
    selectedArticles = pool.slice(0, 2);
  }

  const batch = db.batch();
  for (let i = 0; i < selectedArticles.length; i++) {
    const article = selectedArticles[i];
    process.stdout.write(`   [${i + 1}/${selectedArticles.length}] ${(article.webTitle ?? '').substring(0, 55)}... `);

    const rewritePrompt = `Sei il giornalista della sezione "Sesso & Relazioni" di OddFeed — la sezione più letta dell'app.
Riscrivi questa notizia per un pubblico italiano adulto: diretto, curioso, senza tabù ma mai volgare.

Titolo originale: ${article.webTitle}
Sommario: ${article.fields?.trailText ?? ''}
Fonte: ${article._source ?? ''}

═══ TITOLO (max 70 caratteri) ═══
NIENTE emoji — solo testo.
Il titolo deve far pensare "devo assolutamente leggere questo". Tecniche:
  • Studio scientifico sorprendente: cita il dato concreto
  • Contrasto inaspettato: "Chi fa X fa anche Y — lo dice la scienza"
  • Rivelazione culturale: "Perché X nazione è la più soddisfatta al mondo"
  • Curiosità comportamentale: "Il dettaglio che dice tutto sulla coppia"

✗ "❤️ Nuovi consigli per migliorare la vita sessuale"
✓ "🔥 Lo studio che spiega perché le coppie soddisfatte litigano di più"

═══ DESCRIZIONE (max 160 caratteri) ═══
2 frasi. Tono diretto e incuriosente — invoglia ad aprire l'articolo.

═══ TESTO ═══
2 paragrafi sostanziosi. Ogni paragrafo almeno 3-4 frasi.
Paragrafo 1: INIZIA con il dato/fatto principale espresso chiaramente — cosa dice lo studio o cosa è successo, chi lo ha condotto/coinvolto, i numeri reali. Il lettore deve capire subito di cosa si tratta. Nessun linguaggio vago o eufemistico.
Paragrafo 2: implicazioni, variabili, reazione degli esperti o della comunità. Usa dettagli specifici.

Rispondi SOLO con JSON:
{
  "titleIt": "...", "titleEn": "...",
  "descriptionIt": "...", "descriptionEn": "...",
  "fullTextIt": "paragrafo 1\\n\\nparagrafo 2",
  "fullTextEn": "paragraph 1\\n\\nparagraph 2",
  "imageEmoji": "1-2 emoji (es: 💋❤️ oppure 🔥😏)"
}`;

    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: rewritePrompt }],
        temperature: 0.6,
        max_tokens: 800,
      });
      const raw3 = (res.choices[0].message.content ?? '{}').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const ai = JSON.parse(raw3);

      const docRef = db.collection('articles').doc();
      batch.set(docRef, {
        articleType: 'current',
        titleIt: ai.titleIt,
        titleEn: ai.titleEn,
        descriptionIt: ai.descriptionIt,
        descriptionEn: ai.descriptionEn,
        fullTextIt: ai.fullTextIt,
        fullTextEn: ai.fullTextEn,
        category: 'sesso_relazioni',
        categoryLabelIt: '💋 Sesso & Relazioni',
        categoryLabelEn: '💋 Sex & Relationships',
        imageEmoji: ai.imageEmoji ?? '💋',
        imageColor: getCategoryColor('sesso_relazioni'),
        imageUrl: article._imageUrl ?? null,
        country: article._isItalian ? '🇮🇹 Italia' : '🌍 Mondo',
        countryCode: article._isItalian ? 'IT' : 'WORLD',
        source: article._source ?? 'Cosmopolitan',
        sourceUrl: article.webUrl ?? '',
        date: today,
        order: 100 + i, // ordine alto → appaiono dopo le notizie standard
        isPremium: true,
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
  console.log(`   ✅ ${selectedArticles.length} articoli sesso & relazioni salvati.`);
}

// ─── Funzione principale ───────────────────────────────────────────
// ─── Accadde Davvero: 3 eventi storici dal Wikipedia OnThisDay API ────────────
// Ogni giorno, 3 fatti storici assurdi/curiosi avvenuti in questa stessa data nel passato.
// Salvati con articleType: 'accadde_davvero', category: 'accadde_davvero'.
async function fetchAccaddeDavvero(today, db) {
  console.log('\n📅 Recupero "Accadde Davvero" (Wikipedia OnThisDay)...');

  const existing = await db.collection('articles')
    .where('date', '==', today)
    .where('category', '==', 'accadde_davvero')
    .get();

  if (!existing.empty && !process.argv.includes('--force')) {
    console.log('   ℹ️  Articoli "Accadde Davvero" già presenti, skip.');
    return;
  }
  if (!existing.empty) {
    const del = db.batch();
    existing.docs.forEach(d => del.delete(d.ref));
    await del.commit();
  }

  // Wikipedia OnThisDay: mm/dd
  const parts = today.split('-');
  const month = parts[1];
  const day = parts[2];
  const wikiUrl = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${month}/${day}`;

  let events = [];
  try {
    const resp = await fetch(wikiUrl, {
      headers: { 'User-Agent': 'OddFeed/1.0 (kida.mancinimesi@gmail.com)' },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    events = data.events ?? [];
    console.log(`   → ${events.length} eventi trovati per ${day}/${month}`);
  } catch (e) {
    console.log(`   ⚠️  Wikipedia API error: ${e.message}`);
    return;
  }

  if (events.length === 0) {
    console.log('   ⚠️  Nessun evento trovato.');
    return;
  }

  // Selezione AI: i 3 eventi più assurdi/curiosi/sorprendenti
  const summaries = events
    .slice(0, 60)
    .map((e, i) => `[${i}] (${e.year}) ${(e.text ?? '').substring(0, 160)}`)
    .join('\n');

  const selPrompt = `Sei il curatore di "Accadde Davvero", sezione di OddFeed dedicata a fatti storici assurdi, curiosi e sorprendenti.
Seleziona i 3 eventi PIÙ ASSURDI e DIVERTENTI da questa lista. Ogni evento deve far pensare "ma davvero?!".

✅ SELEZIONA SOLO questi tipi:
- Invenzioni improbabili o fallimentari
- Leggi assurde o bizzarre
- Record curiosi o ridicoli
- Personaggi eccentrici con storie paradossali
- Prima volta di qualcosa di insolito
- Storie di animali celebri o comportamenti animali assurdi
- Scoperte scientifiche sorprendenti o controintuitive
- Coincidenze incredibili
- Mode o tendenze culturali strane
- Fatti storici paradossali o ironici

❌ ESCLUDI ASSOLUTAMENTE (anche se sembrano curiosi):
- Condanne penali, arresti, crimini
- Terremoti, uragani, eruzioni, disastri naturali
- Incidenti aerei, ferroviari, marittimi
- Morti di qualsiasi tipo
- Guerre, battaglie, conflitti
- Elezioni, politica, presidenti
- Attentati terroristici
- Scandali sessuali

Lista eventi:
${summaries}

Rispondi SOLO con JSON: {"selected": [i1, i2, i3, i4, i5, i6, i7, i8, i9, i10], "reasoning": "..."}`;

  let selectedEvents = [];
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: selPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 280,
    });
    const raw = res.choices[0].message.content ?? '{}';
    const result = JSON.parse(raw);
    console.log(`   Selezione AI: ${result.reasoning}`);
    selectedEvents = (result.selected ?? []).slice(0, 10).map(i => events[i]).filter(Boolean);
  } catch (e) {
    console.log(`   ⚠️  Selezione fallita: ${e.message} — uso i primi 10 eventi non dark`);
    const darkKeywords = ['died', 'death', 'killed', 'earthquake', 'crash', 'sentenced', 'convicted', 'attack', 'war', 'disaster', 'hurricane'];
    selectedEvents = events
      .filter(e => !darkKeywords.some(kw => (e.text ?? '').toLowerCase().includes(kw)))
      .slice(0, 10);
    if (selectedEvents.length === 0) selectedEvents = events.slice(0, 10);
  }

  const batch = db.batch();
  for (let i = 0; i < selectedEvents.length; i++) {
    const ev = selectedEvents[i];
    process.stdout.write(`   [${i + 1}/${selectedEvents.length}] (${ev.year}) ${(ev.text ?? '').substring(0, 55)}... `);

    const extract = ev.pages?.[0]?.extract ?? '';
    const rewritePrompt = `Sei il redattore di "Accadde Davvero", la sezione di OddFeed dedicata a fatti storici bizzarri e sorprendenti.
Riscrivi questo evento storico per un pubblico italiano: deve risultare incredibile, curioso, divertente o sorprendente.

Anno: ${ev.year}
Evento originale (inglese): ${ev.text ?? ''}
${extract ? `Approfondimento: ${extract.substring(0, 800)}` : ''}

═══ REGOLA N.1 — NON INVENTARE MAI ═══
Usa SOLO fatti presenti nell'evento e nell'approfondimento. Non aggiungere dettagli inventati.

═══ TITOLO ═══
- Max 75 caratteri, NIENTE emoji — solo testo
- Inizia con "Nel [anno]," oppure "[anno]:" per ancorare subito nel tempo
- Deve contenere IL fatto più assurdo o sorprendente
- Scrivi come un amico che racconta: "Nel 1923 qualcuno brevettò..."

═══ TESTO ═══
Scrivi 2-3 paragrafi. Ogni paragrafo 3-4 frasi.
- Paragrafo 1: INIZIA subito con il fatto — anno, chi, cosa, dove. Niente suspense.
- Paragrafo 2: approfondisci con contesto, dettagli, conseguenze.
- Paragrafo 3 (opzionale): curiosità finale, parallelo con oggi, chiusura ironica.

Tono: come se stessi raccontando a un amico qualcosa di assurdo letto su un libro di storia. Vivace, curioso, ironico ma preciso.

═══ DESCRIZIONE ═══
2 frasi concise. La prima: il fatto principale con l'anno. La seconda: il dettaglio più sorprendente. Max 180 caratteri.

Rispondi SOLO con JSON valido:
{
  "titleIt": "...",
  "titleEn": "...",
  "descriptionIt": "...",
  "descriptionEn": "...",
  "fullTextIt": "...",
  "fullTextEn": "..."
}`;

    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: rewritePrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 1200,
      });
      const raw = res.choices[0].message.content ?? '{}';
      const ai = JSON.parse(raw);

      const docRef = db.collection('articles').doc();
      batch.set(docRef, {
        titleIt: ai.titleIt,
        titleEn: ai.titleEn,
        descriptionIt: ai.descriptionIt,
        descriptionEn: ai.descriptionEn,
        fullTextIt: ai.fullTextIt,
        fullTextEn: ai.fullTextEn,
        category: 'accadde_davvero',
        categoryLabelIt: '📅 Accadde Davvero',
        categoryLabelEn: '📅 Did It Really Happen',
        articleType: 'accadde_davvero',
        historicalYear: ev.year,
        source: 'Wikipedia',
        sourceUrl: ev.pages?.[0]?.content_urls?.desktop?.page ?? 'https://en.wikipedia.org/wiki/Wikipedia:On_this_day',
        imageUrl: ev.pages?.[0]?.thumbnail?.source ?? null,
        date: today,
        isToday: true,
        order: i,
        isPremium: false,
        isTopOdd: false,
        imageEmoji: '📅',
        imageColor: ['#1E1B4B', '#4F46E5'],
        country: '🌍 Mondo',
        countryCode: 'WD',
        engagementLevel: 'high',
        viewSeed: Math.floor(Math.random() * 5000) + 10000,
        daysAgo: 0,
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
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      process.stdout.write(` ✗ (${e.message})\n`);
    }
  }

  await batch.commit();
  console.log(`   ✅ "Accadde Davvero" salvato per il ${today}.`);
}

// ─── Lo Sapevi Che: fatti curiosi da Wikipedia DYK ───────────────────────────
// Ogni giorno, 10 fatti sorprendenti che quasi nessuno conosce.
// Fonte primaria: Wikipedia Featured Feed (DYK section).
// Salvati con articleType: 'lo_sapevi_che', category: 'lo_sapevi_che'.
async function fetchLoSapeviChe(today, db) {
  console.log('\n💡 Recupero "Lo Sapevi Che" (Wikipedia DYK)...');

  const existing = await db.collection('articles')
    .where('date', '==', today)
    .where('category', '==', 'lo_sapevi_che')
    .get();

  if (!existing.empty && !process.argv.includes('--force')) {
    console.log('   ℹ️  Articoli "Lo Sapevi Che" già presenti, skip.');
    return;
  }
  if (!existing.empty) {
    const del = db.batch();
    existing.docs.forEach(d => del.delete(d.ref));
    await del.commit();
  }

  // Wikipedia Featured Feed — contiene sezione "dyk" (Did You Know)
  const parts = today.split('-');
  const wikiUrl = `https://en.wikipedia.org/api/rest_v1/feed/featured/${parts[0]}/${parts[1]}/${parts[2]}`;

  let rawFacts = [];
  try {
    const resp = await fetch(wikiUrl, {
      headers: { 'User-Agent': 'OddFeed/1.0 (kida.mancinimesi@gmail.com)' },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    // Estrai fatti DYK — testo HTML con <li> separati
    const dykText = data.dyk?.text ?? '';
    if (dykText) {
      // Rimuovi tag HTML e dividi per bullet
      const plain = dykText
        .replace(/<li>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
      rawFacts = plain
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 30 && s.startsWith('...that'));
    }
    console.log(`   → ${rawFacts.length} fatti DYK trovati`);
  } catch (e) {
    console.log(`   ⚠️  Wikipedia Featured Feed error: ${e.message}`);
  }

  // Complementa con fatti generati da GPT se DYK < 10
  const needed = Math.max(0, 15 - rawFacts.length);
  if (needed > 0) {
    const topics = [
      'biologia animale', 'corpo umano', 'fisica e chimica', 'psicologia',
      'storia delle invenzioni', 'astronomia', 'matematica curiosa',
      'record naturali', 'linguistica', 'neuroscienze',
    ].sort(() => Math.random() - 0.5).slice(0, 5);

    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Genera ${needed} fatti curiosi e verificati su questi argomenti: ${topics.join(', ')}.
Ogni fatto deve essere sorprendente, controintuitivo o poco noto al grande pubblico.
Usa solo fatti scientificamente accertati. Inizia ogni fatto con "...that" in inglese.
Un fatto per riga. Solo i fatti, nessun altro testo.`,
        }],
        temperature: 0.8,
        max_tokens: 600,
      });
      const extra = (res.choices[0].message.content ?? '')
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 20);
      rawFacts = [...rawFacts, ...extra];
      console.log(`   → ${extra.length} fatti GPT aggiunti (totale: ${rawFacts.length})`);
    } catch (e) {
      console.log(`   ⚠️  GPT facts fallback error: ${e.message}`);
    }
  }

  if (rawFacts.length === 0) {
    console.log('   ⚠️  Nessun fatto disponibile.');
    return;
  }

  // Selezione AI: i 10 più sorprendenti/curiosi
  const summaries = rawFacts
    .slice(0, 40)
    .map((f, i) => `[${i}] ${f.substring(0, 200)}`)
    .join('\n');

  const selPrompt = `Sei il curatore di "Lo Sapevi Che?", sezione di OddFeed con fatti curiosi che stupiscono.
Seleziona i 10 fatti più sorprendenti, controintuitivi o assurdi da questa lista.
Privilegia: fatti sul corpo umano, animali, fisica, record naturali, numeri incredibili.
Evita: fatti troppo banali, eventi storici pesanti, politica, morti, guerre.

Lista:
${summaries}

Rispondi SOLO con JSON: {"selected": [i1,i2,i3,i4,i5,i6,i7,i8,i9,i10], "reasoning": "..."}`;

  let selectedFacts = [];
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: selPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 250,
    });
    const result = JSON.parse(res.choices[0].message.content ?? '{}');
    console.log(`   Selezione AI: ${result.reasoning}`);
    selectedFacts = (result.selected ?? []).slice(0, 10).map(i => rawFacts[i]).filter(Boolean);
  } catch (e) {
    console.log(`   ⚠️  Selezione fallita: ${e.message} — uso i primi 10`);
    selectedFacts = rawFacts.slice(0, 10);
  }

  const batch = db.batch();
  for (let i = 0; i < selectedFacts.length; i++) {
    const fact = selectedFacts[i];
    process.stdout.write(`   [${i + 1}/${selectedFacts.length}] ${fact.substring(0, 60)}... `);

    const rewritePrompt = `Sei il redattore di "Lo Sapevi Che?", la sezione di OddFeed dedicata a fatti curiosi e sorprendenti.
Riscrivi questo fatto in italiano in modo coinvolgente e sorprendente.

Fatto originale (inglese): ${fact}

═══ REGOLA N.1 — NON INVENTARE MAI ═══
Usa SOLO fatti presenti nell'originale. Non aggiungere dettagli inventati.

═══ TITOLO ═══
- Inizia SEMPRE con "Lo sapevi che" seguito dal fatto principale
- Max 80 caratteri — diretto, sorprendente, niente emoji
- Esempio: "Lo sapevi che le api riconoscono i volti umani come noi?"

═══ TESTO ═══
2 paragrafi brevi (2-3 frasi ciascuno).
- Paragrafo 1: il fatto principale, espresso chiaramente e direttamente.
- Paragrafo 2: contesto, spiegazione scientifica o curiosità aggiuntiva.
Tono: meraviglia e stupore, come spiegare a un amico qualcosa di incredibile.

═══ DESCRIZIONE ═══
1-2 frasi. Il fatto più sorprendente in modo diretto. Max 140 caratteri.

Rispondi SOLO con JSON valido:
{
  "titleIt": "Lo sapevi che ...",
  "titleEn": "Did you know that ...",
  "descriptionIt": "...",
  "descriptionEn": "...",
  "fullTextIt": "...",
  "fullTextEn": "..."
}`;

    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: rewritePrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.6,
        max_tokens: 700,
      });
      const ai = JSON.parse(res.choices[0].message.content ?? '{}');

      const docRef = db.collection('articles').doc();
      batch.set(docRef, {
        titleIt: ai.titleIt,
        titleEn: ai.titleEn,
        descriptionIt: ai.descriptionIt,
        descriptionEn: ai.descriptionEn,
        fullTextIt: ai.fullTextIt,
        fullTextEn: ai.fullTextEn,
        category: 'lo_sapevi_che',
        categoryLabelIt: '💡 Lo Sapevi Che?',
        categoryLabelEn: '💡 Did You Know?',
        articleType: 'lo_sapevi_che',
        source: 'Wikipedia',
        sourceUrl: 'https://en.wikipedia.org/wiki/Wikipedia:Did_you_know',
        imageUrl: null,
        date: today,
        isToday: true,
        order: i,
        isPremium: false,
        isTopOdd: false,
        imageEmoji: '💡',
        imageColor: ['#92400E', '#D97706'],
        country: '🌍 Mondo',
        countryCode: 'WD',
        engagementLevel: 'high',
        viewSeed: Math.floor(Math.random() * 5000) + 8000,
        daysAgo: 0,
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
      await new Promise(r => setTimeout(r, 400));
    } catch (e) {
      process.stdout.write(` ✗ (${e.message})\n`);
    }
  }

  await batch.commit();
  console.log(`   ✅ "Lo Sapevi Che?" salvato per il ${today}.`);
}

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

  // ⭐ Scoring AI: seleziona le 12 storie più virali/bizzarre dal pool
  const MAX_ARTICLES = 12;
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
  await fetchAndSaveSexNews(today, db);

  // Genera gli articoli "Accadde Davvero" (Wikipedia OnThisDay)
  await fetchAccaddeDavvero(today, db);

  // Genera i fatti "Lo Sapevi Che?" (Wikipedia DYK)
  await fetchLoSapeviChe(today, db);

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
  // ── Query: utenti con notifiche abilitate ──────────────────────────────────
  // notificationsEnabled viene scritto su Firestore da registerForPushNotifications
  // nell'app (richiede build nativo + dispositivo fisico).
  // Se il campo non esiste ancora, la query restituisce 0 documenti — è normale
  // finché nessun utente ha installato l'app da un build EAS/produzione.
  const usersSnap = await db.collection('users')
    .where('notificationsEnabled', '==', true)
    .get();

  if (usersSnap.empty) {
    // Conta quanti utenti esistono in totale per distinguere "nessun utente" da "utenti senza token"
    const totalSnap = await db.collection('users').count().get();
    const total = totalSnap.data().count;
    if (total === 0) {
      console.log('   ℹ️  Nessun utente registrato — notifiche non inviate.');
    } else {
      console.log(`   ℹ️  ${total} utenti trovati, ma nessuno ha ancora abilitato le notifiche push.`);
      console.log('   ℹ️  Le notifiche si attivano dopo la prima installazione da build EAS/produzione.');
    }
    return;
  }

  console.log(`   👤 ${usersSnap.docs.length} utenti con notifiche attive.`);

  const today = new Date().toISOString().split('T')[0];
  const messages = [];
  const slotLabels = SLOT_LABELS[slot] ?? SLOT_LABELS.morning;
  const slotField  = SLOT_FIELD[slot]  ?? SLOT_FIELD.morning;
  const articleIdx = SLOT_ARTICLE_INDEX[slot] ?? 0;

  let skippedNoToken = 0, skippedDisabled = 0, skippedWrongSlot = 0, skippedAlready = 0;

  for (const userDoc of usersSnap.docs) {
    const user = userDoc.data();
    if (!user.expoPushToken) { skippedNoToken++; continue; }

    const isPremium = user.isPremium ?? false;
    const prefs = user.notificationPrefs ?? {};
    if (prefs.enabled === false) { skippedDisabled++; continue; }

    const interests = user.interests ?? [];
    const userSlot  = user.notificationSlot ?? 'Colazione'; // stringa salvata

    if (isPremium) {
      // Premium: notifica ad ogni fascia, purché non già ricevuta oggi per questo slot
      if (user[slotField] === today) { skippedAlready++; continue; }
    } else {
      // Free: notifica solo nella fascia scelta, una volta al giorno
      if (!slotLabels.includes(userSlot)) { skippedWrongSlot++; continue; }
      if (user.lastNotifDate === today) { skippedAlready++; continue; }
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
    const reasons = [];
    if (skippedNoToken)    reasons.push(`${skippedNoToken} senza token`);
    if (skippedDisabled)   reasons.push(`${skippedDisabled} con notifiche disabilitate`);
    if (skippedWrongSlot)  reasons.push(`${skippedWrongSlot} fascia diversa (slot: ${slot})`);
    if (skippedAlready)    reasons.push(`${skippedAlready} già notificati oggi`);
    console.log(`   ℹ️  Nessuna notifica da inviare (${reasons.join(', ') || 'nessun articolo disponibile'}).`);
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
    title: titleText,
    body: 'La tua notizia curiosa di oggi è pronta.',
  };
}

main().catch(console.error);

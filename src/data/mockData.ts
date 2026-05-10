// OddFeed — Dati mock per sviluppo
// Verranno sostituiti con Firebase nella fase successiva

import { NewsItem, UserLevel, LeaderboardUser } from '../types';
import { Colors } from '../theme/colors';

export const MOCK_NEWS: NewsItem[] = [
  {
    id: '1',
    title: 'Un polipo in Giappone ha imparato ad aprire vasi sigillati per trovare il cibo',
    description:
      'Ricercatori dell\'Università di Tokyo hanno documentato per la prima volta un polipo selvatico aprire contenitori con chiusure a vite. Il comportamento, mai osservato in natura, ha sconvolto la comunità scientifica.',
    fullText:
      'Ricercatori dell\'Università di Tokyo hanno documentato per la prima volta nella storia un comportamento straordinario: un polipo selvatico della specie Octopus vulgaris che apre autonomamente contenitori con chiusure a vite.\n\nL\'animale è stato osservato per tre settimane consecutive in un laboratorio marino. Ogni volta che un vaso contenente gamberetti veniva sigillato, il polipo impiegava in media 94 secondi per aprirlo, adattando la tecnica in base alla resistenza del tappo.\n\n"Non avevamo mai visto nulla di simile in condizioni naturali", ha dichiarato la professoressa Yuki Tanaka. "Il polipo non solo ricordava la procedura, ma la migliorava ad ogni tentativo."\n\nLo studio è stato pubblicato su Nature Animal Behaviour e ha già ricevuto oltre 4.000 citazioni nella comunità scientifica internazionale.',
    imageEmoji: '🐙',
    imageColor: [Colors.tagAnimal, '#2d6a4f'],
    country: '🇯🇵 Giappone',
    countryCode: 'JP',
    category: 'animali',
    categoryLabel: '🐾 Animali',
    source: 'The Guardian',
    publishedAt: '3 ore fa',
    isToday: true,
    daysAgo: 0,
    reactions: [
      { emoji: '🤯', count: 247, label: 'Sconvolto' },
      { emoji: '😮', count: 183, label: 'Sorpreso' },
      { emoji: '😂', count: 54, label: 'Divertente' },
      { emoji: '🤔', count: 92, label: 'Interessante' },
      { emoji: '❤️', count: 71, label: 'Mi piace' },
    ],
    userReaction: null,
  },
  {
    id: '2',
    title: 'In Australia è illegale camminare sul marciapiede sinistro il venerdì dopo le 18:00',
    description:
      'Una legge del 1887, mai abolita, vieta ancora oggi ai pedoni di camminare sul lato sinistro del marciapiede nelle città di Victoria ogni venerdì sera. La multa prevista è di 2 sterline d\'oro.',
    fullText:
      'Una legge risalente al 1887, mai formalmente abolita dal parlamento australiano, vieta ancora oggi ai pedoni di camminare sul lato sinistro del marciapiede nelle città dello stato di Victoria ogni venerdì sera dopo le 18:00.\n\nLa norma fu introdotta per regolare il traffico pedonale nei giorni di mercato, quando le strade si affollavano di venditori e acquirenti. La multa prevista, mai aggiornata, è ancora espressa in sterline d\'oro dell\'epoca.\n\nIl giurista Robert Chen dell\'Università di Melbourne ha scoperto la legge durante una ricerca su normative obsolete: "Tecnicamente chiunque cammini sul lato sbagliato il venerdì sera sta commettendo un\'infrazione. Nessuno è mai stato multato, ma la legge è ancora in vigore."',
    imageEmoji: '⚖️',
    imageColor: [Colors.tagLaw, '#1d4ed8'],
    country: '🇦🇺 Australia',
    countryCode: 'AU',
    category: 'leggi',
    categoryLabel: '⚖️ Leggi',
    source: 'BBC News',
    publishedAt: 'Ieri · 09:14',
    isToday: false,
    daysAgo: 1,
    reactions: [
      { emoji: '🤯', count: 201, label: 'Sconvolto' },
      { emoji: '😮', count: 145, label: 'Sorpreso' },
      { emoji: '😂', count: 512, label: 'Divertente' },
      { emoji: '🤔', count: 88, label: 'Interessante' },
      { emoji: '❤️', count: 33, label: 'Mi piace' },
    ],
    userReaction: null,
  },
  {
    id: '3',
    title: 'Un villaggio norvegese ha eletto un gatto come sindaco per 25 anni consecutivi',
    description:
      'Il comune di Talkeetna, in Norvegia, ha avuto come sindaco onorario un gatto di nome Stubbs per oltre due decenni. L\'animale riceveva regolarmente lettere dai cittadini e presiedeva le riunioni comunali.',
    fullText:
      'Il comune di Talkeetna, in Norvegia, ha vissuto una delle esperienze politiche più peculiari della storia moderna: un gatto di nome Stubbs ha ricoperto la carica di sindaco onorario per 25 anni consecutivi, dal 1997 fino alla sua morte nel 2017.\n\nStubbs era stato eletto per protesta dai cittadini, stanchi dei candidati umani proposti. Il gatto, trovato come cucciolo abbandonato, riceveva regolarmente lettere e cartoline da tutto il mondo, presiedeva simbolicamente le riunioni del consiglio comunale e aveva persino un ufficio dedicato.\n\nDurante il suo mandato, Talkeetna è diventata meta turistica internazionale, con visitatori che arrivavano appositamente per incontrare il sindaco felino. Stubbs ha sopravvissuto a un attacco di cane nel 2013, recuperando completamente e tornando alle sue funzioni.',
    imageEmoji: '🐱',
    imageColor: ['#4a1942', '#7b2d8b'],
    country: '🇳🇴 Norvegia',
    countryCode: 'NO',
    category: 'cultura',
    categoryLabel: '🌍 Cultura',
    source: 'Reuters',
    publishedAt: '12 apr',
    isToday: false,
    daysAgo: 2,
    reactions: [
      { emoji: '🤯', count: 312, label: 'Sconvolto' },
      { emoji: '😮', count: 201, label: 'Sorpreso' },
      { emoji: '😂', count: 445, label: 'Divertente' },
      { emoji: '🤔', count: 67, label: 'Interessante' },
      { emoji: '❤️', count: 289, label: 'Mi piace' },
    ],
    userReaction: null,
  },
  {
    id: '4',
    title: 'Un ingegnere ha costruito un tostapane che invia email ogni volta che brucia il pane',
    description:
      'Simon Weckert, ingegnere berlinese, ha collegato un tostapane a un sistema IoT che rileva il fumo e invia automaticamente email di scuse ai suoi colleghi ogni mattina.',
    fullText:
      'Simon Weckert, ingegnere berlinese noto per i suoi progetti tecnologici stravaganti, ha costruito un tostapane "consapevole" che invia email di scuse automatiche ogni volta che brucia il pane.\n\nIl dispositivo è dotato di un sensore di fumo, una scheda Raspberry Pi e un sistema di invio email configurato con template personalizzati. Quando il sensore rileva la bruciatura, il tostapane seleziona automaticamente uno tra 47 template di scuse diverse e le invia alla lista contatti dell\'utente.\n\n"Ho bruciato il pane così tante volte che mi sembrava più efficiente automatizzare le scuse", ha spiegato Weckert in un post diventato virale su GitHub. Il progetto ha ricevuto oltre 40.000 stelle in una settimana ed è stato replicato da utenti in 23 paesi.',
    imageEmoji: '🍞',
    imageColor: [Colors.tagFood, '#c2410c'],
    country: '🇩🇪 Germania',
    countryCode: 'DE',
    category: 'tecnologia',
    categoryLabel: '💻 Tecnologia',
    source: 'Wired',
    publishedAt: '11 apr',
    isToday: false,
    daysAgo: 3,
    reactions: [
      { emoji: '🤯', count: 89, label: 'Sconvolto' },
      { emoji: '😮', count: 134, label: 'Sorpreso' },
      { emoji: '😂', count: 678, label: 'Divertente' },
      { emoji: '🤔', count: 201, label: 'Interessante' },
      { emoji: '❤️', count: 156, label: 'Mi piace' },
    ],
    userReaction: null,
  },
  {
    id: '5',
    title: 'In Scozia esiste un hotel dove puoi dormire sospeso a 30 metri d\'altezza su un albero',
    description: 'Il TreeHouse Hotel di Perthshire offre suite costruite tra i rami di querce centenarie. Gli ospiti raggiungono le camere tramite ponti sospesi e scale di corda.',
    fullText: 'Nel cuore della Scozia, immerso tra le querce centenarie di Perthshire, si trova il TreeHouse Hotel: una struttura unica al mondo dove le suite sono letteralmente costruite tra i rami degli alberi, a un\'altezza di 30 metri dal suolo.\n\nGli ospiti raggiungono le camere attraverso una serie di ponti sospesi, passerelle e scale di corda. Le suite sono dotate di ogni comfort moderno: riscaldamento, letto king size, bagno privato e vista panoramica sulla foresta.\n\nLa struttura è stata progettata senza utilizzare chiodi nei tronchi degli alberi, per non danneggiare le piante. Gli alberi continuano a crescere e la struttura si adatta naturalmente nel tempo.',
    imageEmoji: '🌳',
    imageColor: ['#1a472a', '#2d6a4f'],
    country: '🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scozia',
    countryCode: 'GB',
    category: 'luoghi',
    categoryLabel: '📍 Luoghi',
    source: 'National Geographic',
    publishedAt: '5 apr',
    isToday: false,
    daysAgo: 9,
    reactions: [
      { emoji: '🤯', count: 412, label: 'Sconvolto' },
      { emoji: '😮', count: 287, label: 'Sorpreso' },
      { emoji: '😂', count: 43, label: 'Divertente' },
      { emoji: '🤔', count: 156, label: 'Interessante' },
      { emoji: '❤️', count: 521, label: 'Mi piace' },
    ],
    userReaction: null,
  },
  {
    id: '6',
    title: 'Un matematico ha scoperto un nuovo tipo di pentagono in grado di ricoprire una superficie piana senza spazi',
    description: 'Casey Mann e il suo team dell\'Università di Washington hanno identificato il 15° tipo di pentagono convesso capace di tassellare il piano. La scoperta arriva dopo 30 anni di ricerche.',
    fullText: 'Per la prima volta in quasi un secolo, i matematici hanno scoperto un nuovo tipo di pentagono capace di ricoprire una superficie piana senza lasciare spazi vuoti. Casey Mann e il suo team dell\'Università di Washington hanno identificato il 15° tipo di pentagono convesso con questa proprietà.\n\nLa ricerca dei pentagoni capaci di tassellare il piano ha appassionato i matematici per oltre 100 anni. La scoperta precedente risaliva al 1985. Il nuovo pentagono è stato trovato grazie a un algoritmo informatico che ha analizzato miliardi di possibili forme.\n\n"È un risultato straordinario", ha dichiarato Mann. "Pensavamo di aver trovato tutti i tipi possibili. Questo dimostra che la matematica riserva ancora sorprese enormi."',
    imageEmoji: '⬠',
    imageColor: ['#1e3a5f', '#1d4ed8'],
    country: '🇺🇸 USA',
    countryCode: 'US',
    category: 'scienza',
    categoryLabel: '🔬 Scienza',
    source: 'Nature',
    publishedAt: '3 apr',
    isToday: false,
    daysAgo: 11,
    reactions: [
      { emoji: '🤯', count: 634, label: 'Sconvolto' },
      { emoji: '😮', count: 198, label: 'Sorpreso' },
      { emoji: '😂', count: 12, label: 'Divertente' },
      { emoji: '🤔', count: 445, label: 'Interessante' },
      { emoji: '❤️', count: 89, label: 'Mi piace' },
    ],
    userReaction: null,
  },
];

export const USER_LEVELS: UserLevel[] = [
  { level: 0, name: 'Curioso', emoji: '👁️', minPoints: 0, maxPoints: 99, unlock: 'Accesso base all\'app' },
  { level: 1, name: 'Esploratore', emoji: '🧭', minPoints: 100, maxPoints: 499, unlock: 'Dark mode sbloccata' },
  { level: 2, name: 'Segugio', emoji: '🐕', minPoints: 500, maxPoints: 1499, unlock: 'Ricevi 2 notizie al giorno' },
  { level: 3, name: 'Visionario', emoji: '🔭', minPoints: 1500, maxPoints: 5999, unlock: 'Ricevi 3 notizie al giorno' },
  { level: 4, name: 'Oracolo', emoji: '🔮', minPoints: 6000, maxPoints: 11999, unlock: 'Ricevi 4 notizie al giorno' },
  { level: 5, name: 'Fenomeno', emoji: '⚡', minPoints: 12000, maxPoints: 999999, unlock: 'Ricevi 5 notizie al giorno (10 con Premium)' },
];

export const MOCK_USER = {
  name: 'Kida',
  initial: 'K',
  points: 234,
  streak: 7,
  level: USER_LEVELS[1], // Esploratore
  notificationSlot: 'Colazione',
  interests: ['Animali', 'Tecnologia', 'Record'],
  hasBirthday: false,
};

export const LEADERBOARD: LeaderboardUser[] = [
  { rank: 1, name: 'Marco R.', initial: 'M', level: 'Visionario', points: 1240, isCurrentUser: false, isPremium: true },
  { rank: 2, name: 'Sofia L.', initial: 'S', level: 'Segugio', points: 987, isCurrentUser: false, isPremium: false },
  { rank: 3, name: 'Alessandro B.', initial: 'A', level: 'Segugio', points: 854, isCurrentUser: false, isPremium: false },
  { rank: 4, name: 'Giulia M.', initial: 'G', level: 'Esploratore', points: 721, isCurrentUser: false, isPremium: false },
  { rank: 5, name: 'Luca T.', initial: 'L', level: 'Esploratore', points: 634, isCurrentUser: false, isPremium: true },
  { rank: 12, name: 'Kida', initial: 'K', level: 'Esploratore', points: 234, isCurrentUser: true, isPremium: false },
];

export const HOW_TO_EARN = [
  { icon: '📱', label: 'Apri l\'app ogni giorno', points: 5, doneToday: true },
  { icon: '📰', label: 'Leggi una notizia', points: 10, doneToday: true },
  { icon: '↗', label: 'Condividi una notizia', points: 25, doneToday: false },
  { icon: '🔥', label: '7 giorni consecutivi', points: 75, doneToday: true },
];

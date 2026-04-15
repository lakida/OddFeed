const it = {
  // Comuni
  common: {
    close: 'Chiudi',
    save: 'Salva',
    back: 'Indietro',
    confirm: 'Conferma',
    cancel: 'Annulla',
    error: 'Errore',
    loading: 'Caricamento...',
    verified: '✓ Verificata',
    allNews: 'Tutte le notizie →',
    today: 'Oggi',
    yesterday: 'Ieri',
  },

  // Tab bar
  tabs: {
    news: 'Notizie',
    archive: 'Archivio',
    points: 'Punti',
    premium: 'Premium',
    profile: 'Profilo',
  },

  // Home
  home: {
    greeting: (name: string) => `Ciao, ${name} 👋`,
    todayNews: 'Ecco la notizia di oggi',
    todayNewsPlural: 'Ecco le tue notizie di oggi',
    unread: 'Da leggere',
    read: 'Letto',
    premiumBanner: '⭐ Con Premium ricevi fino a 10 notizie al giorno',
  },

  // Archivio
  archive: {
    title: 'Archivio',
    freeBanner: '⭐ Stai vedendo gli ultimi 7 giorni — con Premium accedi a tutto l\'archivio dal lancio',
    filters: ['Tutto', 'Questa settimana', 'Aprile 2026', 'Animali', 'Record', 'Leggi'],
  },

  // Articolo
  article: {
    back: 'Indietro',
    verified: '✓ Verificata',
    reactionLabel: 'Cosa ne pensi di questa notizia?',
    share: 'Condividi',
    shareMessage: (title: string) => `${title}\n\nVia OddFeed — Le notizie più strane dal mondo`,
  },

  // Punti
  points: {
    title: 'Punti',
    level: (n: number) => `Livello ${n}`,
    totalPoints: (n: number) => `${n} punti totali`,
    progressHint: (n: number, name: string) => `Ti mancano ${n} punti per diventare ${name}`,
    consecutiveDays: 'Giorni consecutivi',
    bonusActive: '+75 pt bonus',
    howToEarn: 'Come guadagnare punti',
    unlocks: 'I tuoi sblocchi',
  },

  // Premium
  premium: {
    title: 'Premium',
    heroTitle: 'Passa a OddFeed Premium',
    heroTitleActive: 'Sei già Premium!',
    heroSub: 'Più notizie, archivio completo e funzioni esclusive',
    heroSubActive: 'Stai godendo di tutte le funzioni esclusive',
    activeTag: '✓ Abbonamento attivo',
    monthly: 'Mensile',
    yearly: 'Annuale',
    perMonth: 'al mese',
    perYear: 'all\'anno · 1,25 €/mese',
    bestOffer: 'Miglior offerta',
    ctaMonthly: 'Inizia ora — 1,99 €/mese',
    ctaYearly: 'Inizia ora — 14,99 €/anno',
    cancelSubscription: 'Annulla abbonamento',
    noCommitment: 'Annulla quando vuoi · nessun vincolo',
    whatsIncluded: 'Cosa è incluso',
    free: 'Gratuito',
    legalNote: 'Il pagamento verrà addebitato sul tuo account App Store o Google Play alla conferma dell\'acquisto. L\'abbonamento si rinnova automaticamente salvo disdetta almeno 24 ore prima della scadenza.',
    featuresFree: [
      '1 notizia al giorno',
      'Archivio ultimi 7 giorni',
      'Reazioni alle notizie',
      'Punti e livelli',
    ],
    featuresPremium: [
      'Fino a 10 notizie al giorno',
      'Archivio completo — tutte le notizie dal lancio',
      'Filtra le notizie per categoria, paese o fonte',
      'Notizie disponibili 2 ore prima degli utenti gratuiti',
      'Nessuna pubblicità futura',
      'Badge Premium nel profilo',
    ],
  },

  // Profilo
  profile: {
    title: 'Profilo',
    streak: 'Apri l\'app ogni giorno e guadagni punti 🔥',
    preferences: 'Preferenze',
    notificationSlot: 'Fascia notifiche',
    interests: 'Interessi',
    darkMode: 'Dark mode',
    account: 'Account',
    premium: 'Passa a Premium',
    sources: 'Le nostre fonti',
    notifications: 'Notifiche',
    privacyTerms: 'Privacy e Termini',
    logout: 'Esci dall\'account',
    deleteAccount: 'Elimina account',
    language: 'Lingua',
    darkModeComingSoon: 'La dark mode è attiva! Il tema scuro sarà disponibile in tutta l\'app a partire dalla prossima versione.',
    notifSlotTitle: 'Quando vuoi ricevere le notizie?',
    interestsTitle: 'Scegli i tuoi interessi',
    interestsMin: (n: number) => `Seleziona almeno 3 categorie (${n}/3)`,
    interestsCount: (n: number) => `${n} selezionate`,
    interestsWarning: 'Seleziona almeno 3 categorie, poi potrai togliere questa',
    sourcesTitle: 'Le nostre fonti',
    logoutTitle: 'Esci dall\'account',
    logoutBody: 'Sei sicuro di voler uscire? Potrai rientrare in qualsiasi momento con le tue credenziali.',
    logoutConfirm: 'Esci',
    deleteTitle: 'Elimina account',
    deleteBody: 'Sei sicuro di voler eliminare il tuo account? Tutti i tuoi dati, punti e preferenze verranno cancellati definitivamente dal dispositivo.',
    deleteConfirm: 'Sì, voglio eliminare l\'account',
    deleteFinalTitle: 'Ultima conferma',
    deleteFinalBody: 'Questa azione è irreversibile. Confermi di voler cancellare tutto?',
    deleteFinalConfirm: 'Elimina definitivamente',
    version: 'OddFeed v1.0 · Aprile 2026',
    slots: ['Colazione', 'Pranzo', 'Pomeriggio', 'Cena'],
  },

  // Login
  login: {
    tagline: 'Le notizie più strane dal mondo',
    titleLogin: 'Accedi al tuo account',
    titleRegister: 'Crea il tuo account',
    nameLabel: 'Nome',
    namePlaceholder: 'Come ti chiami?',
    emailLabel: 'Email',
    emailPlaceholder: 'nome@esempio.it',
    passwordLabel: 'Password',
    passwordPlaceholder: 'La tua password',
    passwordPlaceholderNew: 'Crea una password sicura',
    confirmPasswordLabel: 'Conferma password',
    confirmPasswordPlaceholder: 'Ripeti la password',
    forgotPassword: 'Password dimenticata?',
    loginBtn: 'Accedi',
    registerBtn: 'Registrati',
    switchToRegister: 'Non hai un account? ',
    switchToLogin: 'Hai già un account? ',
    switchRegisterLink: 'Registrati',
    switchLoginLink: 'Accedi',
    googleLogin: 'Continua con Google',
    googleRegister: 'Registrati con Google',
    facebookLogin: 'Continua con Facebook',
    facebookRegister: 'Registrati con Facebook',
    or: 'oppure',
    legal: 'Continuando accetti i nostri ',
    legalTerms: 'Termini di utilizzo',
    legalAnd: ' e la nostra ',
    legalPrivacy: 'Privacy Policy',
    legalAge: '.\nApp +18.',
    // Errori
    errNameRequired: 'Il nome è obbligatorio.',
    errEmailRequired: 'L\'email è obbligatoria.',
    errEmailInvalid: 'Il formato dell\'email non è valido (es. nome@esempio.it).',
    errPasswordRequired: 'La password è obbligatoria.',
    errPasswordWeak: (rules: string) => `La password deve avere: ${rules}.`,
    errPasswordMismatch: 'Le password non coincidono. Riprova.',
    errConfirmRequired: 'Conferma la password.',
    errAccountNotFound: 'Nessun account trovato con questa email.',
    errPasswordWrong: 'Password errata. Hai dimenticato la password?',
    // Forza password
    strengthWeak: 'Debole',
    strengthFair: 'Discreta',
    strengthGood: 'Buona',
    strengthStrong: 'Ottima',
    rules: [
      'Almeno 8 caratteri',
      'Una lettera maiuscola',
      'Un numero',
      'Un carattere speciale (!@#$…)',
    ],
  },

  // Recupera password
  forgotPassword: {
    title: 'Recupera password',
    subtitle: 'Inserisci l\'email con cui ti sei registrato. Ti invieremo un link per impostare una nuova password.',
    emailLabel: 'Email',
    emailPlaceholder: 'nome@esempio.it',
    submitBtn: 'Invia istruzioni',
    sentTitle: 'Email inviata ✓',
    sentBody: (email: string) => `Abbiamo inviato le istruzioni a\n${email}`,
    sentNote: 'Controlla anche la cartella spam se non trovi l\'email. Il link scade dopo 24 ore.',
    backToLogin: 'Torna al login',
    resend: 'Non hai ricevuto l\'email? Riprova',
    errEmailRequired: 'Inserisci la tua email.',
    errEmailInvalid: 'Il formato dell\'email non è valido. Controlla di aver scritto correttamente (es. nome@esempio.it).',
    errNotFound: 'Nessun account trovato con questa email. Controlla l\'indirizzo o registrati.',
  },

  // Onboarding
  onboarding: {
    welcome: (name: string) => `👋 Ciao, ${name}!`,
    welcomeSub: 'Benvenuto su OddFeed — ogni giorno le notizie più strane e curiose dal mondo, selezionate e verificate per te.',
    welcomeBtn: 'Iniziamo →',
    welcomeNote: 'Ci vogliono 30 secondi per personalizzare la tua esperienza.',
    interestsTitle: 'Cosa ti appassiona?',
    interestsSub: 'Seleziona almeno 3 categorie — ti mostreremo notizie su questi temi.',
    interestsBtn: 'Continua →',
    notifTitle: 'Quando vuoi leggere?',
    notifSub: 'Ti invieremo la notizia del giorno alla fascia oraria che preferisci.',
    notifBtn: 'Continua →',
    readyTitle: 'Tutto pronto!',
    readySub: (slot: string) => `Ogni giorno a ${slot} riceverai la tua notizia curiosa del giorno.`,
    readyBtn: 'Inizia a leggere',
    recapTitle: 'Le tue preferenze',
    recapSlot: (slot: string) => `📍 Fascia oraria: ${slot}`,
    recapInterests: (list: string) => `🏷 Interessi: ${list}`,
    warningMin: (n: number) => `Seleziona almeno 3 categorie (${n}/3)`,
    slots: ['Colazione', 'Pranzo', 'Pomeriggio', 'Cena'],
  },

  // Home widget punti
  homeWidget: {
    title: '🔥 I tuoi punti oggi',
    earned: (n: number) => `+${n} pt guadagnati`,
    hint: 'Reagisci alla notizia di oggi per guadagnare altri 3 punti →',
  },

  // Nomi livelli
  levels: {
    0: 'Curioso',
    1: 'Esploratore',
    2: 'Segugio',
    3: 'Visionario',
    4: 'Oracolo',
    5: 'Fenomeno',
  } as Record<number, string>,

  // Account eliminato
  accountDeleted: {
    title: 'Account eliminato',
    subtitle: 'Il tuo account e tutti i tuoi dati sono stati eliminati definitivamente dal dispositivo.',
    note: 'Ci dispiace vederti andare. Se hai avuto problemi con l\'app, contattaci tramite l\'app.',
    btn: 'Torna alla home',
  },
};

export default it;
export type Translations = typeof it;

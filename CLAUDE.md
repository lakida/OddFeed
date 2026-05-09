# OddFeed — Note di progetto per Claude

## Stack tecnico
- **App**: React Native + Expo SDK 54 (TypeScript)
- **Build**: EAS Build (profilo `preview`, distribuzione ad-hoc iOS)
- **Backend dati**: Firebase Firestore (notizie, utenti, preferenze)
- **Auth**: Firebase Authentication
- **Notifiche push**: Expo Push Notifications
- **News fetching**: Node.js scripts (`scripts/`) — Guardian API + RSS feeds + GPT-4o mini
- **Design reference**: `oddfeed-prototype.html` (prototype HTML pixel-perfect)

## Infrastruttura cloud
- **GitHub Actions**: workflow già configurato in `.github/workflows/daily-news.yml`
  - 07:30 CEST — genera notizie + notifiche mattina
  - 13:00 CEST — notifiche pranzo
  - 20:00 CEST — notifiche cena
- **Railway**: in scadenza (7 giorni) — da CANCELLARE dopo aver configurato GitHub secrets
- **Firebase**: progetto attivo, Firestore + Auth + FCM

## GitHub Actions — Segreti da configurare
Vai su: GitHub repo → Settings → Secrets and variables → Actions

| Segreto | Descrizione |
|---|---|
| `OPENAI_KEY` | Chiave API OpenAI (GPT-4o mini per riscrittura notizie) |
| `GUARDIAN_KEY` | Chiave API The Guardian |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Contenuto JSON del file `firebase-service-account.json` |

## EAS Build
- Profilo: `preview` (ad-hoc iOS)
- Device registration: in corso (ritardo sicurezza iOS 1h — avviato ~16:15)
- Comando build: `eas build --platform ios --profile preview`

## Tema / Design system
- File: `src/theme/colors.ts`
- Colori chiave (da CSS vars HTML):
  - `--pri`: `#4F46E5` (violet)
  - `--nv`: `#1E1B4B` (navy — usato per titoli sezioni)
  - `--t1`: `#111827` (text)
  - `--t2`: `#6B7280` (textSecondary)
  - `--t3`: `#9CA3AF` (textTertiary)
  - `--bd`: `#E5E7EB` (border)
  - `--bg2`: `#F9FAFB` (bg2)
  - `--gld`: `#D97706` (gold)

## Pixel-perfect fixes applicate (maggio 2026)
- Colori token allineati all'HTML
- `att-card` pill: posizione top-left, paddingVertical 3
- `cardBody` padding: top:10 / h:11 / bottom:12
- `itemMeta` HomeScreen: rimosso uppercase/letterSpacing
- Article title: lineHeight 23, marginBottom 7
- Logout color: `#EF4444`
- Archive righe ordine: title → meta → cat
- PremiumScreen planCard: rimosso alignItems center

## Utente
- Nome: Kida
- Email: kida.mancinimesi@gmail.com

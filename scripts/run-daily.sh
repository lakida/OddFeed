#!/bin/bash
# OddFeed — Script giornaliero automatico
#
# ─── CRONTAB SETUP ────────────────────────────────────────────────────────────
# Esegui `crontab -e` e aggiungi queste righe:
#
#   # Genera notizie + notifiche fascia Colazione (ore 07:00)
#   0 7 * * * cd ~/Desktop/OddFeed && /usr/local/bin/node scripts/fetch-news.js >> logs/fetch.log 2>&1
#
#   # Notifiche fascia Pranzo (ore 14:00)
#   0 14 * * * cd ~/Desktop/OddFeed && /usr/local/bin/node scripts/send-notifications.js lunch >> logs/notif-lunch.log 2>&1
#
#   # Notifiche fascia Pomeriggio/Cena (ore 17:30)
#   30 17 * * * cd ~/Desktop/OddFeed && /usr/local/bin/node scripts/send-notifications.js evening >> logs/notif-evening.log 2>&1
#
# ─── GITHUB ACTIONS (alternativa cloud) ───────────────────────────────────────
# Vedi .github/workflows/daily-news.yml (già configurato nel repo).
# Per gli slot aggiuntivi, aggiungi altri workflow o jobs nello stesso file.
# ──────────────────────────────────────────────────────────────────────────────

cd ~/Desktop/OddFeed

LOG_FILE=~/Desktop/OddFeed/logs/fetch.log

echo "----------------------------------------" >> "$LOG_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Avvio generazione notizie..." >> "$LOG_FILE"

/usr/local/bin/node scripts/fetch-news.js >> "$LOG_FILE" 2>&1

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Completato." >> "$LOG_FILE"

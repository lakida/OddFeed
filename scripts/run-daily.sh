#!/bin/bash
# OddFeed — Script giornaliero automatico
# Eseguito ogni mattina alle 7:00 dal cron job

cd ~/Desktop/OddFeed

# Log con timestamp
echo "----------------------------------------" >> ~/Desktop/OddFeed/logs/fetch.log
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Avvio generazione notizie..." >> ~/Desktop/OddFeed/logs/fetch.log

# Esegui lo script con il node di sistema
/usr/local/bin/node scripts/fetch-news.js >> ~/Desktop/OddFeed/logs/fetch.log 2>&1

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Completato." >> ~/Desktop/OddFeed/logs/fetch.log

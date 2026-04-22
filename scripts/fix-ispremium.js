#!/usr/bin/env node
/**
 * OddFeed — Migrazione: corregge il campo isPremium su tutti gli articoli esistenti.
 *
 * Regola:
 *   - Categorie premium (sesso_relazioni, gossip, crimini_strani) → isPremium: true SEMPRE
 *   - Altre categorie, order === 0 → isPremium: false
 *   - Altre categorie, order > 0  → isPremium: true
 *
 * Uso: node scripts/fix-ispremium.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
} else {
  const FIREBASE_SA = process.env.FIREBASE_SERVICE_ACCOUNT;
  serviceAccount = JSON.parse(require('fs').readFileSync(FIREBASE_SA || './firebase-service-account.json', 'utf8'));
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const PREMIUM_CATS = new Set(['sesso_relazioni', 'gossip', 'crimini_strani']);

async function main() {
  console.log('🔧 Fix isPremium su tutti gli articoli...\n');

  const snap = await db.collection('articles').get();
  console.log(`   Trovati ${snap.size} articoli totali.\n`);

  let fixed = 0;
  let alreadyOk = 0;

  // Firestore batch: max 500 operazioni per batch
  const BATCH_SIZE = 400;
  let batch = db.batch();
  let opsInBatch = 0;

  for (const docSnap of snap.docs) {
    const d = docSnap.data();
    const category = d.category ?? 'storie_assurde';
    const order = d.order ?? 0;

    const correctIsPremium = PREMIUM_CATS.has(category) || order > 0;

    if (d.isPremium === correctIsPremium) {
      alreadyOk++;
      continue;
    }

    batch.update(docSnap.ref, { isPremium: correctIsPremium });
    opsInBatch++;
    fixed++;

    console.log(`   ${correctIsPremium ? '🔒' : '🆓'} ${docSnap.id.substring(0, 8)}... | ${d.date} | ${category} | order=${order} | ${d.isPremium} → ${correctIsPremium}`);

    if (opsInBatch >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      opsInBatch = 0;
    }
  }

  if (opsInBatch > 0) {
    await batch.commit();
  }

  console.log(`\n✅ Migrazione completata: ${fixed} articoli corretti, ${alreadyOk} già ok.`);
}

main().catch(console.error);

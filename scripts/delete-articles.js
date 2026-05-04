#!/usr/bin/env node
/**
 * OddFeed — Elimina tutti gli articoli da Firestore
 * Uso: node scripts/delete-articles.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
} else {
  serviceAccount = JSON.parse(
    require('fs').readFileSync(
      process.env.FIREBASE_SERVICE_ACCOUNT || './firebase-service-account.json', 'utf8'
    )
  );
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function deleteAllArticles() {
  console.log('🗑️  Recupero tutti gli articoli da Firestore...');
  const snap = await db.collection('articles').get();

  if (snap.empty) {
    console.log('   Nessun articolo trovato. Nulla da eliminare.');
    process.exit(0);
  }

  console.log(`   Trovati ${snap.docs.length} articoli. Eliminazione in corso...`);

  // Firestore supporta max 500 operazioni per batch
  const BATCH_SIZE = 500;
  for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    snap.docs.slice(i, i + BATCH_SIZE).forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log(`   ✓ ${Math.min(i + BATCH_SIZE, snap.docs.length)}/${snap.docs.length} eliminati`);
  }

  console.log(`\n✅ Tutti gli articoli eliminati.`);
  console.log('   Esegui ora: node fetch-news.js --force  per rigenerare le notizie di oggi.');
  process.exit(0);
}

deleteAllArticles().catch(err => {
  console.error('❌ Errore:', err.message);
  process.exit(1);
});

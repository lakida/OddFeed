#!/usr/bin/env node
/**
 * OddFeed — Elimina articoli precedenti a una certa data
 * Uso: node scripts/delete-old-articles.js --before=2026-04-24
 * Senza argomenti: elimina tutto tranne oggi
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
} else {
  serviceAccount = JSON.parse(require('fs').readFileSync(
    process.env.FIREBASE_SERVICE_ACCOUNT || './firebase-service-account.json', 'utf8'
  ));
}
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function main() {
  const dateArg = process.argv.find(a => a.startsWith('--before='));
  const today = new Date().toISOString().split('T')[0];
  const beforeDate = dateArg ? dateArg.replace('--before=', '') : today;

  console.log(`🗑️  Elimino articoli con date < ${beforeDate}...\n`);

  const snap = await db.collection('articles')
    .where('date', '<', beforeDate)
    .get();

  if (snap.empty) {
    console.log('✅ Nessun articolo da eliminare.');
    return;
  }

  console.log(`   Trovati ${snap.size} articoli da eliminare:`);
  snap.docs.forEach(d => console.log(`   - ${d.data().date} | ${d.data().titleIt?.substring(0, 50)}`));

  const batch = db.batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();

  console.log(`\n✅ ${snap.size} articoli eliminati.`);
}

main().catch(console.error);

/**
 * Migration script: import data from a JSON backup into Firestore.
 *
 * Usage (with Firebase Admin service account):
 *   node scripts/migrate-to-firebase.js ./backup.json
 *
 * Backup JSON format (e.g. from Supabase export or app export):
 *   {
 *     "users": [ { "id", "email", "full_name", "role" } ],
 *     "events": [ { "id", "user_id", "date", "start_time", ... } ],
 *     "settings": [ { "user_id", "business_name", ... } ],
 *     "employment_context": [ { "user_id", ... } ],
 *     "whatsapp_settings": [ { "user_id", ... } ]
 *   }
 *
 * Requires: GOOGLE_APPLICATION_CREDENTIALS env pointing to Firebase service account JSON.
 */

const fs = require('fs');
const path = require('path');

async function main() {
  const backupPath = process.argv[2] || 'backup.json';
  if (!fs.existsSync(backupPath)) {
    console.error('Usage: node scripts/migrate-to-firebase.js <path-to-backup.json>');
    console.error('File not found:', backupPath);
    process.exit(1);
  }

  let firebaseAdmin;
  try {
    firebaseAdmin = require('firebase-admin');
  } catch (e) {
    console.error('Install firebase-admin: npm install firebase-admin');
    process.exit(1);
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your Firebase service account JSON path.');
    process.exit(1);
  }

  if (!firebaseAdmin.apps.length) {
    firebaseAdmin.initializeApp();
  }
  const db = firebaseAdmin.firestore();

  const raw = fs.readFileSync(backupPath, 'utf8');
  const data = JSON.parse(raw);

  const batch = db.batch();
  let count = 0;

  if (Array.isArray(data.profiles) || Array.isArray(data.users)) {
    const users = data.users || data.profiles || [];
    for (const u of users) {
      const uid = u.id || u.user_id;
      if (!uid) continue;
      const profileData = {
        email: u.email ?? null,
        full_name: u.full_name ?? null,
        role: u.role || 'user',
      };
      batch.set(db.collection('users').doc(uid).collection('profile').doc('_'), profileData);
      batch.set(db.collection('profiles').doc(uid), profileData);
      count += 2;
    }
  }

  if (Array.isArray(data.events)) {
    const byUser = new Map();
    for (const e of data.events) {
      const uid = e.user_id;
      if (!uid) continue;
      if (!byUser.has(uid)) byUser.set(uid, []);
      byUser.get(uid).push(e);
    }
    for (const [uid, events] of byUser) {
      for (const e of events) {
        const { id, user_id, ...rest } = e;
        const docId = id || undefined;
        const ref = docId
          ? db.collection('users').doc(uid).collection('events').doc(docId)
          : db.collection('users').doc(uid).collection('events').doc();
        batch.set(ref, rest);
        count++;
      }
    }
  }

  if (Array.isArray(data.user_settings) || Array.isArray(data.settings)) {
    const settingsList = data.settings || data.user_settings || [];
    for (const s of settingsList) {
      const uid = s.user_id;
      if (!uid) continue;
      const ref = db.collection('users').doc(uid).collection('settings').doc('_');
      const { user_id: _u, id: _i, ...rest } = s;
      batch.set(ref, rest, { merge: true });
      count++;
    }
  }

  if (Array.isArray(data.employment_context)) {
    for (const ec of data.employment_context) {
      const uid = ec.user_id;
      if (!uid) continue;
      const ref = db.collection('users').doc(uid).collection('employment_context').doc('_');
      const { user_id: _u, id: _i, ...rest } = ec;
      batch.set(ref, { user_id: uid, ...rest }, { merge: true });
      count++;
    }
  }

  if (Array.isArray(data.whatsapp_settings)) {
    for (const ws of data.whatsapp_settings) {
      const uid = ws.user_id;
      if (!uid) continue;
      const ref = db.collection('users').doc(uid).collection('whatsapp_settings').doc('_');
      const { user_id: _u, id: _i, ...rest } = ws;
      batch.set(ref, { user_id: uid, ...rest }, { merge: true });
      count++;
    }
  }

  if (count === 0) {
    console.log('No data to migrate. Check backup JSON structure.');
    process.exit(0);
  }

  await batch.commit();
  console.log('Migrated', count, 'documents to Firestore.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

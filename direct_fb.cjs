const admin = require("firebase-admin");
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('firebase-admin-key.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
    const docRef = db.collection('system').doc('admin_ledger');
    const doc = await docRef.get();
    console.log(JSON.stringify(doc.data(), null, 2));
    process.exit(0);
}
run();

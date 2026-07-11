import { FirebaseAdmin } from './src/lib/server/firebase.js';

async function check() {
    try {
        const ledger = await FirebaseAdmin.getAdminLedger();
        console.log(JSON.stringify(ledger, null, 2));
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
check();

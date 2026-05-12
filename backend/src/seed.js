require('dotenv').config();
const db = require('./db');
const { ensureCatalog } = require('./utils/achievements');
const { ensureCurrentPuzzles } = require('./utils/rotation');
const { parsePhoneNumberFromString } = require('libphonenumber-js');

async function promoteAdmin() {
  const raw = (process.env.ADMIN_PHONE || '');
  if (!raw) return;
  const pn = parsePhoneNumberFromString(raw.trim(), 'RU');
  const phone = pn && pn.isValid() ? pn.number : raw.trim();
  const r = await db.query('UPDATE users SET is_admin=TRUE WHERE phone=$1 RETURNING id', [phone]);
  if (r.rowCount) console.log(`[seed] promoted admin: ${phone}`);
  else console.log(`[seed] admin ${phone} пока не логинился`);
}

async function run() {
  await ensureCatalog();
  await ensureCurrentPuzzles();
  await promoteAdmin();
  await db.pool.end();
  console.log('[seed] done');
}

run().catch(async (err) => {
  console.error('[seed] failed', err);
  try { await db.pool.end(); } catch {}
  process.exit(1);
});

/**
 * One-time migration: OLD Supabase project → NEW Supabase project
 *
 * Prerequisites:
 *  1. Run supabase/00-full-schema.sql on the NEW project.
 *  2. Each user signs up on the NEW project (same email as before).
 *  3. Set env vars (service role keys — never commit):
 *     OLD_SUPABASE_URL, OLD_SUPABASE_SERVICE_ROLE_KEY
 *     NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage: node scripts/migrate-supabase-data.mjs
 */
import { createClient } from '@supabase/supabase-js';

const oldUrl = process.env.OLD_SUPABASE_URL;
const oldKey = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY;
const newUrl = process.env.NEW_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const newKey = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY;

if (!oldUrl || !oldKey || !newUrl || !newKey) {
  console.error(
    'Missing migration env. Create .env.migration (gitignored) with:\n' +
      '  OLD_SUPABASE_URL, OLD_SUPABASE_SERVICE_ROLE_KEY, NEW_SUPABASE_SERVICE_ROLE_KEY\n' +
      'Optional: NEW_SUPABASE_URL (defaults to VITE_SUPABASE_URL from .env)\n' +
      'Run: node --env-file=.env --env-file=.env.migration scripts/migrate-supabase-data.mjs',
  );
  process.exit(1);
}

const oldDb = createClient(oldUrl, oldKey, { auth: { persistSession: false } });
const newDb = createClient(newUrl, newKey, { auth: { persistSession: false } });

async function listUsersByEmail(client) {
  const map = new Map();
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    for (const u of data.users) {
      if (u.email) map.set(u.email.toLowerCase(), u.id);
    }
    if (data.users.length < perPage) break;
    page += 1;
  }
  return map;
}

async function main() {
  console.log('Loading users…');
  const oldUsers = await listUsersByEmail(oldDb);
  const newUsers = await listUsersByEmail(newDb);

  const { data: oldRows, error: syncErr } = await oldDb.from('user_sync_data').select('*');
  if (syncErr) throw syncErr;

  let copied = 0;
  let skipped = 0;

  for (const row of oldRows ?? []) {
    const oldUser = [...oldUsers.entries()].find(([, id]) => id === row.user_id)?.[0];
    if (!oldUser) {
      skipped += 1;
      continue;
    }
    const newUserId = newUsers.get(oldUser);
    if (!newUserId) {
      console.warn(`No new account for ${oldUser} — create sign-up first`);
      skipped += 1;
      continue;
    }

    const payload = {
      user_id: newUserId,
      data: row.data ?? null,
      data_encrypted: row.data_encrypted ?? null,
      encryption_version: row.encryption_version ?? (row.data_encrypted ? 1 : 0),
      updated_at: row.updated_at ?? new Date().toISOString(),
    };

    const { error } = await newDb.from('user_sync_data').upsert(payload, { onConflict: 'user_id' });
    if (error) {
      console.error('upsert failed', oldUser, error.message);
      skipped += 1;
      continue;
    }
    copied += 1;

    const { data: crypto } = await oldDb
      .from('user_crypto_meta')
      .select('*')
      .eq('user_id', row.user_id)
      .maybeSingle();
    if (crypto) {
      await newDb.from('user_crypto_meta').upsert({
        user_id: newUserId,
        kdf_salt: crypto.kdf_salt,
        kdf_iterations: crypto.kdf_iterations ?? 310000,
        created_at: crypto.created_at,
      });
    }
  }

  console.log(`Sync rows copied: ${copied}, skipped: ${skipped}`);
  console.log('Company/workspace tables: re-create or extend this script if you had company data on old project.');
  console.log('After migration: point .env to NEW project, sign in, Sync now (will encrypt plaintext rows on push).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

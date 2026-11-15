const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const configFile = path.join(__dirname, '../dist/config.js');
const context = {window: {}};
vm.runInNewContext(fs.readFileSync(configFile, 'utf8'), context);
const url = process.env.SUPABASE_URL || context.window.SLOVO_CONFIG?.supabaseUrl;
const key = process.env.SUPABASE_PUBLISHABLE_KEY || context.window.SLOVO_CONFIG?.supabasePublishableKey;
if (!url || !key || !/^https:\/\/[^/]+\.supabase\.co\/?$/.test(url)) throw new Error('Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY repository variables before publishing.');
if (key.startsWith('sb_secret_')) throw new Error('Use a public publishable key, never a secret key.');
if (key.split('.').length === 3) {
  const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
  if (payload.role !== 'anon') throw new Error('Only an anon JWT is safe to publish.');
} else if (!key.startsWith('sb_publishable_')) throw new Error('Unrecognized public key format.');
fs.writeFileSync(configFile, `window.SLOVO_CONFIG = ${JSON.stringify({supabaseUrl: url, supabasePublishableKey: key})};\n`);
console.log('Public cloud configuration written.');

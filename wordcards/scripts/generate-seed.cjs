const fs = require('node:fs');
const path = require('node:path');
const {seeds} = require('../dist/core.js');
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const rows = seeds().map(({id,en,ru,hint,examples}) => `(${[id,en,ru,hint,JSON.stringify(examples)].map(quote).join(',')})`);
fs.writeFileSync(path.join(__dirname, '../supabase/seed.sql'), `-- Starter content, separate from schema migration.\ninsert into public.slovo_cards(id,en,ru,hint,examples) values\n${rows.join(',\n')}\non conflict do nothing;\n`);

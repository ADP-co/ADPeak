import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SIGI_POA_SCHEMA_SQL } from './schema';

const dbPath = resolve(
  process.cwd(),
  process.env.ADPEAK_DB_PATH ?? 'data/adpeak.sqlite',
);
mkdirSync(dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON;');
db.exec(SIGI_POA_SCHEMA_SQL);
db.close();

const markerPath = resolve(process.cwd(), 'data/.last-migration');
writeFileSync(markerPath, new Date().toISOString(), 'utf8');

console.log(`Migraciones aplicadas en ${dbPath}`);

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_sqlite_1 = require("node:sqlite");
const schema_1 = require("./schema");
const dbPath = (0, node_path_1.resolve)(process.cwd(), process.env.ADPEAK_DB_PATH ?? 'data/adpeak.sqlite');
(0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(dbPath), { recursive: true });
const db = new node_sqlite_1.DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON;');
db.exec(schema_1.SIGI_POA_SCHEMA_SQL);
db.close();
const markerPath = (0, node_path_1.resolve)(process.cwd(), 'data/.last-migration');
(0, node_fs_1.writeFileSync)(markerPath, new Date().toISOString(), 'utf8');
console.log(`Migraciones aplicadas en ${dbPath}`);
//# sourceMappingURL=run-migrations.js.map
-- Demo schema for SCRUM-62..65. Datos ficticios, no usar con informacion real.

CREATE TABLE IF NOT EXISTS demo_users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  access_code TEXT NOT NULL,
  plantel_id TEXT,
  responsable_id TEXT
);

CREATE TABLE IF NOT EXISTS demo_indicator_progress (
  id TEXT PRIMARY KEY,
  indicador TEXT NOT NULL,
  plantel TEXT NOT NULL,
  responsable TEXT NOT NULL,
  periodo TEXT NOT NULL,
  meta INTEGER NOT NULL,
  avance INTEGER NOT NULL,
  estado TEXT NOT NULL,
  evidencias INTEGER NOT NULL
);

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIGI_POA_SCHEMA_SQL = void 0;
exports.SIGI_POA_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  rol_id INTEGER NOT NULL REFERENCES roles(id),
  plantel_id INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS planteles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  clave TEXT NOT NULL UNIQUE,
  municipio TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS operational_years (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  anio INTEGER NOT NULL UNIQUE,
  fecha_inicio TEXT NOT NULL,
  fecha_fin TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS periods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  operational_year_id INTEGER NOT NULL REFERENCES operational_years(id),
  fecha_inicio TEXT NOT NULL,
  fecha_fin TEXT NOT NULL,
  numero INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT,
  UNIQUE (operational_year_id, numero)
);

CREATE TABLE IF NOT EXISTS indicators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clave TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  unidad_medida TEXT,
  responsable_id INTEGER REFERENCES users(id),
  active INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clave TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  indicator_id INTEGER NOT NULL REFERENCES indicators(id),
  active INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plantel_id INTEGER NOT NULL REFERENCES planteles(id),
  indicator_id INTEGER NOT NULL REFERENCES indicators(id),
  responsable_id INTEGER REFERENCES users(id),
  tipo_responsabilidad TEXT NOT NULL DEFAULT 'primario',
  active INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT,
  UNIQUE (plantel_id, indicator_id, responsable_id, tipo_responsabilidad)
);

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plantel_id INTEGER NOT NULL REFERENCES planteles(id),
  indicator_id INTEGER NOT NULL REFERENCES indicators(id),
  activity_id INTEGER REFERENCES activities(id),
  period_id INTEGER NOT NULL REFERENCES periods(id),
  responsable_id INTEGER REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('borrador', 'enviado', 'en_revision', 'correccion_solicitada', 'aprobado', 'cerrado')),
  current_version INTEGER NOT NULL DEFAULT 1,
  current_payload TEXT NOT NULL DEFAULT '{}',
  closed_at TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (plantel_id, indicator_id, activity_id, period_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_scope
  ON submissions (plantel_id, indicator_id, period_id, status);

CREATE TABLE IF NOT EXISTS submission_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL REFERENCES submissions(id),
  version_number INTEGER NOT NULL,
  payload TEXT NOT NULL,
  change_reason TEXT,
  created_by_user_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (submission_id, version_number)
);

CREATE TABLE IF NOT EXISTS evidence_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL REFERENCES submissions(id),
  version_number INTEGER NOT NULL,
  original_name TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  checksum_sha256 TEXT,
  uploaded_by_user_id INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evidence_submission
  ON evidence_files (submission_id, version_number, active);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL REFERENCES submissions(id),
  reviewer_user_id INTEGER,
  status TEXT NOT NULL CHECK (status IN ('en_revision', 'correccion_solicitada', 'aprobado', 'cerrado')),
  comments TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  user_id INTEGER,
  field_name TEXT,
  previous_value TEXT,
  new_value TEXT,
  value_type TEXT NOT NULL DEFAULT 'json',
  version_number INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_entity
  ON audit_logs (entity_type, entity_id, created_at);

INSERT OR IGNORE INTO roles (id, nombre) VALUES
  (1, 'admin'),
  (2, 'responsable'),
  (3, 'plantel');

INSERT OR IGNORE INTO planteles (id, nombre, clave, municipio) VALUES
  (1, 'Bachillerato 10', 'B10', 'Colima'),
  (2, 'Bachillerato 20', 'B20', 'Villa de Alvarez');

INSERT OR IGNORE INTO operational_years (id, nombre, anio, fecha_inicio, fecha_fin) VALUES
  (1, 'POA 2026', 2026, '2026-01-01', '2026-12-31');

INSERT OR IGNORE INTO periods (id, nombre, operational_year_id, fecha_inicio, fecha_fin, numero) VALUES
  (1, '2026-A', 1, '2026-01-01', '2026-06-30', 1),
  (2, '2026-B', 1, '2026-07-01', '2026-12-31', 2);

INSERT OR IGNORE INTO users (id, nombre, email, rol_id, plantel_id) VALUES
  (1, 'Administrador Demo', 'admin@sigi.test', 1, NULL),
  (2, 'Responsable Demo', 'responsable@sigi.test', 2, NULL),
  (3, 'Plantel Demo', 'plantel@sigi.test', 3, 1);

INSERT OR IGNORE INTO indicators (id, clave, nombre, descripcion, unidad_medida, responsable_id) VALUES
  (1, 'IND-001', 'Cumplimiento de actividades POA', 'Avance general de actividades programadas', 'porcentaje', 2);

INSERT OR IGNORE INTO activities (id, clave, nombre, descripcion, indicator_id) VALUES
  (1, 'ACT-001', 'Captura de evidencia mensual', 'Registro controlado de avance mensual', 1);

INSERT OR IGNORE INTO assignments (id, plantel_id, indicator_id, responsable_id, tipo_responsabilidad) VALUES
  (1, 1, 1, 2, 'primario');
`;
//# sourceMappingURL=schema.js.map
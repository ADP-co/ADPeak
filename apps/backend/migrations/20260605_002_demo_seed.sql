-- Demo seed for SCRUM-62..65. Valores publicos para presentacion local.

INSERT INTO demo_users (
  id,
  display_name,
  email,
  role,
  access_code,
  plantel_id,
  responsable_id
) VALUES
  (
    'demo-admin',
    'Admin DGEMS Demo',
    'admin.demo@adpeak.local',
    'admin_dgems',
    'demo-admin',
    NULL,
    NULL
  ),
  (
    'demo-plantel',
    'Plantel Norte Demo',
    'plantel.demo@adpeak.local',
    'plantel',
    'demo-plantel',
    'plantel-norte',
    NULL
  ),
  (
    'demo-responsable',
    'Responsable Indicador Demo',
    'responsable.demo@adpeak.local',
    'responsable_indicador',
    'demo-responsable',
    NULL,
    'resp-egreso'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO demo_indicator_progress (
  id,
  indicador,
  plantel,
  responsable,
  periodo,
  meta,
  avance,
  estado,
  evidencias
) VALUES
  (
    'avance-001',
    'Eficiencia terminal',
    'Plantel Norte',
    'Responsable Indicador Demo',
    '2026-1',
    100,
    84,
    'en_revision',
    2
  ),
  (
    'avance-002',
    'Atencion a tutorias',
    'Plantel Centro',
    'Responsable Indicador Demo',
    '2026-1',
    80,
    80,
    'aprobado',
    1
  ),
  (
    'avance-003',
    'Participacion academica',
    'Plantel Norte',
    'Responsable Indicador Demo',
    '2026-2',
    60,
    42,
    'observado',
    1
  )
ON CONFLICT (id) DO NOTHING;

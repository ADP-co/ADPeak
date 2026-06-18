import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams, Outlet } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Navbar } from './components/layout/Navbar';
import { UserBanner } from './components/layout/UserBanner';
import { IndicatorForm, type FormSubmission } from './components/forms/IndicatorForm';
import { IndicatorConfigForm } from './components/forms/IndicatorConfigForm';
import type { IndicatorTemplate } from './components/forms/formConfig';
import { ProgressBar } from './components/layout/ProgressBar';
import { IndicatorsTable } from './components/ui/IndicatorsTable';
import { IndicatorsManagementTable } from './components/ui/IndicatorsManagement';
import type { Indicator } from './components/ui/IndicatorsTable';
import { UsersTable } from './components/ui/UsersTable';
import { Dashboard } from './components/ui/Dashboard';
import { ReportsDashboard } from './components/ui/ReportsDashboard';
import { AccountProfile } from './components/ui/AccountProfile';
import { Button } from './components/ui/Button';
import MediaSuperiorLogo from './assets/MediaSuperiorLogo.png';
import { AuthProvider, useAuth, type User } from './context/AuthContext';
import { Login } from './components/ui/Login';
import { Toaster, toast } from 'sonner';
import { useCaptureDraft } from './hooks/useCaptureDraft';
import { buildHealthIntegralTemplate, buildTemplateForCatalogIndicator, catalogPlanteles, fetchIndicatorTemplate, fetchIndicators, type CatalogIndicator } from './api/catalog';
import { officialIndicatorPlantelScopes } from './catalog/officialCatalog.generated';

const UNASSIGNED_PLANTEL_LABEL = 'Sin plantel asignado';

const plantelIndicatorScope: Pick<Indicator, 'plantel' | 'supervisor' | 'responsable' | 'contribuidor'> = {
  plantel: UNASSIGNED_PLANTEL_LABEL,
  supervisor: 'Liliana Yunuen Rojas Maciel',
  responsable: 'Liliana Yunuen Rojas Maciel',
  contribuidor: UNASSIGNED_PLANTEL_LABEL,
};

const mockupIndicatorsBase: Indicator[] = [
    { code: '1.0.0.0.2', name: 'Porcentaje de titulación por cohorte del NMS', status: 'Pendiente' },
    { code: '1.1.0.0.1', name: 'Porcentaje de cobertura en educación media superior', status: 'Corregir' },
    { code: '1.1.1.0.1', name: 'Porcentaje de aceptación en educación media superior', status: 'Corregir' },
    { code: '1.1.1.1.1', name: 'Porcentaje de programas educativos de educación media superior nuevos', status: 'Pendiente' },
    { code: '1.1.2.0.1', name: 'Porcentaje de retención escolar de educación media superior', status: 'Pendiente' },
    { code: '1.1.2.0.3', name: 'Tasa de abandono escolar de educación media superior', status: 'Pendiente' },
    { code: '1.1.2.1.1', name: 'Porcentaje de estudiantes de educación media superior', status: 'Pendiente' },
    { code: '1.1.2.1.3', name: 'Porcentaje de estudiantes de educación media superior que sus padres...', status: 'Pendiente' },
    { code: '1.1.2.1.4', name: 'Porcentaje de estudiantes atendidos en los servicios de salud integral.', status: 'En revisión' },
    { code: '1.1.2.2.1.', name: 'Porcentaje de estudiantes atendidos en acciones de reforzamiento', status: 'En revisión' },
    { code: '1.1.2.2.5', name: 'Número de programas educativos de media superior', status: 'Aprobado' },
    { code: '1.1.2.2.8', name: 'Porcentaje de estudiantes certificados en el dominio de una lengua extranjera', status: 'Aprobado' },
  ];

const mockupIndicators: Indicator[] = mockupIndicatorsBase.map((indicator) => ({
  ...indicator,
  ...plantelIndicatorScope,
}));

  const template1_0_0_0_2: IndicatorTemplate = {
    indicatorCode: '1.0.0.0.2',
    indicatorName: 'Porcentaje de titulación por cohorte del NMS',
    groups: [
      { label: 'Contexto Escolar', colspan: 3 },
      { label: 'Egresados titulados en el año 2025', colspan: 3 },
      { label: 'Matrícula de primer ingreso (agosto 2022)', colspan: 3 },
      { label: 'Resultados', colspan: 1 },
    ],
    columns: [
      { key: 'delegacion', label: 'Delegación', type: 'readonly' },
      { key: 'plantel', label: 'Plantel', type: 'readonly' },
      { key: 'programa', label: 'Programa Educativo', type: 'readonly' },
      { key: 'egresados_mujeres', label: 'Mujeres', type: 'number', required: true },
      { key: 'egresados_hombres', label: 'Hombres', type: 'number', required: true },
      {
        key: 'egresados_total',
        label: 'Total',
        type: 'calculated',
        calculation: { type: 'sum', sourceKeys: ['egresados_mujeres', 'egresados_hombres'] },
      },
      { key: 'matricula_mujeres', label: 'Mujeres', type: 'number', required: true },
      { key: 'matricula_hombres', label: 'Hombres', type: 'number', required: true },
      {
        key: 'matricula_total',
        label: 'Total',
        type: 'calculated',
        calculation: { type: 'sum', sourceKeys: ['matricula_mujeres', 'matricula_hombres'] },
      },
      {
        key: 'porcentaje_titulacion',
        label: '% de titulación',
        type: 'calculated',
        calculation: {
          type: 'percentage',
          numeratorKey: 'egresados_total',
          denominatorKey: 'matricula_total',
          decimals: 2,
        },
      },
    ],
  };

  const mockInitialData = [
    {
      delegacion: 'Villa de Álvarez',
      plantel: UNASSIGNED_PLANTEL_LABEL,
      programa: 'Técnico Analista Programador',
      egresados_mujeres: '',
      egresados_hombres: '',
      matricula_mujeres: '',
      matricula_hombres: '',
    },
    {
      delegacion: 'Villa de Álvarez',
      plantel: UNASSIGNED_PLANTEL_LABEL,
      programa: 'Técnico Analista Químico',
      egresados_mujeres: '',
      egresados_hombres: '',
      matricula_mujeres: '',
      matricula_hombres: '',
    },
  ];

const INDICATOR_STATUS_STORAGE_KEY = 'adpeak.indicator.statuses';

function homePathForRole(role?: string) {
  if (role === 'admin') {
    return '/analisis';
  }

  if (role === 'responsable') {
    return '/revision';
  }

  return '/indicadores';
}

function readIndicatorStatusOverrides() {
  try {
    return JSON.parse(window.localStorage.getItem(INDICATOR_STATUS_STORAGE_KEY) ?? '{}') as Record<string, Indicator['status']>;
  } catch {
    return {};
  }
}

function getIndicatorIdByCode(code: string) {
  const index = mockupIndicators.findIndex((indicator) => indicator.code === code);
  return index >= 0 ? index + 1 : 1;
}

function plantelNameFromId(id?: number) {
  if (!id) {
    return 'Planteles';
  }

  return catalogPlanteles.find((plantel) => plantel.id === id)?.name ?? `Bachillerato ${id}`;
}

function plantelScopeLabelFromIds(ids?: number[]) {
  if (!ids?.length) {
    return UNASSIGNED_PLANTEL_LABEL;
  }

  const labels = ids.map((id) => plantelNameFromId(id));

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === catalogPlanteles.length) {
    return 'Todos los planteles';
  }

  return `${labels.length} planteles`;
}

function positiveQueryParam(params: URLSearchParams, key: string) {
  const value = Number(params.get(key));
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function isEditableCaptureStatus(status?: string) {
  return !status || status === 'borrador' || status === 'correccion_solicitada';
}

function applySessionScope(indicator: Indicator, user?: User | null): Indicator {
  if (user?.role !== 'plantel') {
    return indicator;
  }

  const plantelName = plantelNameFromId(user.plantelId);

  return {
    ...indicator,
    plantel: plantelName,
    contribuidor: plantelName,
  };
}

function catalogToIndicator(indicator: CatalogIndicator, user?: User | null): Indicator {
  const scope = indicator.responsibleNames.join(', ') || 'Responsable DGEMS';
  const effectivePlantelIds = effectivePlantelIdsForCatalogIndicator(indicator);
  const plantelScope = user?.role === 'plantel' ? plantelNameFromId(user.plantelId) : plantelScopeLabelFromIds(effectivePlantelIds);

  return {
    code: indicator.code,
    name: indicator.name,
    status: indicator.active ? 'Pendiente' : 'Corregir',
    plantel: plantelScope,
    supervisor: scope,
    responsable: scope,
    contribuidor: user?.role === 'plantel' ? plantelScope : indicator.contributorNames.join(', ') || plantelScope,
  };
}

function canDisplayCatalogIndicatorForUser(indicator: CatalogIndicator, user?: User | null) {
  if (!user || user.role === 'admin') {
    return true;
  }

  if (user.role === 'plantel') {
    return effectivePlantelIdsForCatalogIndicator(indicator).includes(user.plantelId ?? -1);
  }

  return indicator.responsibleIds.includes(user.responsableId ?? -1);
}

function effectivePlantelIdsForCatalogIndicator(indicator: CatalogIndicator) {
  return indicator.plantelIds.length > 0
    ? indicator.plantelIds
    : officialIndicatorPlantelScopes[indicator.code] ?? [];
}

const MAX_INLINE_EVIDENCE_BYTES = 2 * 1024 * 1024;

async function buildCapturePayload(data: FormSubmission, existingPayload?: {
  evidencia?: { nombre: string; tipo: string; tamanoBytes: number; contenidoBase64?: string };
}) {
  const evidenceFile = data.evidencia?.[0];

  return {
    rows: data.rows,
    justificacion: data.justificacion?.trim() || undefined,
    evidencia: evidenceFile
      ? await evidenceFileToPayload(evidenceFile)
      : existingPayload?.evidencia,
  };
}

async function evidenceFileToPayload(file: File) {
  if (file.size > MAX_INLINE_EVIDENCE_BYTES) {
    throw new Error('La evidencia debe pesar máximo 2 MB para esta versión.');
  }

  return {
    nombre: file.name,
    tipo: file.type || 'application/octet-stream',
    tamanoBytes: file.size,
    contenidoBase64: await fileToBase64(file),
  };
}

async function fileToBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return window.btoa(binary);
}

function mergeRowsWithTemplate(
  template: IndicatorTemplate,
  templateRows: Record<string, unknown>[],
  savedRows?: Record<string, unknown>[]
) {
  const rowsToRestore = savedRows && savedRows.length > 0 ? savedRows : [];

  if (rowsToRestore.length === 0) {
    return templateRows;
  }

  const rowCount = template.allowAddRows
    ? Math.max(templateRows.length, rowsToRestore.length)
    : Math.max(templateRows.length, 1);

  return Array.from({ length: rowCount }, (_, index) => {
    const baseRow = templateRows[index] ?? template.emptyRow ?? templateRows[0] ?? {};
    const savedRow = rowsToRestore[index] ?? {};
    const mergedRow: Record<string, unknown> = {};

    template.columns.forEach((column) => {
      if (column.type === 'calculated') {
        return;
      }

      if (column.type === 'readonly') {
        mergedRow[column.key] = baseRow[column.key] ?? savedRow[column.key] ?? '';
        return;
      }

      mergedRow[column.key] = savedRow[column.key] ?? baseRow[column.key] ?? '';
    });

    return mergedRow;
  });
}

function hasBlankEditableCells(rows: Record<string, unknown>[], template: IndicatorTemplate) {
  const editableColumns = template.columns.filter((column) => column.type === 'number' || column.type === 'text');

  if (editableColumns.length === 0) {
    return false;
  }

  return rows.some((row) =>
    editableColumns.some((column) => {
      const value = row[column.key];
      return value === null || value === undefined || String(value).trim() === '';
    })
  );
}

function fallbackTemplateForIndicator(
  selectedCode: string,
  selectedIndicator?: Indicator,
  selectedCatalogIndicator?: CatalogIndicator
): IndicatorTemplate & { initialRows?: Record<string, unknown>[] } {
  if (selectedCatalogIndicator) {
    return buildTemplateForCatalogIndicator(selectedCatalogIndicator, selectedIndicator?.plantel ?? UNASSIGNED_PLANTEL_LABEL);
  }

  if (selectedCode === template1_0_0_0_2.indicatorCode) {
    return {
      ...template1_0_0_0_2,
      initialRows: mockInitialData,
    };
  }

  if (selectedCode === '1.1.2.1.4') {
    return buildHealthIntegralTemplate({
      code: selectedCode,
      name: selectedIndicator?.name ?? 'Porcentaje de estudiantes de educación media superior y superior atendidos en los servicios de salud integral',
      activities: ['Promoción de la salud'],
    }, selectedIndicator?.plantel ?? UNASSIGNED_PLANTEL_LABEL);
  }

  return {
    indicatorCode: selectedCode,
    indicatorName: selectedIndicator?.name ?? 'Indicador',
    groups: [
      { label: 'Contexto', colspan: 2 },
      { label: 'Seguimiento', colspan: 3 },
    ],
    columns: [
      { key: 'plantel', label: 'Plantel', type: 'readonly' },
      { key: 'actividad', label: 'Actividad', type: 'readonly' },
      { key: 'meta', label: 'Meta', type: 'number' },
      { key: 'avance', label: 'Avance', type: 'number' },
      { key: 'observaciones', label: 'Observaciones', type: 'text' },
    ],
    initialRows: [
      {
        plantel: selectedIndicator?.plantel ?? UNASSIGNED_PLANTEL_LABEL,
        actividad: 'Actividad general',
        meta: '',
        avance: '',
        observaciones: '',
      },
    ],
  };
}

interface IndicatorFormWrapperProps {
  onIndicatorStatusChange?: (code: string, status: Indicator['status']) => void;
  catalogIndicators?: CatalogIndicator[];
  catalogLoaded?: boolean;
}

function IndicatorFormWrapper({ onIndicatorStatusChange, catalogIndicators = [], catalogLoaded = false }: IndicatorFormWrapperProps) {
  const { user } = useAuth();
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const requestedPlantelId = positiveQueryParam(queryParams, 'plantelId');
  const requestedActividadId = positiveQueryParam(queryParams, 'actividadId');
  const requestedPeriodoId = positiveQueryParam(queryParams, 'periodoId');
  const requestedCaptureId = positiveQueryParam(queryParams, 'captureId');
  const selectedCode = code ?? template1_0_0_0_2.indicatorCode;
  const selectedMockupIndicator = mockupIndicators.find((indicator) => indicator.code === selectedCode);
  const selectedCatalogIndicator = catalogIndicators.find((indicator) => indicator.code === selectedCode);
  const selectedIndicator = selectedCatalogIndicator
    ? catalogToIndicator(selectedCatalogIndicator, user)
    : applySessionScope(selectedMockupIndicator ?? mockupIndicators[0], user);
  const isWaitingForCatalogIndicator = !selectedCatalogIndicator && !selectedMockupIndicator && !catalogLoaded;
  const isUnknownIndicator = !selectedCatalogIndicator && !selectedMockupIndicator && catalogLoaded;
  const resolvedIndicatorId = selectedCatalogIndicator?.id ?? (selectedMockupIndicator ? getIndicatorIdByCode(selectedCode) : 0);
  const fallbackTemplate = fallbackTemplateForIndicator(selectedCode, selectedIndicator, selectedCatalogIndicator);
  const [remoteTemplate, setRemoteTemplate] = useState<(IndicatorTemplate & { initialRows?: Record<string, unknown>[] }) | null>(null);
  const selectedTemplate = {
    ...(remoteTemplate ?? fallbackTemplate),
    indicatorCode: remoteTemplate?.indicatorCode ?? selectedCode,
    indicatorName: remoteTemplate?.indicatorName ?? selectedIndicator?.name ?? fallbackTemplate.indicatorName,
  };

  useEffect(() => {
    let isMounted = true;
    setRemoteTemplate(null);

    fetchIndicatorTemplate(selectedCode)
      .then((template) => {
        if (isMounted) {
          setRemoteTemplate(template);
        }
      })
      .catch(() => {
        if (isMounted) {
          setRemoteTemplate(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCode, user?.id]);

  const activePlantelId = user?.role === 'plantel' ? user.plantelId ?? 1 : requestedPlantelId ?? 1;
  const activeActividadId = requestedActividadId ?? 1;
  const activePeriodoId = requestedPeriodoId ?? 1;
  const activeResponsableId = user?.role === 'responsable'
    ? user.responsableId ?? 1
    : selectedCatalogIndicator?.primaryResponsibleId ?? selectedCatalogIndicator?.responsibleIds[0] ?? 1;
  const captureDraft = useCaptureDraft({
    requestedCaptureId,
    plantelId: activePlantelId,
    indicadorId: resolvedIndicatorId,
    periodoId: activePeriodoId,
    actividadId: activeActividadId,
    responsableId: activeResponsableId,
    storageScope: `plantel-${activePlantelId}:${selectedCode}:periodo-${activePeriodoId}:actividad-${activeActividadId}`,
    enabled: resolvedIndicatorId > 0 && !isWaitingForCatalogIndicator && !isUnknownIndicator,
  });

  const templateInitialRows = remoteTemplate?.initialRows ?? fallbackTemplate.initialRows ?? mockInitialData;
  const formInitialData = useMemo(
    () => mergeRowsWithTemplate(selectedTemplate, templateInitialRows, captureDraft.capture?.payload.rows),
    [captureDraft.capture?.payload.rows, selectedTemplate, templateInitialRows]
  );

  if (isWaitingForCatalogIndicator) {
    return (
      <section className="w-full max-w-[1250px] mx-auto bg-brand-Blanco rounded-lg shadow-md border border-brand-Gris_bajo/20 p-8">
        <p className="font-body text-sm text-brand-Gris_oscuro">Cargando indicador...</p>
      </section>
    );
  }

  if (isUnknownIndicator) {
    return (
      <section className="w-full max-w-[1250px] mx-auto bg-brand-Blanco rounded-lg shadow-md border border-brand-Gris_bajo/20 p-8">
        <h1 className="font-title text-xl font-bold text-brand-Gris_oscuro mb-2">Indicador no disponible</h1>
        <p className="font-body text-sm text-brand-Gris_oscuro">No tienes acceso a este indicador o no existe en el catálogo cargado.</p>
        <Button type="button" className="mt-5 text-xs py-1.5 px-4" onClick={() => navigate('/indicadores')}>
          Volver
        </Button>
      </section>
    );
  }

  const handleSaveDraft = async (data: FormSubmission) => {
    try {
      const payload = await buildCapturePayload(data, captureDraft.capture?.payload);
      captureDraft.saveDraft(payload, {
        onSuccess: () => {
          toast.success('Cambios guardados');
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : 'No se pudo guardar');
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar');
    }
  };

  const handleSendReview = async (data: FormSubmission) => {
    try {
      if (!data.justificacion?.trim() && hasBlankEditableCells(data.rows, selectedTemplate)) {
        toast.error('Agrega una justificación antes de enviar.');
        return;
      }

      const payload = await buildCapturePayload(data, captureDraft.capture?.payload);
      captureDraft.sendToReview(payload, {
        onSuccess: () => {
          onIndicatorStatusChange?.(selectedCode, 'En revisión');
          toast.success('Enviado a revisión');
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : 'No se pudo enviar');
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo enviar');
    }
  };

  const handleApprove = () => {
    captureDraft.approve(undefined, {
      onSuccess: () => {
        onIndicatorStatusChange?.(selectedCode, 'Aprobado');
        toast.success('Indicador aprobado');
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : 'No se pudo aprobar');
      },
    });
  };

  const handleRequestCorrection = (observacion: string) => {
    captureDraft.requestCorrection(observacion, {
      onSuccess: () => {
        onIndicatorStatusChange?.(selectedCode, 'Corregir');
        toast.success('Corrección solicitada');
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : 'No se pudo solicitar corrección');
      },
    });
  };

  return (
    <IndicatorForm
      template={selectedTemplate}
      key={`${selectedCode}:${selectedTemplate.columns.map((column) => column.key).join('|')}`}
      initialData={formInitialData}
      initialJustificacion={captureDraft.capture?.payload.justificacion}
      existingEvidenceName={captureDraft.capture?.payload.evidencia?.nombre}
      canReview={user?.role === 'responsable'}
      captureStatus={captureDraft.capture?.estado}
      isReadOnly={user?.role === 'plantel' && !isEditableCaptureStatus(captureDraft.capture?.estado)}
      onSaveDraft={handleSaveDraft}
      onSendReview={handleSendReview}
      onApprove={handleApprove}
      onRequestCorrection={handleRequestCorrection}
      isBusy={captureDraft.isBusy}
      statusMessage={captureDraft.statusMessage}
      errorMessage={captureDraft.errorMessage}
      onBack={() => navigate('/indicadores')}
    />
  );
}

function ProtectedLayout() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Si no está logueado, lo mandamos directo al login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const currentView = location.pathname.split('/')[1] || 'analisis';

  const handleNavigate = (view: string) => {
    navigate(`/${view}`);
  };

  return (
    <div className="min-h-screen bg-brand-Fondo flex flex-col">
      <Navbar />
      {user && (
        <UserBanner
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          role={user.role as any}
          name={user.name}
          description={user.description}
          onNavigate={handleNavigate}
          currentView={currentView}
        />
      )}

      <main className="flex-1 px-6 pt-10 pb-10 min-h-[calc(100vh-8rem)]">
        {/* Outlet renderizará las sub-rutas dinámicamente aquí */}
        <Outlet />
      </main>

      <footer className="w-full mt-auto py-8 bg-brand-Blanco border-t border-brand-Gris_bajo/20">
        <div className="max-w-[1250px] mx-auto px-6 flex justify-center items-center">
          <img src={MediaSuperiorLogo} alt="Media Superior" className="h-10 w-auto object-contain opacity-90" />
        </div>
      </footer>
    </div>
  );
}

function LoginRoute() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={homePathForRole(user?.role)} replace />;
  }

  return <Login />;
}

function AppContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [catalogIndicators, setCatalogIndicators] = useState<CatalogIndicator[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [indicatorStatusOverrides, setIndicatorStatusOverrides] = useState<Record<string, Indicator['status']>>(
    () => readIndicatorStatusOverrides()
  );

  useEffect(() => {
    if (!user) {
      setCatalogIndicators([]);
      setCatalogLoaded(false);
      return undefined;
    }

    let isMounted = true;
    setCatalogLoaded(false);

    fetchIndicators()
      .then((items) => {
        if (isMounted) {
          setCatalogIndicators(items);
          setCatalogLoaded(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCatalogIndicators([]);
          setCatalogLoaded(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const indicators = useMemo(
    () =>
      (catalogIndicators.length > 0
        ? catalogIndicators
            .filter((indicator) => canDisplayCatalogIndicatorForUser(indicator, user))
            .map((indicator) => catalogToIndicator(indicator, user))
        : catalogLoaded
          ? []
          : mockupIndicators.map((indicator) => applySessionScope(indicator, user))
      ).map((indicator) => ({
        ...indicator,
        status: indicatorStatusOverrides[indicator.code] ?? indicator.status,
      })),
    [catalogIndicators, catalogLoaded, indicatorStatusOverrides, user]
  );
  const completedIndicatorCount = useMemo(
    () => indicators.filter((indicator) => indicator.status === 'Aprobado' || indicator.status === 'En revisión').length,
    [indicators]
  );

  const handleSelectIndicator = (indicator: Indicator) => {
    const params = new URLSearchParams();

    if (indicator.plantelId) params.set('plantelId', String(indicator.plantelId));
    if (indicator.actividadId) params.set('actividadId', String(indicator.actividadId));
    if (indicator.periodoId) params.set('periodoId', String(indicator.periodoId));
    if (indicator.captureId) params.set('captureId', String(indicator.captureId));

    const query = params.toString();
    navigate(`/indicadores/captura/${indicator.code}${query ? `?${query}` : ''}`);
  };

  const handleConfigureIndicator = (code: string) => {
    navigate(`/indicadores/configurar/${code}`);
  };

  const handleIndicatorStatusChange = (code: string, status: Indicator['status']) => {
    setIndicatorStatusOverrides((current) => {
      const next = { ...current, [code]: status };
      window.localStorage.setItem(INDICATOR_STATUS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const role = user?.role || 'plantel'; // Fallback por defecto

  return (
    <Routes>
      {/* Ruta pública */}
      <Route path="/login" element={<LoginRoute />} />

      {/* Rutas Privadas envueltas por nuestro Layout */}
      <Route element={<ProtectedLayout />}>
        {/* Redirección dinámica según el rol */}
        <Route path="/" element={
          <Navigate to={homePathForRole(role)} replace />
        } />

        {/* Vistas de Admin */}
        {role === 'admin' && (
          <>
            <Route path="/analisis" element={<Dashboard onSelectIndicator={handleSelectIndicator} />} />
            <Route path="/usuarios" element={<UsersTable />} />
            <Route path="/indicadores/configurar/:code" element={<IndicatorConfigForm onBack={() => navigate('/indicadores')} />} />
          </>
        )}

        {/* Vistas de Responsable */}
        {role === 'responsable' && (
          <Route path="/revision" element={<Dashboard onSelectIndicator={handleSelectIndicator} />} />
        )}

        {/* Vistas compartidas: Indicadores (Admin ve gestión, Plantel solo ve tabla) */}
        {(role === 'admin' || role === 'plantel') && (
          <Route path="/indicadores" element={
            role === 'admin' ? (
              <IndicatorsManagementTable onEditIndicator={handleConfigureIndicator} />
            ) : (
              <>
                <ProgressBar totalIndicators={indicators.length} completedIndicators={completedIndicatorCount} />
                <IndicatorsTable indicators={indicators} onSelectIndicator={handleSelectIndicator} />
              </>
            )
          } />
        )}

        {/* Formulario de captura accesible para quienes tengan acceso a indicadores */}
        <Route
          path="/indicadores/captura/:code"
          element={
            role === 'admin' || role === 'plantel' || role === 'responsable'
              ? <IndicatorFormWrapper onIndicatorStatusChange={handleIndicatorStatusChange} catalogIndicators={catalogIndicators} catalogLoaded={catalogLoaded} />
              : <Navigate to="/revision" replace />
          }
        />

        {/* Reportes disponibles para direccion y responsables; Plantel permanece en captura. */}
        <Route path="/reportes" element={role === 'plantel' ? <Navigate to="/indicadores" replace /> : <ReportsDashboard />} />
        <Route path="/perfil" element={<AccountProfile onBack={() => navigate(homePathForRole(role))} />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  const routerBasename = import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '');

  return (
    <BrowserRouter basename={routerBasename}>
      {/* El proveedor global va dentro del Router para poder usar navegación */}
      <AuthProvider>
        <AppContent />
        <Toaster position="top-right" richColors expand={false} />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

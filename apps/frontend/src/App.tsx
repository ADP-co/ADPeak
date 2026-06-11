import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams, Outlet } from 'react-router-dom';
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
import MediaSuperiorLogo from './assets/MediaSuperiorLogo.png';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/ui/Login';
import { Toaster, toast } from 'sonner';
import { useCaptureDraft } from './hooks/useCaptureDraft';

const mockupIndicators: Indicator[] = [
    { code: '1.1.0.0.1', name: 'Porcentaje de cobertura en educacion media superior', status: 'Corregir' },
    { code: '1.1.1.0.1', name: 'Porcentaje de aceptacion en educacion media superior', status: 'Corregir' },
    { code: '1.1.1.1.1', name: 'Porcentaje de programas educativos de educacion media superior nuevos', status: 'Pendiente' },
    { code: '1.1.2.0.1', name: 'Porcentaje retencion escolar de educacion media superior', status: 'Pendiente' },
    { code: '1.1.2.0.3', name: 'Tasa de abandono escolar de educacion media superior', status: 'Pendiente' },
    { code: '1.1.2.1.1', name: 'Porcentaje de estudiantes de educacion media superior', status: 'Pendiente' },
    { code: '1.1.2.1.3', name: 'Porcentaje de estudiantes de educacion media superior que sus padres...', status: 'Pendiente' },
    { code: '1.1.2.1.4', name: 'Porcentaje de estudiantes atendidos en los servicios de salud integral.', status: 'En revisión' },
    { code: '1.1.2.2.1.', name: 'Porcentaje de estudiantes atendidos en acciones de reforzamiento', status: 'En revisión' },
    { code: '1.1.2.2.5', name: 'Numero de programas educativos de media superior', status: 'Aprobado' },
    { code: '1.1.2.2.8', name: 'Porcentaje de estudiantes certificados en el dominio de una lengua extranjera', status: 'Aprobado' },
  ];

  const template1_0_0_0_2: IndicatorTemplate = {
    indicatorCode: '1.0.0.0.2',
    indicatorName: 'Porcentaje de titulacion por cohorte del NMS',
    groups: [
      { label: 'Contexto Escolar', colspan: 3 },
      { label: 'Egresados titulados en el ano 2025', colspan: 3 },
      { label: 'Matricula de primer ingreso (agosto 2022)', colspan: 3 },
      { label: 'Resultados', colspan: 1 },
    ],
    columns: [
      { key: 'delegacion', label: 'Delegacion', type: 'readonly' },
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
        label: '% de titulacion',
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
      delegacion: 'Villa de Alvarez',
      plantel: 'Bachillerato 16',
      programa: 'Tecnico Analista Programador',
      egresados_mujeres: '',
      egresados_hombres: '',
      matricula_mujeres: '',
      matricula_hombres: '',
    },
    {
      delegacion: 'Villa de Alvarez',
      plantel: 'Bachillerato 16',
      programa: 'Tecnico Analista Quimico',
      egresados_mujeres: '',
      egresados_hombres: '',
      matricula_mujeres: '',
      matricula_hombres: '',
    },
  ];

  const completedCount = mockupIndicators.filter(
    (indicator) => indicator.status === 'Aprobado' || indicator.status === 'En revisión'
  ).length;

function IndicatorFormWrapper() {
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  console.log('El código del indicador seleccionado es:', code);
  // En una app real, usarías el "code" de la URL (ej. 1.0.0.0.2) para hacer un GET al backend
  // y cargar su configuración dinámica.
  
  // Buscamos el indicador en nuestros datos de prueba para obtener su estatus
  const currentIndicator = mockupIndicators.find((ind) => ind.code === code);

  const captureDraft = useCaptureDraft({
    plantelId: 1,
    indicadorId: 1,
    periodoId: 1,
    actividadId: 1,
    responsableId: 2,
  });

  // Extraemos la información del borrador de manera segura para evitar caídas de React (Blank Screen)
  // si el backend responde con un payload vacío, nulo o en formato de texto.
  let formInitialData = mockInitialData;
  try {
    const payload = captureDraft.capture?.payload;
    if (payload) {
      const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
      if (parsedPayload && Array.isArray(parsedPayload.rows) && parsedPayload.rows.length > 0) {
        formInitialData = parsedPayload.rows;
      } else if (Array.isArray(parsedPayload) && parsedPayload.length > 0) {
        formInitialData = parsedPayload;
      }
    }
  } catch (error) {
    console.error('Error al cargar los datos guardados:', error);
  }

  const handleSaveDraft = (data: FormSubmission) => {
    captureDraft.saveDraft({ rows: data.rows });
    toast.success('Borrador guardado');
  };

  const handleSendReview = (data: FormSubmission) => {
    captureDraft.sendToReview({ rows: data.rows });
    
    // Actualizamos el estado del indicador localmente
    if (currentIndicator) {
      currentIndicator.status = 'En revisión';
    }

    toast.success('Enviado a revisión');
    if (location.state?.from) {
      navigate(-1);
    } else {
      navigate('/indicadores');
    }
  };

  return (
    <IndicatorForm
      template={template1_0_0_0_2}
      initialData={formInitialData}
      status={currentIndicator?.status}
      onSaveDraft={handleSaveDraft}
      onSendReview={handleSendReview}
      isBusy={captureDraft.isBusy}
      statusMessage={captureDraft.statusMessage}
      errorMessage={captureDraft.errorMessage}
      onBack={() => {
        if (location.state?.from) {
          navigate(-1);
        } else {
          navigate('/indicadores');
        }
      }}
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

  const effectivePath = location.state?.from ? location.state.from : location.pathname;
  const currentView = effectivePath.split('/')[1] || 'analisis';

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

      <main className="flex-1 px-6 pt-10">
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

function AppContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSelectIndicator = (code: string) => {
    navigate(`/indicadores/captura/${code}`, { state: { from: location.pathname } });
  };

  const handleConfigIndicator = (code: string) => {
    navigate(`/indicadores/configurar/${code}`, { state: { from: location.pathname } });
  };

  const role = user?.role || 'plantel'; // Fallback por defecto

  return (
    <Routes>
      {/* Ruta pública */}
      <Route path="/login" element={<Login />} />

      {/* Rutas Privadas envueltas por nuestro Layout */}
      <Route element={<ProtectedLayout />}>
        {/* Redirección dinámica según el rol */}
        <Route path="/" element={
          role === 'admin' ? <Navigate to="/analisis" replace /> :
          role === 'responsable' ? <Navigate to="/revision" replace /> :
          <Navigate to="/indicadores" replace />
        } />

        {/* Vistas exclusivas de Admin */}
        {role === 'admin' && (
          <>
            <Route path="/analisis" element={<Dashboard onSelectIndicator={handleSelectIndicator} />} />
            <Route path="/usuarios" element={<UsersTable />} />
            <Route path="/indicadores" element={<IndicatorsManagementTable onEditIndicator={handleConfigIndicator} />} />
            <Route path="/indicadores/configurar/:code" element={<IndicatorConfigForm onBack={() => {
              if (location.state?.from) navigate(-1);
              else navigate('/indicadores');
            }} />} />
          </>
        )}

        {/* Vistas exclusivas de Responsable */}
        {role === 'responsable' && (
          <Route path="/revision" element={<Dashboard onSelectIndicator={handleSelectIndicator} />} />
        )}

        {/* Vistas exclusivas de Plantel */}
        {role === 'plantel' && (
          <Route path="/indicadores" element={
            <>
              <ProgressBar totalIndicators={mockupIndicators.length} completedIndicators={completedCount} />
              <IndicatorsTable indicators={mockupIndicators} onSelectIndicator={handleSelectIndicator} />
            </>
          } />
        )}

        {/* Vistas compartidas para todos */}
        <Route path="/indicadores/captura/:code" element={<IndicatorFormWrapper />} />
        <Route path="/reportes" element={<ReportsDashboard indicators={mockupIndicators} />} />
        <Route path="/perfil" element={<AccountProfile onBack={() => navigate(-1)} />} />
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

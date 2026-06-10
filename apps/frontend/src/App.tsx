import { useEffect, useMemo, useState } from "react";
import {
  ClientConfigurationError,
  actionsForRole,
  buildDemoLinks,
  defaultDashboardFilters,
  filterDashboardProgress,
  labelDemoAction,
  labelStatus,
  loadClientConfig,
  loadDemoApiState,
  loginDemoUser,
  runDemoAction,
  scopeProgressForSession,
  summarizeDashboardProgress,
  type DemoAction,
  type DemoApiState,
  type DemoDashboardFilters,
  type DemoRoleCard,
  type DemoSession
} from "./content";
import "./styles.css";

const metricLabels = {
  approved: "Aprobados",
  completionPercent: "Avance",
  evidenceFiles: "Evidencias",
  indicators: "Indicadores",
  late: "Atrasados",
  missing: "Faltantes",
  observed: "Observados",
  pendingReview: "En revision"
};

export function App() {
  const [demoState, setDemoState] = useState<DemoApiState | undefined>();
  const [selectedEmail, setSelectedEmail] = useState("");
  const [session, setSession] = useState<DemoSession | undefined>();
  const [filters, setFilters] = useState<DemoDashboardFilters>(
    defaultDashboardFilters
  );
  const [apiError, setApiError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRunningAction, setIsRunningAction] = useState(false);

  const config = useMemo(() => {
    try {
      return {
        apiUrl: loadClientConfig({
          VITE_API_URL: import.meta.env.VITE_API_URL
        }).apiUrl,
        error: ""
      };
    } catch (error) {
      return {
        apiUrl: "",
        error:
          error instanceof ClientConfigurationError
            ? error.message
            : "Error desconocido de configuracion."
      };
    }
  }, []);

  useEffect(() => {
    if (!config.apiUrl) {
      return;
    }

    let isCancelled = false;
    setIsLoadingApi(true);
    setApiError("");

    loadDemoApiState(config.apiUrl)
      .then((state) => {
        if (isCancelled) {
          return;
        }

        setDemoState(state);
        setSelectedEmail((currentEmail) =>
          currentEmail || state.users[0]?.email || ""
        );
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return;
        }

        setApiError(
          error instanceof Error
            ? error.message
            : "No se pudo conectar con la API demo."
        );
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingApi(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [config.apiUrl]);

  const apiUrl = config.apiUrl;
  const links = apiUrl ? buildDemoLinks(apiUrl) : undefined;
  const roleCards = demoState?.users ?? [];
  const selectedRole = roleCards.find((role) => role.email === selectedEmail);
  const scopedProgress = scopeProgressForSession(
    demoState?.dataset.progress ?? [],
    session
  );
  const filteredProgress = filterDashboardProgress(scopedProgress, filters);
  const dashboardSummary = summarizeDashboardProgress(filteredProgress);
  const roleActions = actionsForRole(session?.user.role);

  function updateFilter(name: keyof DemoDashboardFilters, value: string) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value
    }));
  }

  async function handleRoleLogin(role: DemoRoleCard) {
    setSelectedEmail(role.email);
    setSession(undefined);
    setLoginError("");
    setActionMessage("");
    setIsLoggingIn(true);
    setFilters(defaultDashboardFilters());

    try {
      setSession(await loginDemoUser(apiUrl, role));
    } catch (error) {
      setLoginError(
        error instanceof Error
          ? error.message
          : "No se pudo iniciar sesion demo."
      );
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleDemoAction(action: DemoAction) {
    if (!session) {
      return;
    }

    setActionMessage("");
    setIsRunningAction(true);

    try {
      const result = await runDemoAction(apiUrl, session.user.role, action);
      setActionMessage(`${result.message} Folio: ${result.auditId}.`);
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la accion demo."
      );
    } finally {
      setIsRunningAction(false);
    }
  }

  if (config.error) {
    return (
      <main className="app-shell">
        <section className="intro" role="alert">
          <p className="eyebrow">SIGI-POA DGEMS</p>
          <h1>Configuracion incompleta</h1>
          <p>{config.error}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="intro">
        <p className="eyebrow">SIGI-POA DGEMS</p>
        <h1>Ambiente demo conectado</h1>
        <p>
          Frontend, API demo, filtros, acciones por rol y reportes usando datos
          ficticios controlados.
        </p>
      </section>

      <dl className="status-panel" aria-label="Configuracion local">
        <div>
          <dt>Frontend</dt>
          <dd>http://127.0.0.1:5173</dd>
        </div>
        <div>
          <dt>Backend</dt>
          <dd>{apiUrl}</dd>
        </div>
        <div>
          <dt>Conexion API</dt>
          <dd>
            {isLoadingApi
              ? "Validando..."
              : demoState
                ? "Conectada"
                : "Sin conexion"}
          </dd>
        </div>
        <div>
          <dt>Modo</dt>
          <dd>{demoState?.status.environment ?? "Demo local controlada"}</dd>
        </div>
      </dl>

      {apiError ? (
        <section className="api-warning" role="alert">
          <strong>Backend demo no disponible</strong>
          <span>{apiError}</span>
        </section>
      ) : null}

      <section className="summary-grid" aria-label="Resumen demo filtrado">
        {Object.entries(metricLabels).map(([key, label]) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd>
              {key === "completionPercent"
                ? `${dashboardSummary.completionPercent}%`
                : dashboardSummary[key as keyof typeof dashboardSummary]}
            </dd>
          </div>
        ))}
      </section>

      <section className="demo-grid" aria-label="Usuarios de prueba">
        {roleCards.map((roleCard) => (
          <button
            className={
              roleCard.email === selectedEmail
                ? "role-card selected"
                : "role-card"
            }
            disabled={isLoggingIn}
            key={roleCard.email}
            onClick={() => void handleRoleLogin(roleCard)}
            type="button"
          >
            <span>{roleCard.role}</span>
            <strong>{roleCard.email}</strong>
            <small>Codigo: {roleCard.accessCode}</small>
          </button>
        ))}
      </section>

      <section className="flow-panel" aria-label="Flujo principal por rol">
        <div>
          <p className="eyebrow">Flujo demo</p>
          <h2>{selectedRole?.role ?? "Esperando backend"}</h2>
          {selectedRole ? (
            <ol>
              {selectedRole.flow.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          ) : (
            <p className="flow-empty">
              Inicia backend y recarga para cargar usuarios demo desde la API.
            </p>
          )}
        </div>
        <div className="session-panel" aria-live="polite">
          <p className="eyebrow">Sesion backend</p>
          {session ? (
            <>
              <strong>{session.user.displayName}</strong>
              <span>{session.user.email}</span>
              <code>{session.token}</code>
            </>
          ) : (
            <span>
              {isLoggingIn
                ? "Validando login..."
                : "Selecciona un rol para llamar /demo/login."}
            </span>
          )}
          {loginError ? <span className="error-text">{loginError}</span> : null}
        </div>
        <div className="action-panel">
          <p className="eyebrow">Acciones</p>
          {roleActions.length > 0 ? (
            roleActions.map((action) => (
              <button
                disabled={isRunningAction}
                key={action}
                onClick={() => void handleDemoAction(action)}
                type="button"
              >
                {labelDemoAction(action)}
              </button>
            ))
          ) : (
            <span>Inicia sesion demo para activar acciones.</span>
          )}
          {actionMessage ? <strong>{actionMessage}</strong> : null}
        </div>
        <nav className="api-links" aria-label="Endpoints demo">
          <a href={links?.health} rel="noreferrer" target="_blank">
            Health
          </a>
          <a href={links?.data} rel="noreferrer" target="_blank">
            Dataset
          </a>
          <a href={links?.report} rel="noreferrer" target="_blank">
            CSV
          </a>
        </nav>
      </section>

      {demoState ? (
        <section className="dashboard-panel" aria-label="Dashboard con filtros">
          <header>
            <p className="eyebrow">SCRUM-34</p>
            <h2>Dashboard reactivo</h2>
          </header>
          <div className="filters-grid">
            <FilterSelect
              label="Ciclo"
              name="cycle"
              onChange={updateFilter}
              options={demoState.dataset.filters.cycles}
              value={filters.cycle}
            />
            <FilterSelect
              label="Periodo"
              name="period"
              onChange={updateFilter}
              options={demoState.dataset.filters.periods}
              value={filters.period}
            />
            <FilterSelect
              label="Plantel"
              name="campus"
              onChange={updateFilter}
              options={demoState.dataset.filters.campuses}
              value={filters.campus}
            />
            <FilterSelect
              label="Indicador"
              name="indicator"
              onChange={updateFilter}
              options={demoState.dataset.filters.indicators}
              value={filters.indicator}
            />
            <FilterSelect
              label="Actividad"
              name="activity"
              onChange={updateFilter}
              options={demoState.dataset.filters.activities}
              value={filters.activity}
            />
            <FilterSelect
              label="Responsable"
              name="responsible"
              onChange={updateFilter}
              options={demoState.dataset.filters.responsibles}
              value={filters.responsible}
            />
            <FilterSelect
              label="Estado"
              name="status"
              onChange={updateFilter}
              options={demoState.dataset.filters.statuses}
              value={filters.status}
            />
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Plantel</th>
                  <th>Actividad</th>
                  <th>Indicador</th>
                  <th>Responsable</th>
                  <th>Periodo</th>
                  <th>Estado</th>
                  <th>Avance</th>
                </tr>
              </thead>
              <tbody>
                {filteredProgress.map((item) => (
                  <tr key={item.id}>
                    <td>{item.plantel}</td>
                    <td>{item.activity}</td>
                    <td>{item.indicador}</td>
                    <td>{item.responsable}</td>
                    <td>{item.periodo}</td>
                    <td>
                      <span className={`status-pill status-${item.estado}`}>
                        {labelStatus(item.estado)}
                      </span>
                      {item.vencimiento === "atrasado" ? (
                        <span className="status-pill status-late">
                          Atrasado
                        </span>
                      ) : null}
                    </td>
                    <td>
                      {item.avance}/{item.meta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function FilterSelect({
  label,
  name,
  onChange,
  options,
  value
}: {
  label: string;
  name: keyof DemoDashboardFilters;
  onChange: (name: keyof DemoDashboardFilters, value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label>
      <span>{label}</span>
      <select
        onChange={(event) => onChange(name, event.currentTarget.value)}
        value={value}
      >
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {labelStatus(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

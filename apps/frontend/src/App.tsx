import { useEffect, useMemo, useState } from "react";
import {
  ClientConfigurationError,
  buildDemoLinks,
  loadClientConfig,
  loadDemoApiState,
  loginDemoUser,
  type DemoApiState,
  type DemoRoleCard,
  type DemoSession
} from "./content";
import "./styles.css";

export function App() {
  const [demoState, setDemoState] = useState<DemoApiState | undefined>();
  const [selectedEmail, setSelectedEmail] = useState("");
  const [session, setSession] = useState<DemoSession | undefined>();
  const [apiError, setApiError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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

  const apiUrl = config.apiUrl;
  const links = buildDemoLinks(apiUrl);
  const roleCards = demoState?.users ?? [];
  const selectedRole = roleCards.find((role) => role.email === selectedEmail);

  async function handleRoleLogin(role: DemoRoleCard) {
    setSelectedEmail(role.email);
    setSession(undefined);
    setLoginError("");
    setIsLoggingIn(true);

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

  return (
    <main className="app-shell">
      <section className="intro">
        <p className="eyebrow">SIGI-POA DGEMS</p>
        <h1>Ambiente demo conectado</h1>
        <p>
          La pantalla carga datos desde la API demo y valida sesion contra el
          backend local.
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
      {demoState ? (
        <section className="summary-grid" aria-label="Resumen demo desde API">
          <div>
            <dt>Ciclo</dt>
            <dd>{demoState.dataset.cycle}</dd>
          </div>
          <div>
            <dt>Indicadores</dt>
            <dd>{demoState.dataset.summary.indicators}</dd>
          </div>
          <div>
            <dt>Evidencias</dt>
            <dd>{demoState.dataset.summary.evidenceFiles}</dd>
          </div>
          <div>
            <dt>Avance</dt>
            <dd>{demoState.dataset.summary.completionPercent}%</dd>
          </div>
        </section>
      ) : null}
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
        <nav className="api-links" aria-label="Endpoints demo">
          <a href={links.health} rel="noreferrer" target="_blank">
            Health
          </a>
          <a href={links.status} rel="noreferrer" target="_blank">
            Estado demo
          </a>
          <a href={links.users} rel="noreferrer" target="_blank">
            Usuarios
          </a>
          <a href={links.data} rel="noreferrer" target="_blank">
            Dataset
          </a>
        </nav>
      </section>
    </main>
  );
}

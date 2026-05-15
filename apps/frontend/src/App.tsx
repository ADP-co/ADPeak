import { ClientConfigurationError, loadClientConfig } from "./content";
import "./styles.css";

export function App() {
  let apiUrl: string;

  try {
    apiUrl = loadClientConfig({
      VITE_API_URL: import.meta.env.VITE_API_URL
    }).apiUrl;
  } catch (error) {
    const message =
      error instanceof ClientConfigurationError
        ? error.message
        : "Error desconocido de configuracion.";

    return (
      <main className="app-shell">
        <section className="intro" role="alert">
          <p className="eyebrow">SIGI-POA DGEMS</p>
          <h1>Configuracion incompleta</h1>
          <p>{message}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="intro">
        <p className="eyebrow">SIGI-POA DGEMS</p>
        <h1>Entorno de desarrollo listo</h1>
        <p>
          Frontend React conectado por configuracion a la API local del
          proyecto.
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
      </dl>
    </main>
  );
}

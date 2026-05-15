import { resolveApiUrl } from "./content";
import "./styles.css";

export function App() {
  const apiUrl = resolveApiUrl(import.meta.env.VITE_API_URL);

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

import { useState } from "react";
import {
  ClientConfigurationError,
  buildDemoLinks,
  demoRoleCards,
  loadClientConfig
} from "./content";
import "./styles.css";

export function App() {
  let apiUrl: string;
  const [selectedRoleIndex, setSelectedRoleIndex] = useState(0);

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

  const links = buildDemoLinks(apiUrl);
  const selectedRole = demoRoleCards[selectedRoleIndex];

  return (
    <main className="app-shell">
      <section className="intro">
        <p className="eyebrow">SIGI-POA DGEMS</p>
        <h1>Ambiente demo listo</h1>
        <p>
          Datos ficticios, roles de prueba y endpoints validados para presentar
          avances sin informacion confidencial.
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
          <dt>Modo</dt>
          <dd>Demo local controlada</dd>
        </div>
      </dl>
      <section className="demo-grid" aria-label="Usuarios de prueba">
        {demoRoleCards.map((roleCard, index) => (
          <button
            className={
              index === selectedRoleIndex ? "role-card selected" : "role-card"
            }
            key={roleCard.email}
            onClick={() => setSelectedRoleIndex(index)}
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
          <h2>{selectedRole.role}</h2>
          <ol>
            {selectedRole.flow.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
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

import { describe, expect, it } from 'vitest';

const sourceFiles = import.meta.glob('./**/*.{ts,tsx}', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function readSource(relativePath: string) {
  const key = `./${relativePath}`;
  const source = sourceFiles[key];

  if (source === undefined) {
    throw new Error(`Missing source fixture: ${relativePath}`);
  }

  return source;
}

function productionSourceEntries() {
  return Object.entries(sourceFiles).filter(([path]) => !/\.(test|spec)\.(ts|tsx)$/.test(path));
}

describe('frontend readiness invariants', () => {
  it('does not create a local fake session when login fails', () => {
    const source = readSource('components/ui/Login.tsx');

    expect(source).not.toContain('canUseLocalFallback');
    expect(source).not.toContain("username || 'prueba'");
    expect(source).not.toContain("name: username || 'Prueba'");
    expect(source).not.toContain('roleProfiles');
  });

  it('does not keep synthetic report builders in the reports screen', () => {
    const source = readSource('components/ui/ReportsDashboard.tsx');

    expect(source).not.toContain('buildFallbackReport');
    expect(source).not.toContain('fallbackPlanteles');
    expect(source).not.toContain('officialSources');
    expect(source).not.toContain('Estados para simular');
  });

  it('uses an app-owned logout dialog instead of a browser confirm', () => {
    const source = readSource('components/layout/Navbar.tsx');

    expect(source).not.toContain('window.confirm');
    expect(source).toContain('role="dialog"');
    expect(source).toContain('Cerrar sesión');
  });

  it('uses a searchable assignment list instead of a native indicator select', () => {
    const source = readSource('components/ui/UsersTable.tsx');

    expect(source).toContain('Buscar por código o nombre...');
    expect(source).toContain('availableIndicatorOptions');
    expect(source).not.toContain('Seleccione para agregar...');
  });

  it('keeps production source free of mojibake and internal QA labels', () => {
    const forbiddenPattern = /Ã|Â|�|QA formal|mock report|reporte inventado/i;

    productionSourceEntries().forEach(([path, source]) => {
      expect(source, path).not.toMatch(forbiddenPattern);
    });
  });
});

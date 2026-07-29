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

  return source.replace(/\r\n/g, '\n');
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

  it('stores the renewed session token after changing the current password', () => {
    const accountProfile = readSource('components/ui/AccountProfile.tsx');
    const authApi = readSource('api/auth.ts');
    const authContext = readSource('context/AuthContext.tsx');

    expect(accountProfile).toContain('login({ ...updatedSession.user, sessionToken: updatedSession.sessionToken })');
    expect(authApi).toContain('Promise<{ user: User; sessionToken: string }>');
    expect(authContext).toContain('!Number.isInteger(payload.exp)');
    expect(authContext).toContain('parsedUser.sessionToken && !isExpiredToken(parsedUser.sessionToken)');
  });

  it('disables both scoped report exports and renders the blocking reason', () => {
    const source = readSource('components/ui/ReportsDashboard.tsx');

    expect(source).toContain('reportItemExportBlockMessage(scopedReport)');
    expect(source).toContain('disabled={generatingDocumentId === `${item.id}:csv` || exportDisabled}');
    expect(source).toContain('disabled={generatingDocumentId === `${item.id}:pdf` || exportDisabled}');
    expect(source).toContain('{exportBlockMessage && (');
    expect(source).toContain('estado: reportStatusFilter(filterBy)');
  });

  it('keeps generated operational fallbacks behind a development-only import', () => {
    const appSource = readSource('App.tsx');
    const catalogSource = readSource('api/catalog.ts');
    const usersSource = readSource('components/ui/UsersTable.tsx');

    expect(appSource).not.toContain("from './catalog/officialCatalog.generated'");
    expect(usersSource).not.toContain("from '../../catalog/officialCatalog.generated'");
    expect(catalogSource).not.toContain("from '../catalog/officialCatalog.generated'");
    expect(catalogSource).not.toContain("from '../catalog/officialData.generated'");
    expect(catalogSource).toContain("if (!import.meta.env.DEV)");
    expect(catalogSource).toContain("modulePath = '../catalog/officialCatalog.generated.ts'");
    expect(catalogSource).toContain("modulePath = '../catalog/officialData.generated.ts'");
    expect(catalogSource).toContain('import(/* @vite-ignore */ modulePath)');
  });

  it('keeps frontend generated fallbacks free of synthetic identifiers and workbook provenance', () => {
    const generatedSource = [
      readSource('catalog/officialCatalog.generated.ts'),
      readSource('catalog/officialData.generated.ts'),
    ].join('\n');

    expect(generatedSource).not.toMatch(/(?:FMT|TMP)-[A-Z0-9]/i);
    expect(generatedSource).not.toMatch(/pending_mapping|template_variant|private-workbook/i);
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

  it('refreshes notifications across tabs and devices without a manual reload', () => {
    const source = readSource('App.tsx');
    const bannerSource = readSource('components/layout/UserBanner.tsx');

    expect(source).toContain('window.setInterval(refresh, 15_000)');
    expect(source).toContain("window.addEventListener('focus', refresh)");
    expect(source).toContain("document.addEventListener('visibilitychange', refreshWhenVisible)");
    expect(source).toContain("const targetWindow = window.open('', '_blank');");
    expect(source).toContain('targetWindow.location.replace(url)');
    expect(source).toContain('notificationTargetPath(notification');
    expect(bannerSource).toContain('onOpenNotification?.(notification)');
    expect(bannerSource).toContain("notification.captureId ? 'Ver captura' : 'Ver indicadores'");
  });

  it('keeps evidence blob URLs alive long enough for Chrome to start the download', () => {
    const source = readSource('App.tsx');

    expect(source).toContain("link.style.display = 'none'");
    expect(source).toContain('window.setTimeout(() => {\n        link.remove();\n        URL.revokeObjectURL(url);\n      }, 4000);');
  });

  it('requires a real code when creating an indicator', () => {
    const source = readSource('components/forms/IndicatorConfigForm.tsx');

    expect(source).toContain('Código del indicador');
    expect(source).toContain('isValidIndicatorCode');
    expect(source).toContain('(?!TMP(?:-|$))');
    expect(source).toContain('(?!FMT(?:-|$))');
  });

  it('configures explicit operational scope without inferring it from display text', () => {
    const source = readSource('components/forms/IndicatorConfigForm.tsx');

    expect(source).toContain('Todos los planteles');
    expect(source).toContain('Planteles específicos');
    expect(source).toContain('Responsables específicos');
    expect(source).toContain('Sin alcance operativo');
    expect(source).toContain('operationalScope,');
    expect(source).toContain('plantelIds: scopedPlantelIds');
  });

  it('uses backend allowed actions for capture, review, rows and evidence controls', () => {
    const source = readSource('App.tsx');
    const tableSource = readSource('components/ui/IndicatorsTable.tsx');

    expect(source).toContain("allowedActions.includes('capture')");
    expect(source).toContain("allowedActions.includes('approve')");
    expect(source).toContain("allowedActions.includes('open_evidence')");
    expect(source).toContain("allowedActions.includes('add_rows')");
    expect(tableSource).toContain("allowedActions.includes('request_correction')");
  });

  it('applies each indicator evidence policy instead of hard-coded limits', () => {
    const appSource = readSource('App.tsx');
    const formSource = readSource('components/forms/IndicatorForm.tsx');

    expect(appSource).toContain('selectedCatalogIndicator?.evidenceRules ?? DEFAULT_EVIDENCE_RULES');
    expect(appSource).toContain('evidenceRules.required && !hasEvidence');
    expect(appSource).toContain('evidenceRules.requireOpenBeforeApproval');
    expect(appSource).not.toContain('MAX_INLINE_EVIDENCE_BYTES');
    expect(formSource).toContain('evidenceRules.maxSizeMb * 1024 * 1024');
    expect(formSource).toContain('evidenceRules.allowedTypes.includes(file.type)');
  });

  it('describes responsible review actions without promising data editing', () => {
    const source = readSource('components/ui/IndicatorsTable.tsx');
    const appSource = readSource('App.tsx');

    expect(source).toContain("if (status === 'En revisión') return 'Revisar'");
    expect(source).not.toContain("return 'Revisar / Editar'");
    expect(source).toContain("indicator.captureId ? 'Continuar captura' : 'Nueva captura'");
    expect(appSource).toContain("const responsibleHasNoCapture = user?.role === 'responsable' && !effectiveCaptureId;");
    expect(appSource).toContain('Sin registros capturados. Cuando un plantel envíe información, aparecerá en En revisión.');
  });

  it('shows the responsible observation when a plantel must correct a capture', () => {
    const source = readSource('components/forms/IndicatorForm.tsx');
    const appSource = readSource('App.tsx');

    expect(source).toContain("captureStatus === 'correccion_solicitada'");
    expect(source).toContain('correctionObservation.trim()');
    expect(appSource).toContain('correctionObservation={captureDraft.capture?.observacion ?? undefined}');
  });

  it('keeps review actions readable and separates the approval warning from the button row', () => {
    const source = readSource('components/forms/IndicatorForm.tsx');

    expect(source).toContain('flex w-full shrink-0 flex-col gap-3 sm:flex-row sm:flex-wrap');
    expect(source).toContain('w-full whitespace-nowrap px-5 py-2 text-sm sm:w-auto');
    expect(source).toContain('canReviewCurrentCapture && !canApprove && approveDisabledReason');
    expect(source).not.toContain('basis-full rounded-md border border-brand-Status_rojo');
    expect(source).not.toContain('flex justify-end gap-4 mt-6');
  });

  it('does not silently replace an explicit inaccessible capture with another draft', () => {
    const hookSource = readSource('hooks/useCaptureDraft.ts');
    const appSource = readSource('App.tsx');

    expect(hookSource).toContain('strictRequestedCaptureId = false');
    expect(hookSource).toContain('&& !strictRequestedCaptureId');
    expect(hookSource).toContain('hasStrictLookupError');
    expect(appSource).toContain('strictRequestedCaptureId: Boolean(requestedCaptureId)');
    expect(appSource).toContain('Captura no disponible');
  });
});

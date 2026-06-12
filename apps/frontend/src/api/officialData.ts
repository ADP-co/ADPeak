import { apiJson } from './client';
import {
  officialDataSummary,
  officialEvidenceGroups,
  officialWorkbookSummaries,
  type OfficialDataSummary,
  type OfficialEvidenceGroup,
  type OfficialWorkbookSummary,
} from '../catalog/officialData.generated';

export type OfficialSourcesPayload = {
  summary: OfficialDataSummary;
  evidenceGroups: OfficialEvidenceGroup[];
  workbookSummaries: OfficialWorkbookSummary[];
  scope?: {
    plantel: string;
    visibleForRole: string;
  };
};

export const fallbackOfficialSources: OfficialSourcesPayload = {
  summary: officialDataSummary,
  evidenceGroups: officialEvidenceGroups,
  workbookSummaries: officialWorkbookSummaries,
};

export async function fetchOfficialSources() {
  try {
    return await apiJson<OfficialSourcesPayload>('/fuentes-oficiales');
  } catch {
    return fallbackOfficialSources;
  }
}

export type FieldType = 'text' | 'number' | 'calculated' | 'readonly';

export type CalculationConfig =
  | { type: 'sum'; sourceKeys: string[] }
  | {
      type: 'percentage';
      numeratorKey: string;
      denominatorKey: string;
      decimals?: number;
    };

export interface ColumnConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  calculation?: CalculationConfig;
}

export interface GroupConfig {
  label: string;
  colspan: number;
}

export interface HeaderCellConfig {
  label: string;
  colspan?: number;
  rowspan?: number;
}

export interface TemplateInfoBlock {
  label?: string;
  text: string;
  tone?: 'default' | 'highlight';
}

export interface IndicatorTemplate {
  indicatorCode: string;
  indicatorName: string;
  groups: GroupConfig[];
  columns: ColumnConfig[];
  headerRows?: HeaderCellConfig[][];
  infoBlocks?: TemplateInfoBlock[];
  footerNote?: string;
  showTotals?: boolean;
  allowAddRows?: boolean;
  addRowLabel?: string;
  emptyRow?: Record<string, unknown>;
  analysisHeading?: string;
  analysisLabel?: string;
  analysisPlaceholder?: string;
}

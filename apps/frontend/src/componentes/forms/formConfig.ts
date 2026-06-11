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

export interface IndicatorTemplate {
  indicatorCode: string;
  indicatorName: string;
  groups: GroupConfig[];
  columns: ColumnConfig[];
}

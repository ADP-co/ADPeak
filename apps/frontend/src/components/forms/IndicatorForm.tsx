import { useEffect, useMemo, useRef } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import type { ColumnConfig, IndicatorTemplate } from './formConfig';
import { evaluateFormula } from './formula';

interface IndicatorFormProps {
  template: IndicatorTemplate;
  initialData: Record<string, unknown>[];
  initialJustificacion?: string;
  existingEvidenceName?: string;
  canReview?: boolean;
  canSaveReviewEdits?: boolean;
  canModifyRows?: boolean;
  captureStatus?: string;
  isReadOnly?: boolean;
  onBack?: () => void;
  onSaveDraft: (data: FormSubmission) => void;
  onSendReview: (data: FormSubmission) => void;
  onApprove?: () => void;
  onRequestCorrection?: (observacion: string) => void;
  isBusy?: boolean;
  statusMessage?: string;
  errorMessage?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB en bytes
const ACCEPTED_FILE_TYPES = ['application/pdf'];

export type FormSubmission = {
  rows: Record<string, unknown>[];
  justificacion?: string;
  evidencia?: FileList;
};

const parseNumberInput = (value: unknown) => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();

    if (trimmedValue === '') {
      return undefined;
    }

    const numericValue = Number(trimmedValue);
    return Number.isFinite(numericValue) ? numericValue : value;
  }

  return value;
};

const createNumberSchema = (required = false) =>
  z
    .preprocess(parseNumberInput, z.any())
    .superRefine((value, ctx) => {
      if (value === undefined) {
        if (required) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Campo requerido' });
        }
        return;
      }

      if (typeof value !== 'number' || !Number.isFinite(value)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Debe ser un número' });
        return;
      }

      if (value < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'No puede ser negativo' });
      }
    })
    .transform((value) => (typeof value === 'number' ? value : undefined));

type ResolvedNumberValidation = {
  min?: number;
  max?: number;
  integer?: boolean;
};

const parseNumberDraft = (value: unknown) => {
  const parsedValue = parseNumberInput(value);
  return typeof parsedValue === 'number' && Number.isFinite(parsedValue) ? parsedValue : undefined;
};

const numericValidationForColumn = (column: ColumnConfig): ResolvedNumberValidation => {
  const normalized = normalizeReferenceKey(`${column.label} ${column.key}`);
  const isPercentageLike =
    normalized.includes('porcentaje') ||
    normalized.includes('tasa') ||
    normalized.includes('cumplimiento') ||
    normalized.includes('titulacion') ||
    column.label.includes('%');

  return {
    min: column.validation?.min ?? 0,
    max: column.validation?.max ?? (isPercentageLike ? 100 : undefined),
    integer: column.validation?.integer ?? true,
  };
};

const createStrictNumberSchema = (column: ColumnConfig) => {
  const validation = numericValidationForColumn(column);

  return z
    .preprocess(parseNumberInput, z.any())
    .superRefine((value, ctx) => {
      if (value === undefined) {
        if (column.required) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Campo requerido' });
        }
        return;
      }

      if (typeof value !== 'number' || !Number.isFinite(value)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Debe ser un número' });
        return;
      }

      if (validation.min !== undefined && value < validation.min) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: validation.min === 0 ? 'No puede ser negativo' : `Debe ser mayor o igual a ${validation.min}`,
        });
      }

      if (validation.max !== undefined && value > validation.max) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Debe ser menor o igual a ${validation.max}` });
      }

      if (validation.integer && !Number.isInteger(value)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Debe ser un número entero' });
      }
    })
    .transform((value) => (typeof value === 'number' ? value : undefined));
};

const createTextSchema = (required = false) => {
  if (required) {
    return z.preprocess(
      (value) => (value === null || value === undefined ? '' : String(value)),
      z.string().trim().min(1, 'Campo requerido')
    );
  }

  return z.preprocess((value) => {
    if (value === null || value === undefined) {
      return undefined;
    }

    const trimmedValue = String(value).trim();
    return trimmedValue === '' ? undefined : trimmedValue;
  }, z.string().optional());
};

const createDynamicSchema = (columns: ColumnConfig[]) => {
  const schemaShape: Record<string, z.ZodTypeAny> = {};

  columns.forEach((column) => {
    if (column.type === 'number') {
      schemaShape[column.key] = createStrictNumberSchema(column);
      return;
    }

    if (column.type === 'text') {
      schemaShape[column.key] = createTextSchema(column.required);
      return;
    }

    schemaShape[column.key] = z.any().optional();
  });

  return z.object({
    rows: z.array(z.object(schemaShape)),
    justificacion: z.string().optional(),
    evidencia: z
      .any()
      .optional()
      .superRefine((files, ctx) => {
        // Si no hay archivo cargado, está bien (es opcional)
        if (!files || files.length === 0) return;

        const file = files[0] as File;

        if (file.size > MAX_FILE_SIZE) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'El archivo no debe pesar más de 5MB',
          });
        }

        if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'El archivo debe ser un documento PDF',
          });
        }
      }),
  });
};

const toNumber = (value: unknown) => {
  const parsedValue = parseNumberInput(value);
  return typeof parsedValue === 'number' && Number.isFinite(parsedValue) ? parsedValue : 0;
};

const normalizeNumberInputValue = (value: string, validation: ResolvedNumberValidation) => {
  const cleanedValue = value.replace(/[eE+]/g, '');

  if (!cleanedValue.trim()) {
    return '';
  }

  const parsedValue = Number(cleanedValue);

  if (!Number.isFinite(parsedValue) || parsedValue < (validation.min ?? 0)) {
    return '';
  }

  if (validation.integer && !Number.isInteger(parsedValue)) {
    return '';
  }

  if (validation.max !== undefined && parsedValue > validation.max) {
    return String(validation.max);
  }

  return cleanedValue;
};

const normalizeReferenceKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_]+/gu, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

const valueForCalculationKey = (row: Record<string, unknown>, key: string, columns: ColumnConfig[]) => {
  if (Object.prototype.hasOwnProperty.call(row, key)) {
    return row[key];
  }

  const normalizedKey = normalizeReferenceKey(key);
  const matchingColumn = columns.find(
    (column) =>
      normalizeReferenceKey(column.key) === normalizedKey ||
      normalizeReferenceKey(column.label) === normalizedKey
  );

  return matchingColumn ? row[matchingColumn.key] : undefined;
};

const formatCalculatedValue = (value: number) => {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

const calculateColumnValue = (row: Record<string, unknown>, column: ColumnConfig, columns: ColumnConfig[]) => {
  if (!column.calculation) {
    return 0;
  }

  if (column.calculation.type === 'sum') {
    return column.calculation.sourceKeys.reduce(
      (total, sourceKey) => total + toNumber(valueForCalculationKey(row, sourceKey, columns)),
      0
    );
  }

  if (column.calculation.type === 'formula') {
    const value = evaluateFormula(column.calculation.expression, row, columns);
    const decimals = column.calculation.decimals ?? 2;
    return Number(value.toFixed(decimals));
  }

  const numerator = toNumber(valueForCalculationKey(row, column.calculation.numeratorKey, columns));
  const denominator = toNumber(valueForCalculationKey(row, column.calculation.denominatorKey, columns));

  if (denominator === 0) {
    return 0;
  }

  const percentage = (numerator / denominator) * 100;
  const decimals = column.calculation.decimals ?? 2;
  return Number(percentage.toFixed(decimals));
};

const enrichRowWithCalculatedValues = (row: Record<string, unknown>, columns: ColumnConfig[]) => {
  const enrichedRow = { ...row };
  const calculatedColumns = columns.filter((column) => column.type === 'calculated');

  for (let pass = 0; pass < Math.max(1, calculatedColumns.length); pass += 1) {
    let changed = false;

    calculatedColumns.forEach((column) => {
      const nextValue = calculateColumnValue(enrichedRow, column, columns);
      const previousValue = toNumber(enrichedRow[column.key]);

      enrichedRow[column.key] = nextValue;

      if (Math.abs(previousValue - nextValue) > 0.0001) {
        changed = true;
      }
    });

    if (!changed) {
      break;
    }
  }

  return enrichedRow;
};

const hasMeaningfulValue = (value: unknown) => value !== undefined && value !== null && String(value).trim() !== '';

const sanitizeRowForTemplate = (row: Record<string, unknown>, columns: ColumnConfig[]) => {
  const sanitizedRow: Record<string, unknown> = {};

  columns.forEach((column) => {
    if (column.type === 'calculated') {
      return;
    }

    if (column.type === 'number') {
      const validation = numericValidationForColumn(column);
      const numericValue = parseNumberDraft(row[column.key]);

      sanitizedRow[column.key] = numericValue === undefined || numericValue < (validation.min ?? 0)
        ? ''
        : numericValue;
      return;
    }

    sanitizedRow[column.key] = row[column.key] ?? '';
  });

  return enrichRowWithCalculatedValues(sanitizedRow, columns);
};

const totalForColumn = (rows: Record<string, unknown>[] | undefined, column: ColumnConfig, columns: ColumnConfig[]) => {
  if (column.type !== 'number' && column.type !== 'calculated') {
    return '';
  }

  const enrichedRows = (rows ?? []).map((row) => enrichRowWithCalculatedValues(row, columns));

  if (column.calculation?.type === 'percentage') {
    const calculation = column.calculation;
    const numerator = enrichedRows.reduce(
      (sum, row) => sum + toNumber(valueForCalculationKey(row, calculation.numeratorKey, columns)),
      0
    );
    const denominator = enrichedRows.reduce(
      (sum, row) => sum + toNumber(valueForCalculationKey(row, calculation.denominatorKey, columns)),
      0
    );

    if (denominator === 0) {
      return '0';
    }

    return formatCalculatedValue((numerator / denominator) * 100);
  }

  const total = enrichedRows.reduce((sum, row) => sum + toNumber(row[column.key]), 0);

  return formatCalculatedValue(total);
};

function hasTouchedFields(value: unknown): boolean {
  if (value === true) {
    return true;
  }

  if (!value || typeof value !== 'object') {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some(hasTouchedFields);
  }

  return Object.values(value).some(hasTouchedFields);
}

export const IndicatorForm = ({
  template,
  initialData,
  initialJustificacion,
  existingEvidenceName,
  canReview = false,
  canSaveReviewEdits = false,
  canModifyRows = true,
  captureStatus,
  isReadOnly = false,
  onSaveDraft,
  onSendReview,
  onApprove,
  onRequestCorrection,
  isBusy = false,
  statusMessage,
  errorMessage,
  onBack,
}: IndicatorFormProps) => {
  // Memoizar el esquema para evitar re-cálculos en cada renderizado (optimización)
  const dynamicSchema = useMemo(() => createDynamicSchema(template.columns), [template.columns]);
  type FormData = z.infer<typeof dynamicSchema>;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isValid, touchedFields },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(dynamicSchema),
    defaultValues: { rows: initialData, justificacion: initialJustificacion ?? '' },
    // Ejecutar validación en tiempo real mientras el usuario escribe
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'rows',
  });

  const watchedRows = useWatch({ control, name: 'rows' });
  const watchedEvidencia = useWatch({ control, name: 'evidencia' }) as FileList | undefined;
  const evidenciaInputId = `evidencia-${template.indicatorCode.replace(/[^a-zA-Z0-9]+/g, '-')}`;
  const justificacionInputId = `justificacion-${template.indicatorCode.replace(/[^a-zA-Z0-9]+/g, '-')}`;
  const initialDataSignature = useMemo(
    () => JSON.stringify({ rows: initialData, justificacion: initialJustificacion ?? '' }),
    [initialData, initialJustificacion]
  );
  const lastAppliedInitialDataSignature = useRef<string | undefined>(undefined);
  const hasUserTouchedFields = hasTouchedFields(touchedFields);

  useEffect(() => {
    if (lastAppliedInitialDataSignature.current === initialDataSignature || hasUserTouchedFields) {
      return;
    }

    reset({ rows: initialData, justificacion: initialJustificacion ?? '' });
    lastAppliedInitialDataSignature.current = initialDataSignature;
  }, [hasUserTouchedFields, initialData, initialDataSignature, initialJustificacion, reset]);

  const toSubmission = (data: FormData): FormSubmission => ({
    rows: data.rows.map((row) => sanitizeRowForTemplate(row as Record<string, unknown>, template.columns)),
    justificacion: data.justificacion,
    evidencia: data.evidencia,
  });

  const createEmptyRow = () => {
    const currentRows = (watchedRows ?? []) as Record<string, unknown>[];
    const source =
      [...currentRows].reverse().find((row) =>
        template.columns.some((column) => column.type === 'readonly' && hasMeaningfulValue(row?.[column.key]))
      ) ??
      initialData[fields.length] ??
      initialData.find((row) =>
        template.columns.some((column) => column.type === 'readonly' && hasMeaningfulValue(row?.[column.key]))
      ) ??
      template.emptyRow ??
      {};
    const row: Record<string, unknown> = {};

    template.columns.forEach((column) => {
      if (column.type === 'calculated') {
        return;
      }

      if (column.type === 'readonly') {
        const sourceValue = source[column.key];
        const emptyRowValue = template.emptyRow?.[column.key];
        row[column.key] = hasMeaningfulValue(sourceValue) ? sourceValue : emptyRowValue ?? '';
        return;
      }

      row[column.key] = '';
    });

    return row;
  };

  const handleSaveDraft = handleSubmit((data) => onSaveDraft(toSubmission(data)));
  const handleValidSubmit = (data: FormData) => onSendReview(toSubmission(data));
  const persistedEvidenceLabel = watchedEvidencia && watchedEvidencia.length > 0
    ? watchedEvidencia[0].name
    : existingEvidenceName;
  const canReviewCurrentCapture = canReview && captureStatus === 'en_revision';
  const handleRequestCorrection = () => {
    const observacion = window.prompt('Observación para el plantel');

    if (observacion?.trim() && observacion.trim().length >= 10) {
      onRequestCorrection?.(observacion.trim());
      return;
    }

    window.alert('Agrega una observación de al menos 10 caracteres.');
  };

  return (
    <form
      onSubmit={handleSubmit(handleValidSubmit)}
      className="w-full max-w-[1250px] mx-auto bg-brand-Blanco rounded-lg shadow-md border border-brand-Gris_bajo/20 p-6"
    >
      {/* Cabecera */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <span className="text-sm font-accent text-brand-Gris_oscuro/60 font-bold tracking-wider">
            {template.indicatorCode}
          </span>
          <h1 className="font-title text-2xl font-bold text-brand-Gris_oscuro mt-1">
            {template.indicatorName}
          </h1>
        </div>
        {false ? (
          <>
            <Button
              type="button"
              variant="secondary"
              className="text-xs py-1.5 px-4"
              disabled={isBusy}
              onClick={handleRequestCorrection}
            >
              Solicitar corrección
            </Button>
            <Button
              type="button"
              variant="primary"
              className="text-xs py-1.5 px-4"
              disabled={isBusy}
              onClick={onApprove}
            >
              Aprobar indicador
            </Button>
          </>
        ) : (
          <>
        <Button
          type="button"
          variant="secondary"
          onClick={() => onBack && onBack()}
          className="flex items-center gap-2 text-xs py-1.5 px-4 border-transparent"
        >
          <ArrowLeft size={18} strokeWidth={2.5} />
          Volver
        </Button>
          </>
        )}
      </div>

      <div className="w-full overflow-x-auto border border-brand-Gris_bajo/40 rounded-lg">
        {template.infoBlocks && template.infoBlocks.length > 0 && (
          <div className="min-w-[980px] border-b border-brand-Gris_bajo/30 text-left">
            {template.infoBlocks.map((block, index) => (
              <p
                key={`${block.label ?? 'info'}-${index}`}
                className={`px-3 py-1.5 text-sm leading-snug ${
                  block.tone === 'highlight'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'bg-brand-Blanco text-brand-Gris_oscuro'
                }`}
              >
                {block.label && <span className="font-bold">{block.label}{block.text ? ': ' : ''}</span>}
                {block.text}
              </p>
            ))}
          </div>
        )}
        <table className="w-full min-w-[980px] border-collapse text-center text-sm font-body">
          <thead className="bg-brand-Verde_oscuro text-brand-Blanco">
            {template.headerRows && template.headerRows.length > 0 ? (
              template.headerRows.map((row, rowIndex) => (
                <tr key={`header-row-${rowIndex}`} className={rowIndex === 0 ? undefined : 'bg-brand-Verde_principal/90'}>
                  {row.map((cell, cellIndex) => (
                    <th
                      key={`${cell.label}-${rowIndex}-${cellIndex}`}
                      colSpan={cell.colspan ?? 1}
                      rowSpan={cell.rowspan ?? 1}
                      className="border border-brand-Blanco/20 py-2 px-2 text-xs font-semibold whitespace-pre-line"
                    >
                      {cell.label}
                    </th>
                  ))}
                </tr>
              ))
            ) : (
              <>
                {template.groups.length > 0 && (
                  <tr>
                    {template.groups.map((group) => (
                      <th
                        key={group.label}
                        colSpan={group.colspan}
                        className="border border-brand-Blanco/20 py-2 px-4 font-bold"
                      >
                        {group.label}
                      </th>
                    ))}
                  </tr>
                )}
                <tr className="bg-brand-Verde_principal/90">
                  {template.columns.map((column) => (
                    <th
                      key={column.key}
                      className="border border-brand-Blanco/20 py-2 px-2 text-xs font-semibold"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </>
            )}
          </thead>

          <tbody>
            {fields.map((field, rowIndex) => {
              const watchedRow = (watchedRows?.[rowIndex] ?? field) as Record<string, unknown>;
              const displayRow = enrichRowWithCalculatedValues(watchedRow, template.columns);
              const rowErrors = errors.rows?.[rowIndex] as
                | Record<string, { message?: string }>
                | undefined;

              return (
                <tr key={field.id} className="hover:bg-brand-Gris_bajo/10">
                  {template.columns.map((column) => {
                    const error = rowErrors?.[column.key]?.message;
                    const fieldName = `rows.${rowIndex}.${column.key}` as const;
                    const fieldRegistration = register(fieldName);
                    const numberValidation = column.type === 'number' ? numericValidationForColumn(column) : undefined;

                    return (
                      <td key={column.key} className="border border-brand-Gris_bajo/20 p-2 align-middle">
                        {column.type === 'readonly' && (
                          <span className="text-brand-Gris_oscuro font-medium">
                            {String(displayRow[column.key] ?? '')}
                          </span>
                        )}

                        {column.type === 'number' && (
                          <Input
                            type="number"
                            min={0}
                            max={numberValidation?.max}
                            step={numberValidation?.integer ? '1' : 'any'}
                            inputMode={numberValidation?.integer ? 'numeric' : 'decimal'}
                            className="w-full min-w-[80px] text-center !p-1 h-8"
                            label=""
                            aria-label={`${column.label}, fila ${rowIndex + 1}`}
                            disabled={isReadOnly}
                            {...fieldRegistration}
                            onKeyDown={(event) => {
                              if (['-', '+', 'e', 'E'].includes(event.key)) {
                                event.preventDefault();
                              }
                            }}
                            onChange={(event) => {
                              const nextValue = normalizeNumberInputValue(
                                event.currentTarget.value,
                                numberValidation ?? { min: 0, integer: true }
                              );

                              event.currentTarget.value = nextValue;

                              void fieldRegistration.onChange(event);
                            }}
                            error={error}
                          />
                        )}

                        {column.type === 'text' && (
                          <Input
                            type="text"
                            className="w-full min-w-[160px] !p-1 h-8"
                            label=""
                            aria-label={`${column.label}, fila ${rowIndex + 1}`}
                            disabled={isReadOnly}
                            {...fieldRegistration}
                            error={error}
                          />
                        )}

                        {column.type === 'calculated' && (
                          <span className="text-brand-Verde_oscuro font-bold bg-brand-Verde_principal/10 px-2 py-1 rounded">
                            {formatCalculatedValue(toNumber(displayRow[column.key]))}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          {template.showTotals && (
            <tfoot>
              <tr className="bg-brand-Gris_bajo/25 font-bold text-brand-Gris_oscuro">
                {template.columns.map((column, index) => (
                  <td key={`total-${column.key}`} className="border border-brand-Gris_bajo/30 p-2">
                    {index === 0 ? 'TOTALES' : totalForColumn(watchedRows as Record<string, unknown>[] | undefined, column, template.columns)}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
        {template.allowAddRows && canModifyRows && (
          <div className="min-w-[980px] flex flex-wrap justify-end gap-3 border-t border-brand-Gris_bajo/30 bg-brand-Blanco px-3 py-3">
            {fields.length > 1 && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => remove(fields.length - 1)}
                disabled={isReadOnly || isBusy}
                className="flex items-center gap-2 text-xs py-1.5 px-4"
              >
                <Trash2 size={15} />
                Quitar última fila
              </Button>
            )}
            <Button
              type="button"
              onClick={() => append(createEmptyRow() as FormData['rows'][number])}
              disabled={isReadOnly || isBusy}
              className="flex items-center gap-2 text-xs py-1.5 px-4"
            >
              <Plus size={15} />
              {template.addRowLabel ?? 'Agregar fila'}
            </Button>
          </div>
        )}
        {template.footerNote && (
          <p className="min-w-[980px] border-t border-brand-Gris_bajo/30 px-3 py-2 text-left text-sm leading-snug text-blue-700 bg-brand-Blanco">
            {template.footerNote}
          </p>
        )}
      </div>

      {/* Apartado de Justificación y Evidencia */}
      <div className="mt-8 bg-brand-Gris_bajo/5 p-6 rounded-lg border border-brand-Gris_bajo/20">
        <h3 className="font-title text-lg font-bold text-brand-Gris_oscuro mb-4">
          {template.analysisHeading ?? 'Justificación y Evidencia'}
        </h3>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <label htmlFor={justificacionInputId} className="block text-sm font-bold font-accent text-brand-Gris_oscuro mb-2">
              {template.analysisLabel ?? 'Justificación'}
            </label>
            <textarea
              id={justificacionInputId}
              className="w-full border border-brand-Gris_bajo/40 p-3 rounded-md font-body text-sm outline-none focus:border-brand-Verde_principal focus:ring-1 focus:ring-brand-Verde_principal min-h-[100px] resize-y"
              placeholder={template.analysisPlaceholder ?? 'Ingrese la justificación correspondiente...'}
              disabled={isReadOnly}
              {...register('justificacion')}
            ></textarea>
          </div>
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-bold font-accent text-brand-Gris_oscuro mb-2">
              Evidencia (PDF)
            </label>
            <div className="flex items-center w-full h-[46px] border border-brand-Gris_bajo/40 rounded-md bg-brand-Blanco overflow-hidden focus-within:border-brand-Verde_principal focus-within:ring-1 focus-within:ring-brand-Verde_principal">
              <label
                htmlFor={evidenciaInputId}
                className="flex items-center justify-center h-full cursor-pointer bg-brand-Verde_principal text-brand-Blanco px-4 text-sm font-bold hover:bg-brand-Verde_oscuro transition-colors whitespace-nowrap"
              >
                Buscar Archivo
                <input
                  id={evidenciaInputId}
                  type="file"
                  accept=".pdf"
                  className="sr-only"
                  aria-label="Seleccionar evidencia en PDF"
                  disabled={isReadOnly}
                  {...register('evidencia')}
                />
              </label>
              <span className="text-sm font-body text-brand-Gris_oscuro truncate px-4" title={persistedEvidenceLabel ?? 'Ningún archivo seleccionado'}>
                {persistedEvidenceLabel ?? 'Ningún archivo seleccionado'}
              </span>
            </div>
            {/* Mostrar error de validación de archivo si existe */}
            {errors.evidencia?.message && (
              <span className="text-[11px] text-brand-Status_rojo font-accent font-bold mt-1.5 block">
                {String(errors.evidencia.message)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 mt-6">
        <div className="flex-1 min-h-8 text-left">
          {statusMessage && (
            <p className="rounded-md border border-brand-Verde_principal/30 bg-brand-Verde_principal/10 px-3 py-2 text-sm font-body font-semibold text-brand-Verde_oscuro" role="status">
              {statusMessage}
            </p>
          )}
          {errorMessage && (
            <p className="rounded-md border border-brand-Status_rojo/30 bg-brand-Status_rojo/10 px-3 py-2 text-sm font-body font-semibold text-brand-Status_rojo" role="alert">
              {errorMessage}
            </p>
          )}
        </div>
        {isReadOnly && !canSaveReviewEdits && !canReviewCurrentCapture ? (
          <p className="rounded-md border border-brand-Gris_bajo/30 bg-brand-Gris_bajo/10 px-3 py-2 text-sm font-body font-semibold text-brand-Gris_oscuro" role="status">
            Consulta en solo lectura.
          </p>
        ) : canSaveReviewEdits || canReviewCurrentCapture ? (
          <>
            {canSaveReviewEdits && (
              <Button
                type="button"
                variant="secondary"
                className="text-xs py-1.5 px-4"
                disabled={isBusy || isReadOnly}
                onClick={() => void handleSaveDraft()}
              >
                Guardar cambios
              </Button>
            )}
            {canReviewCurrentCapture && (
              <>
            <Button
              type="button"
              variant="secondary"
              className="text-xs py-1.5 px-4"
              disabled={isBusy}
              onClick={handleRequestCorrection}
            >
              Solicitar corrección
            </Button>
            <Button
              type="button"
              variant="primary"
              className="text-xs py-1.5 px-4"
              disabled={isBusy}
              onClick={onApprove}
            >
              Aprobar indicador
            </Button>
              </>
            )}
          </>
        ) : (
          <>
        <Button
          type="button"
          variant="secondary"
          className="text-xs py-1.5 px-4"
          disabled={isBusy || isReadOnly}
          onClick={() => void handleSaveDraft()}
        >
          Guardar borrador
        </Button>
        {/* Bloquear el botón de envío si el formulario contiene errores */}
        <Button type="submit" variant="primary" className="text-xs py-1.5 px-4" disabled={!isValid || isBusy || isReadOnly}>
          Enviar a revisión
        </Button>
          </>
        )}
      </div>
    </form>
  );
};

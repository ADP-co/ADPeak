import { useMemo } from 'react';
import { useEffect } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import type { ColumnConfig, IndicatorTemplate } from './formConfig';

interface IndicatorFormProps {
  template: IndicatorTemplate;
  initialData: Record<string, unknown>[];
  onBack?: () => void;
  onSaveDraft: (data: FormSubmission) => void;
  onSendReview: (data: FormSubmission) => void;
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
      schemaShape[column.key] = createNumberSchema(column.required);
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

const formatCalculatedValue = (value: number) => {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

const calculateColumnValue = (row: Record<string, unknown>, column: ColumnConfig) => {
  if (!column.calculation) {
    return 0;
  }

  if (column.calculation.type === 'sum') {
    return column.calculation.sourceKeys.reduce((total, sourceKey) => total + toNumber(row[sourceKey]), 0);
  }

  const numerator = toNumber(row[column.calculation.numeratorKey]);
  const denominator = toNumber(row[column.calculation.denominatorKey]);

  if (denominator === 0) {
    return 0;
  }

  const percentage = (numerator / denominator) * 100;
  const decimals = column.calculation.decimals ?? 2;
  return Number(percentage.toFixed(decimals));
};

const enrichRowWithCalculatedValues = (row: Record<string, unknown>, columns: ColumnConfig[]) => {
  const enrichedRow = { ...row };

  columns.forEach((column) => {
    if (column.type === 'calculated') {
      enrichedRow[column.key] = calculateColumnValue(enrichedRow, column);
    }
  });

  return enrichedRow;
};

export const IndicatorForm = ({
  template,
  initialData,
  onSaveDraft,
  onSendReview,
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
    formState: { errors, isDirty, isValid },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(dynamicSchema),
    defaultValues: { rows: initialData },
    // Ejecutar validación en tiempo real mientras el usuario escribe
    mode: 'onChange',
  });

  const { fields } = useFieldArray({
    control,
    name: 'rows',
  });

  const watchedRows = useWatch({ control, name: 'rows' });
  const watchedEvidencia = useWatch({ control, name: 'evidencia' }) as FileList | undefined;
  const evidenciaInputId = `evidencia-${template.indicatorCode.replace(/[^a-zA-Z0-9]+/g, '-')}`;
  const justificacionInputId = `justificacion-${template.indicatorCode.replace(/[^a-zA-Z0-9]+/g, '-')}`;

  useEffect(() => {
    if (isDirty) {
      return;
    }

    reset({ rows: initialData });
  }, [initialData, isDirty, reset]);

  const toSubmission = (data: FormData): FormSubmission => ({
    rows: data.rows.map((row) =>
      enrichRowWithCalculatedValues(row as Record<string, unknown>, template.columns)
    ),
    justificacion: data.justificacion,
    evidencia: data.evidencia,
  });

  const handleSaveDraft = handleSubmit((data) => onSaveDraft(toSubmission(data)));
  const handleValidSubmit = (data: FormData) => onSendReview(toSubmission(data));

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
        <Button
          type="button"
          variant="secondary"
          onClick={() => onBack && onBack()}
          className="flex items-center gap-2 text-xs py-1.5 px-4 border-transparent"
        >
          <ArrowLeft size={18} strokeWidth={2.5} />
          Volver
        </Button>
      </div>

      <div className="w-full overflow-x-auto border border-brand-Gris_bajo/40 rounded-lg">
        <table className="w-full border-collapse text-center text-sm font-body">
          <thead className="bg-brand-Verde_oscuro text-brand-Blanco">
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
                            className="w-full min-w-[80px] text-center !p-1 h-8"
                            label=""
                            aria-label={`${column.label}, fila ${rowIndex + 1}`}
                            {...register(`rows.${rowIndex}.${column.key}` as const)}
                            error={error}
                          />
                        )}

                        {column.type === 'text' && (
                          <Input
                            type="text"
                            className="w-full min-w-[160px] !p-1 h-8"
                            label=""
                            aria-label={`${column.label}, fila ${rowIndex + 1}`}
                            {...register(`rows.${rowIndex}.${column.key}` as const)}
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
        </table>
      </div>

      {/* Apartado de Justificación y Evidencia */}
      <div className="mt-8 bg-brand-Gris_bajo/5 p-6 rounded-lg border border-brand-Gris_bajo/20">
        <h3 className="font-title text-lg font-bold text-brand-Gris_oscuro mb-4">
          Justificación y Evidencia
        </h3>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <label htmlFor={justificacionInputId} className="block text-sm font-bold font-accent text-brand-Gris_oscuro mb-2">
              Justificación
            </label>
            <textarea
              id={justificacionInputId}
              className="w-full border border-brand-Gris_bajo/40 p-3 rounded-md font-body text-sm outline-none focus:border-brand-Verde_principal focus:ring-1 focus:ring-brand-Verde_principal min-h-[100px] resize-y"
              placeholder="Ingrese la justificación correspondiente..."
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
                  {...register('evidencia')}
                />
              </label>
              <span className="text-sm font-body text-brand-Gris_oscuro truncate px-4" title={watchedEvidencia && watchedEvidencia.length > 0 ? watchedEvidencia[0].name : 'Ningún archivo seleccionado'}>
                {watchedEvidencia && watchedEvidencia.length > 0 ? watchedEvidencia[0].name : 'Ningún archivo seleccionado'}
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
            <p className="text-xs font-body text-brand-Verde_oscuro" role="status">
              {statusMessage}
            </p>
          )}
          {errorMessage && (
            <p className="text-xs font-body text-brand-Status_rojo" role="alert">
              {errorMessage}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          className="text-xs py-1.5 px-4"
          disabled={isBusy}
          onClick={() => void handleSaveDraft()}
        >
          Guardar borrador
        </Button>
        {/* Bloquear el botón de envío si el formulario contiene errores */}
        <Button type="submit" variant="primary" className="text-xs py-1.5 px-4" disabled={!isValid || isBusy}>
          Enviar a revisión
        </Button>
      </div>
    </form>
  );
};

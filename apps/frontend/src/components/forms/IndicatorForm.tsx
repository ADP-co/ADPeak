import { useMemo, useEffect, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import type { ColumnConfig, IndicatorTemplate } from './formConfig';
import { useAuth } from '../../context/AuthContext';

interface IndicatorFormProps {
  template: IndicatorTemplate;
  initialData: Record<string, unknown>[];
  status?: string;
  onBack?: () => void;
  onSaveDraft: (data: FormSubmission) => void;
  onSendReview: (data: FormSubmission) => void;
  onApprove?: () => void;
  onRequestCorrection?: (notes: string) => void;
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
  status,
  onSaveDraft,
  onSendReview,
  isBusy = false,
  statusMessage,
  errorMessage,
  onBack,
  onApprove,
  onRequestCorrection,
}: IndicatorFormProps) => {
  const { user } = useAuth();
  const isReviewMode = user?.role === 'admin' || user?.role === 'responsable';
  
  const [showCorrectionNotes, setShowCorrectionNotes] = useState(false);
  const [correctionNotes, setCorrectionNotes] = useState('');

  // Memoizar el esquema para evitar re-cálculos en cada renderizado (optimización)
  const dynamicSchema = useMemo(() => createDynamicSchema(template.columns), [template.columns]);
  type FormData = z.infer<typeof dynamicSchema>;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isValid },
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

  useEffect(() => {
    reset({ rows: initialData });
  }, [initialData, reset]);

  // Hacer scroll automático al inicio cuando se carga el formulario
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
          <div className="flex items-center gap-3">
            <span className="text-sm font-accent text-brand-Gris_oscuro/60 font-bold tracking-wider">
              {template.indicatorCode}
            </span>
            {isReviewMode && status === 'Aprobado' && (
              <span className="bg-brand-Status_verde text-brand-Gris_oscuro text-[11px] font-bold font-accent px-3 py-1 rounded-full shadow-xs tracking-wide">
                Aprobado
              </span>
            )}
          </div>
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
                            className="w-full min-w-[80px] text-center !p-1 h-8 disabled:opacity-60 disabled:bg-brand-Gris_bajo/10"
                            label=""
                            {...register(`rows.${rowIndex}.${column.key}` as const)}
                            error={error}
                            disabled={isReviewMode}
                          />
                        )}

                        {column.type === 'text' && (
                          <Input
                            type="text"
                            className="w-full min-w-[160px] !p-1 h-8 disabled:opacity-60 disabled:bg-brand-Gris_bajo/10"
                            label=""
                            {...register(`rows.${rowIndex}.${column.key}` as const)}
                            error={error}
                            disabled={isReviewMode}
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
            <label className="block text-sm font-bold font-accent text-brand-Gris_oscuro mb-2">
              Justificación
            </label>
            <textarea
            className="w-full border border-brand-Gris_bajo/40 p-3 rounded-md font-body text-sm outline-none focus:border-brand-Verde_principal focus:ring-1 focus:ring-brand-Verde_principal min-h-[100px] resize-y disabled:opacity-60 disabled:bg-brand-Gris_bajo/10 disabled:cursor-not-allowed"
              placeholder="Ingrese la justificación correspondiente..."
              {...register('justificacion')}
            disabled={isReviewMode}
            ></textarea>
          </div>
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-bold font-accent text-brand-Gris_oscuro mb-2">
              Evidencia (PDF)
            </label>
          <div className={`flex items-center w-full h-[46px] border border-brand-Gris_bajo/40 rounded-md bg-brand-Blanco overflow-hidden focus-within:border-brand-Verde_principal focus-within:ring-1 focus-within:ring-brand-Verde_principal ${isReviewMode ? 'opacity-70 bg-brand-Gris_bajo/10 cursor-not-allowed' : ''}`}>
            <label className={`flex items-center justify-center h-full ${isReviewMode ? 'bg-brand-Gris_oscuro/40 cursor-not-allowed' : 'cursor-pointer bg-brand-Verde_principal hover:bg-brand-Verde_oscuro'} text-brand-Blanco px-4 text-sm font-bold transition-colors whitespace-nowrap`}>
              {isReviewMode ? 'Archivo Adjunto' : 'Buscar Archivo'}
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  {...register('evidencia')}
                disabled={isReviewMode}
                />
              </label>
            <span className="text-sm font-body text-brand-Gris_oscuro truncate px-4" title={watchedEvidencia && watchedEvidencia.length > 0 ? watchedEvidencia[0].name : (isReviewMode ? 'Archivo_Evidencia.pdf' : 'Ningún archivo seleccionado')}>
              {watchedEvidencia && watchedEvidencia.length > 0 ? watchedEvidencia[0].name : (isReviewMode ? 'Archivo_Evidencia.pdf' : 'Ningún archivo seleccionado')}
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

      <div className="w-full mt-6">
        <div className="flex justify-end gap-4">
          <div className="flex-1 min-h-8 text-left flex flex-col justify-center">
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
          
          {isReviewMode && status === 'Aprobado' ? null : isReviewMode ? (
            <>
              <Button
                type="button"
                variant="secondary"
                className="text-xs py-1.5 px-4 !bg-brand-Status_rojo !text-brand-Blanco !border-brand-Status_rojo hover:!bg-brand-Status_rojo/90 focus:ring-brand-Status_rojo"
                disabled={isBusy}
                onClick={() => setShowCorrectionNotes(!showCorrectionNotes)}
              >
                Corregir
              </Button>
              <Button 
                type="button" 
                variant="primary" 
                className="text-xs py-1.5 px-4" 
                disabled={isBusy}
                onClick={() => onApprove && onApprove()}
              >
                Aprobar
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                className="text-xs py-1.5 px-4"
                disabled={isBusy}
                onClick={() => void handleSaveDraft()}
              >
                Guardar borrador
              </Button>
              <Button type="submit" variant="primary" className="text-xs py-1.5 px-4" disabled={!isValid || isBusy}>
                Enviar a revision
              </Button>
            </>
          )}
        </div>

        {/* Sección de Notas para Corrección */}
        {isReviewMode && showCorrectionNotes && status !== 'Aprobado' && (
          <div className="w-full bg-brand-Verde_oscuro/5 p-4 rounded-md border border-brand-Verde_oscuro/20 mt-4 transition-all duration-300 ease-in-out">
            <label className="block text-sm font-bold font-accent text-brand-Verde_oscuro mb-2">
              Notas para la Corrección
            </label>
            <textarea
              className="w-full border border-brand-Verde_oscuro/40 p-3 rounded-md font-body text-sm outline-none focus:border-brand-Verde_oscuro focus:ring-1 focus:ring-brand-Verde_oscuro min-h-[100px] resize-y bg-brand-Blanco"
              placeholder="Escriba las observaciones o motivos de la corrección para el plantel..."
              value={correctionNotes}
              onChange={(e) => setCorrectionNotes(e.target.value)}
            />
            <div className="flex justify-end mt-3">
              <Button
                type="button"
                variant="primary"
                className="!bg-brand-Verde_oscuro hover:!bg-brand-Verde_oscuro/90 text-brand-Blanco border-none text-xs py-1.5 px-4 focus:ring-brand-Verde_oscuro"
                disabled={isBusy || !correctionNotes.trim()}
                onClick={() => onRequestCorrection && onRequestCorrection(correctionNotes)}
              >
                Enviar Corrección
              </Button>
            </div>
          </div>
        )}
      </div>
    </form>
  );
};

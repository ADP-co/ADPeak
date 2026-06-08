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
  onSaveDraft: (data: FormSubmission) => void;
  onSendReview: (data: FormSubmission) => void;
  isBusy?: boolean;
  statusMessage?: string;
  errorMessage?: string;
}

export type FormSubmission = {
  rows: Record<string, unknown>[];
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
}: IndicatorFormProps) => {
  const dynamicSchema = createDynamicSchema(template.columns);
  type FormData = z.infer<typeof dynamicSchema>;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(dynamicSchema),
    defaultValues: { rows: initialData },
  });

  const { fields } = useFieldArray({
    control,
    name: 'rows',
  });

  const watchedRows = useWatch({ control, name: 'rows' });

  useEffect(() => {
    reset({ rows: initialData });
  }, [initialData, reset]);

  const toSubmission = (data: FormData): FormSubmission => ({
    rows: data.rows.map((row) =>
      enrichRowWithCalculatedValues(row as Record<string, unknown>, template.columns)
    ),
  });

  const handleSaveDraft = handleSubmit((data) => onSaveDraft(toSubmission(data)));
  const handleValidSubmit = (data: FormData) => onSendReview(toSubmission(data));

  return (
    <form
      onSubmit={handleSubmit(handleValidSubmit)}
      className="w-full max-w-[1250px] mx-auto bg-brand-Blanco rounded-lg shadow-md border border-brand-Gris_bajo/20 p-6"
    >
      <div className="relative mb-6 flex items-center justify-center">
        <h2 className="font-title text-xl font-bold text-brand-Gris_oscuro text-center px-12">
          Indicador: {template.indicatorCode} {template.indicatorName}
        </h2>

        <button
          type="button"
          onClick={() => console.log('Navegar hacia atrás')}
          className="absolute right-0 p-2 text-brand-Gris_oscuro hover:text-brand-Verde_oscuro hover:bg-brand-Fondo rounded-full transition-colors cursor-pointer"
          title="Regresar a la tabla principal"
        >
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>
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
                            {...register(`rows.${rowIndex}.${column.key}` as const)}
                            error={error}
                          />
                        )}

                        {column.type === 'text' && (
                          <Input
                            type="text"
                            className="w-full min-w-[160px] !p-1 h-8"
                            label=""
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
        <Button type="submit" variant="primary" className="text-xs py-1.5 px-4" disabled={isBusy}>
          Enviar a revision
        </Button>
      </div>
    </form>
  );
};

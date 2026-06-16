import type { ColumnConfig } from './formConfig';

const SUPPORTED_FUNCTIONS = new Set(['SUM', 'SUMA']);

export function evaluateFormula(
  expression: string,
  row: Record<string, unknown>,
  columns: ColumnConfig[]
) {
  const normalizedExpression = expression.trim().replace(/^=/, '');

  if (!normalizedExpression) {
    return 0;
  }

  const expressionWithFunctions = resolveSupportedFunctions(normalizedExpression, row, columns);
  const substitutedExpression = substituteReferences(expressionWithFunctions, row, columns);

  if (!/^[0-9+\-*/().,\s]+$/.test(substitutedExpression)) {
    return 0;
  }

  try {
    const result = Function(`"use strict"; return (${substitutedExpression});`)();
    return typeof result === 'number' && Number.isFinite(result) ? result : 0;
  } catch {
    return 0;
  }
}

export function validateFormulaExpression(
  expression: string,
  columns: ColumnConfig[],
  currentColumnKey?: string
) {
  const availableColumns = columns.filter((column) => column.key !== currentColumnKey);
  const sampleRow = Object.fromEntries(availableColumns.map((column) => [column.key, 1]));
  const normalizedExpression = expression.trim().replace(/^=/, '');

  if (!normalizedExpression) {
    return 'Agrega una formula para calcular este campo.';
  }

  const unresolved = unresolvedReferences(normalizedExpression, availableColumns);

  if (unresolved.length > 0) {
    return `La formula usa campos no configurados: ${unresolved.join(', ')}.`;
  }

  const expressionWithFunctions = resolveSupportedFunctions(normalizedExpression, sampleRow, availableColumns);
  const substitutedExpression = substituteReferences(expressionWithFunctions, sampleRow, availableColumns);

  if (!/^[0-9+\-*/().,\s]+$/.test(substitutedExpression)) {
    return 'La formula solo puede usar numeros, campos, parentesis, +, -, *, / y SUMA().';
  }

  try {
    Function(`"use strict"; return (${substitutedExpression});`)();
  } catch {
    return 'La formula no se puede evaluar. Revisa parentesis y operadores.';
  }

  return '';
}

function resolveSupportedFunctions(
  expression: string,
  row: Record<string, unknown>,
  columns: ColumnConfig[]
) {
  let nextExpression = expression;
  const functionPattern = /\b(SUM|SUMA)\(([^()]*)\)/gi;
  let safetyCounter = 0;

  while (functionPattern.test(nextExpression) && safetyCounter < 20) {
    nextExpression = nextExpression.replace(functionPattern, (_match, functionName: string, args: string) => {
      if (!SUPPORTED_FUNCTIONS.has(functionName.toUpperCase())) {
        return '0';
      }

      const total = splitFunctionArgs(args).reduce(
        (sum, arg) => sum + evaluateFormula(arg, row, columns),
        0
      );

      return String(total);
    });
    functionPattern.lastIndex = 0;
    safetyCounter += 1;
  }

  return nextExpression;
}

function substituteReferences(
  expression: string,
  row: Record<string, unknown>,
  columns: ColumnConfig[]
) {
  let nextExpression = expression.replace(/\[([^\]]+)\]/g, (_match, reference: string) =>
    String(valueForReference(reference, row, columns))
  );

  const references = referenceCandidates(columns).sort((a, b) => b.name.length - a.name.length);

  for (const reference of references) {
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(reference.name)}(?![\\p{L}\\p{N}_])`, 'giu');
    nextExpression = nextExpression.replace(pattern, String(valueForReference(reference.key, row, columns)));
  }

  return nextExpression;
}

function unresolvedReferences(expression: string, columns: ColumnConfig[]) {
  const expressionWithoutFunctions = expression.replace(/\b(SUM|SUMA)\s*\(/gi, '(');
  const expressionWithoutBracketRefs = expressionWithoutFunctions.replace(/\[([^\]]+)\]/g, (_match, reference: string) =>
    hasReference(reference, columns) ? '1' : reference
  );
  const words = expressionWithoutBracketRefs.match(/[\p{L}_][\p{L}\p{N}_ ]*/gu) ?? [];

  return Array.from(
    new Set(
      words
        .map((word) => word.trim())
        .filter(Boolean)
        .filter((word) => !hasReference(word, columns))
    )
  );
}

function valueForReference(reference: string, row: Record<string, unknown>, columns: ColumnConfig[]) {
  const normalizedReference = normalizeReference(reference);
  const column = columns.find(
    (candidate) =>
      normalizeReference(candidate.key) === normalizedReference ||
      normalizeReference(candidate.label) === normalizedReference
  );

  return toNumber(column ? row[column.key] : undefined);
}

function hasReference(reference: string, columns: ColumnConfig[]) {
  const normalizedReference = normalizeReference(reference);
  return columns.some(
    (column) =>
      normalizeReference(column.key) === normalizedReference ||
      normalizeReference(column.label) === normalizedReference
  );
}

function referenceCandidates(columns: ColumnConfig[]) {
  return columns.flatMap((column) => [
    { key: column.key, name: column.key },
    { key: column.key, name: column.label },
  ]);
}

function splitFunctionArgs(args: string) {
  return args
    .split(/[;,]/)
    .map((arg) => arg.trim())
    .filter(Boolean);
}

function toNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const numericValue = Number(value.trim().replace('%', ''));
    return Number.isFinite(numericValue) ? numericValue : 0;
  }

  return 0;
}

function normalizeReference(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_]+/gu, '_')
    .replace(/^_+|_+$/g, '');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

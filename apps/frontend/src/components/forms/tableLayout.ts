import type { ColumnConfig, HeaderCellConfig } from './formConfig';

const DEFAULT_COLUMN_WIDTH = 140;

export const columnWidth = (column: ColumnConfig) => {
  const normalized = `${column.key} ${column.label}`.toLocaleLowerCase('es-MX');

  if (column.type === 'readonly') {
    return normalized.includes('plantel') || normalized.includes('delegaci') ? 150 : 190;
  }

  if (column.type === 'text') {
    return 220;
  }

  if (column.type === 'calculated') {
    return 120;
  }

  return DEFAULT_COLUMN_WIDTH;
};

export const tableMinimumWidth = (columns: ColumnConfig[]) =>
  Math.max(760, columns.reduce((total, column) => total + columnWidth(column), 0));

export const headerLayoutIsValid = (rows: HeaderCellConfig[][], columnCount: number) => {
  if (rows.length === 0 || columnCount <= 0) {
    return false;
  }

  const occupiedUntil = Array.from({ length: columnCount }, () => 0);

  return rows.every((row, rowIndex) => {
    let cursor = 0;
    const covered = new Set(
      occupiedUntil
        .map((until, columnIndex) => (until > rowIndex ? columnIndex : -1))
        .filter((columnIndex) => columnIndex >= 0)
    );

    for (const cell of row) {
      while (cursor < columnCount && covered.has(cursor)) {
        cursor += 1;
      }

      const colspan = Math.max(1, cell.colspan ?? 1);
      const rowspan = Math.max(1, cell.rowspan ?? 1);
      const end = cursor + colspan;

      if (cursor >= columnCount || end > columnCount) {
        return false;
      }

      for (let columnIndex = cursor; columnIndex < end; columnIndex += 1) {
        if (covered.has(columnIndex)) {
          return false;
        }
        covered.add(columnIndex);
        if (rowspan > 1) {
          occupiedUntil[columnIndex] = Math.max(occupiedUntil[columnIndex], rowIndex + rowspan);
        }
      }

      cursor = end;
    }

    return covered.size === columnCount;
  });
};

export const normalizedHeaderRows = (
  rows: HeaderCellConfig[][] | undefined,
  columnCount: number
): HeaderCellConfig[][] => {
  if (!rows?.length) {
    return [];
  }

  const normalized = rows.map((row) => row.map((cell) => ({ ...cell })));
  if (headerLayoutIsValid(normalized, columnCount)) {
    return normalized;
  }

  const repaired = normalized.map((row) =>
    row.map((cell) => {
      if ((cell.colspan ?? 1) > 1 && (cell.rowspan ?? 1) > 1) {
        const { rowspan: _rowspan, ...nextCell } = cell;
        return nextCell;
      }
      return cell;
    })
  );

  return headerLayoutIsValid(repaired, columnCount) ? repaired : [];
};

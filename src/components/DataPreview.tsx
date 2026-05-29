import type { CellValue } from '../types';

interface Props {
  headers: string[];
  rows: CellValue[][];
  label?: string;
}

export function DataPreview({ headers, rows, label = 'Preview (first 5 rows)' }: Props) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-4 overflow-x-auto">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{label}</p>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                title={h}
                className="text-left text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 font-mono min-w-[8rem] max-w-[12rem] truncate"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => {
                const str = cell === null ? '' : String(cell);
                return (
                  <td
                    key={ci}
                    title={str}
                    className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-slate-700 dark:text-slate-300 min-w-[8rem] max-w-[12rem] truncate"
                  >
                    {cell === null
                      ? <span className="text-slate-300 dark:text-slate-600 italic">null</span>
                      : str}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
